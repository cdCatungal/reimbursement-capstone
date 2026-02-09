import passport from "passport";
import { OIDCStrategy } from "passport-azure-ad";
import dotenv from "dotenv";
import { Op } from "sequelize";
import User from "../models/User.js";
import axios from "axios";
import { uploadToCloudinary } from "../config/cloudinary.js";

dotenv.config();

const azureConfig = {
  identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
  clientID: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  redirectUrl: process.env.AZURE_REDIRECT_URL,

  responseType: "code",
  responseMode: "form_post",
  scope: ["openid", "profile", "email", "User.Read"],

  useCookieInsteadOfSession: true,
  cookieEncryptionKeys: [{ key: "12345678901234567890123456789012", iv: "123456789012" }],
  cookieSameSite: "none",
  cookieSecure: false,
  allowHttpForRedirectUrl: true,
  validateIssuer: false,
  passReqToCallback: false,

  loggingLevel: "info",
  loggingNoPII: false,
};

// ✅ Helper function to fetch and compare profile picture hash
async function fetchProfilePictureHash(accessToken) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('https://graph.microsoft.com/v1.0/me/photo/$value', {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // ✅ Create hash of the image data to detect changes
    const crypto = await import('crypto');
    const buffer = Buffer.from(response.data, 'binary');
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    
    console.log("📸 Profile picture hash:", hash);
    
    return {
      buffer: buffer,
      hash: hash
    };
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log("⚠️ Profile picture fetch timeout");
    } else if (error.response?.status === 404) {
      console.log("⚠️ No profile picture available for this user");
    } else {
      console.log("⚠️ Could not fetch profile picture:", error.response?.status, error.message);
    }
    return null;
  }
}

// ✅ Helper function to upload profile picture to Cloudinary
async function uploadProfilePictureToCloudinary(buffer) {
  try {
    console.log("☁️ Uploading profile picture to Cloudinary...");
    const cloudinaryResult = await uploadToCloudinary(buffer, 'reimbursement-profile-pictures', 'image');

    console.log("✅ Profile picture uploaded to Cloudinary:", cloudinaryResult.secure_url);
    
    return {
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id
    };
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error);
    return null;
  }
}

passport.use(
  new OIDCStrategy(azureConfig, async (iss, sub, profile, accessToken, refreshToken, done) => {
    try {
      console.log("🔑 Azure callback fired");
      console.log("👋 Profile received:", {
        displayName: profile.displayName,
        email: profile._json?.email,
        oid: profile.oid,
      });

      const email = profile._json?.email || profile._json?.preferred_username;
      const microsoftId = profile.oid || profile._json?.oid;

      if (!email) return done(new Error("No email in profile"), null);

      // ✅ Fetch profile picture and calculate hash
      const pictureData = await fetchProfilePictureHash(accessToken);

      // ✅ Use transaction to ensure atomic operation
      let user = await User.findOne({
        where: {
          [Op.or]: [{ email }, { microsoftId }],
        },
      });

      if (!user) {
        console.log("➕ Creating new Microsoft user:", email);
        
        // ✅ Upload profile picture for new user
        let profilePictureUrl = null;
        let profilePictureHash = null;
        if (pictureData?.buffer) {
          const uploadResult = await uploadProfilePictureToCloudinary(pictureData.buffer);
          profilePictureUrl = uploadResult?.url || null;
          profilePictureHash = pictureData.hash; // ✅ Store hash on creation
        }

        user = await User.create({
          email,
          name: profile.displayName || email.split("@")[0],
          role: "Employee",
          authProvider: "microsoft",
          microsoftId,
          password: null,
          profilePicture: profilePictureUrl,
          profilePictureHash: profilePictureHash, // ✅ Store hash for future comparison
          isActive: true,
        });
      } else {
        // ✅ Check if account is inactive BEFORE updating
        if (!user.isActive) {
          console.log("❌ User account is inactive:", email);
          return done(new Error("Your account has been deactivated. Please contact your administrator."), null);
        }

        console.log("📝 Updating existing user:", email);
        user.microsoftId = microsoftId;
        user.authProvider = "microsoft";
        
        // ✅ Only upload new profile picture if it has changed
        if (pictureData?.buffer && pictureData?.hash) {
          const currentHash = user.profilePictureHash;
          
          console.log("🔍 Hash comparison - Current:", currentHash, "New:", pictureData.hash);
          
          if (currentHash !== pictureData.hash) {
            console.log("🔄 Profile picture changed, uploading new version");
            const uploadResult = await uploadProfilePictureToCloudinary(pictureData.buffer);
            if (uploadResult?.url) {
              user.profilePicture = uploadResult.url;
              user.profilePictureHash = pictureData.hash; // ✅ Update hash
              console.log("✅ Profile picture updated");
            }
          } else {
            console.log("✓ Profile picture unchanged, skipping upload");
          }
        }
        
        await user.save();
      }

      console.log("✅ User authenticated successfully");
      done(null, user);
    } catch (err) {
      console.error("❌ Azure login error:", err);
      done(err, null);
    }
  })
);

// ✅ Serialize user into the session
passport.serializeUser((user, done) => {
  console.log("🔐 Serializing user ID:", user.id);
  done(null, user.id);
});

// ✅ Deserialize user from the session with error handling
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    if (!user) {
      console.log("⚠️ User not found during deserialization");
      return done(null, false);
    }
    console.log("✅ Deserialized user:", user.email);
    done(null, user);
  } catch (err) {
    console.error("❌ Deserialization error:", err);
    done(err, null);
  }
});

export default passport;