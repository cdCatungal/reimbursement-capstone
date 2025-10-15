import passport from "passport";
import { OIDCStrategy } from "passport-azure-ad";
import dotenv from "dotenv";
import { Op } from "sequelize"; // ⬅️ Import Op from sequelize
import User from "../models/User.js";

dotenv.config();

const azureConfig = {
  identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
  clientID: process.env.AZURE_CLIENT_ID,
  responseType: "code id_token",
  responseMode: "form_post",
  redirectUrl: process.env.AZURE_REDIRECT_URL,
  allowHttpForRedirectUrl: true,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  validateIssuer: false,
  passReqToCallback: false,
  scope: ["openid", "profile", "email"],
  loggingLevel: "info",
  loggingNoPII: false,
  nonceLifetime: 3600,
  nonceMaxAmount: 10,
  useCookieInsteadOfSession: false,
};

passport.use(
  new OIDCStrategy(
    azureConfig,
    async (iss, sub, profile, accessToken, refreshToken, done) => {
      try {
        console.log("🔍 Azure callback fired");
        console.log("Profile:", profile);

        const email = profile._json?.email || profile._json?.preferred_username;
        const microsoftId = profile.oid || profile._json?.oid;

        console.log("📧 Email:", email);
        console.log("🆔 Microsoft ID:", microsoftId);

        if (!email) {
          console.error("❌ No email found in profile");
          return done(new Error("No email in profile"), null);
        }

        // Try to find user by email or Microsoft ID
        let user = await User.findOne({
          where: {
            [Op.or]: [ // ⬅️ Now using imported Op
              { email },
              { microsoftId }
            ]
          }
        });

        if (!user) {
          console.log("➕ Creating new Microsoft user:", email);
          user = await User.create({
            email,
            name: profile.displayName || profile._json?.name || email.split("@")[0],
            role: "Employee",
            authProvider: "microsoft",
            microsoftId: microsoftId,
            password: null,
          });
        } else {
          console.log("✅ Found existing user:", email);
          // Update Microsoft ID if not set
          if (!user.microsoftId) {
            user.microsoftId = microsoftId;
            user.authProvider = "microsoft";
            await user.save();
          }
        }

        console.log("✅ User authenticated successfully");
        return done(null, user);
      } catch (err) {
        console.error("❌ Azure login error:", err);
        console.error("Error stack:", err.stack);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("📝 Serializing user:", user.id);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    console.log("📖 Deserialized user:", user?.email);
    done(null, user);
  } catch (err) {
    console.error("❌ Deserialize error:", err);
    done(err, null);
  }
});

export default passport;