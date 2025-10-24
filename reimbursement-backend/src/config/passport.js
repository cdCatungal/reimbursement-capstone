import passport from "passport";
import { OIDCStrategy } from "passport-azure-ad";
import dotenv from "dotenv";
import { Op } from "sequelize";
import User from "../models/User.js";
import axios from "axios";

dotenv.config();

const azureConfig = {
  identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
  clientID: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  redirectUrl: process.env.AZURE_REDIRECT_URL,

  responseType: "code",   // 👈 request an access token for Graph
  responseMode: "form_post",
  scope: ["openid", "profile", "email", "User.Read"], // 👈 ensure User.Read is included

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

// ✅ Helper function to fetch profile picture
async function fetchProfilePicture(accessToken) {
  try {
    console.log("📸 Fetching profile picture from Microsoft Graph...");
    const response = await axios.get('https://graph.microsoft.com/v1.0/me/photo/$value', {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer',
    });

    console.log("🖼️ Response content-type:", response.headers['content-type']);
    console.log("🖼️ Response length:", response.data.length);

    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${base64Image}`;

    console.log("✅ Profile picture fetched successfully");
    return dataUrl;
  } catch (error) {
    console.log("⚠️ Could not fetch profile picture:", error.response?.status, error.message);
    return null;
  }
}


passport.use(
  new OIDCStrategy(azureConfig, async (iss, sub, profile, accessToken, refreshToken, done) => {
    try {
      console.log("🔍 Azure callback fired");
      console.log("📋 Profile received:", {
        displayName: profile.displayName,
        email: profile._json?.email,
        oid: profile.oid,
      });

      const email = profile._json?.email || profile._json?.preferred_username;
      const microsoftId = profile.oid || profile._json?.oid;

      if (!email) return done(new Error("No email in profile"), null);

      // ✅ Fetch profile picture using access token
      const profilePicture = await fetchProfilePicture(accessToken);

      let user = await User.findOne({
        where: {
          [Op.or]: [{ email }, { microsoftId }],
        },
      });

      if (!user) {
        console.log("➕ Creating new Microsoft user:", email);
        user = await User.create({
          email,
          name: profile.displayName || email.split("@")[0],
          role: "Employee",
          authProvider: "microsoft",
          microsoftId,
          password: null,
          profilePicture,  // ✅ Store profile picture
        });
      } else {
        console.log("🔄 Updating existing user:", email);
        user.microsoftId = microsoftId;
        user.authProvider = "microsoft";
        user.profilePicture = profilePicture;  // ✅ Update on each login
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
  console.log("📝 Serializing user ID:", user.id);
  done(null, user.id);
});

// ✅ Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    if (!user) return done(null, false);
    console.log("✅ Deserialized user:", user.email);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;