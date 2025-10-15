import passport from "passport";
import { OIDCStrategy } from "passport-azure-ad";
import dotenv from "dotenv";
import { Op } from "sequelize";
import User from "../models/User.js";

dotenv.config();

const azureConfig = {
  identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
  clientID: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  redirectUrl: process.env.AZURE_REDIRECT_URL,

  responseType: "code id_token",
  responseMode: "form_post",
  scope: ["openid", "profile", "email"],

  // ✅ Using express-session (not cookies)
useCookieInsteadOfSession: true,
cookieEncryptionKeys: [
  { key: '12345678901234567890123456789012', iv: '123456789012' }  // 32-byte key, 12-byte IV
],
cookieSameSite: "none",   // allow cross-origin cookie use (frontend :3000 → backend :5000)
cookieSecure: false,      // must be false when testing on http://localhost
allowHttpForRedirectUrl: true,
validateIssuer: false,
passReqToCallback: false,


  loggingLevel: "info",
  loggingNoPII: false,
};

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
        });
      } else if (!user.microsoftId) {
        user.microsoftId = microsoftId;
        user.authProvider = "microsoft";
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
