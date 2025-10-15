import express from "express";
import passport from "passport";

const router = express.Router();

/**
 * STEP 1: Redirect to Microsoft Login
 */
router.get(
  "/microsoft",
  (req, res, next) => {
    console.log("🚀 Initiating Microsoft login...");
    next();
  },
  passport.authenticate("azuread-openidconnect", {
    failureRedirect: "/auth/failure",
    // 👇 Force the Microsoft login screen to show up every time
    prompt: "select_account"
  })
);

/**
 * STEP 2: Handle Microsoft redirect (POST)
 */
router.post(
  "/microsoft/callback",
  (req, res, next) => {
    console.log("📥 Received callback from Microsoft (POST)");
    console.log("Body params:", Object.keys(req.body));

    if (req.body.error) {
      console.error("❌ Azure returned error:", req.body.error);
      console.error("Error description:", req.body.error_description);
      return res.redirect("/auth/failure");
    }
    next();
  },
  passport.authenticate("azuread-openidconnect", {
    failureRedirect: "/auth/failure",
    failureMessage: true,
  }),
  (req, res) => {
    console.log("✅ Microsoft login successful:", req.user);
    res.redirect(process.env.CLIENT_URL || "http://localhost:3000");
  }
);

/**
 * STEP 3: Authentication Failure Handler
 */
router.get("/failure", (req, res) => {
  console.error("❌ Authentication failed");
  console.error("Session:", req.session);
  console.error("Flash messages:", req.session?.messages);

  res.status(401).json({
    message: "Microsoft authentication failed",
    details: "Check backend console for error logs",
    sessionData: req.session?.messages || "No error details available",
  });
});

/**
 * STEP 4: Check Current User Session
 */
router.get("/me", (req, res) => {
  console.log("🔍 Checking session, user:", req.user);
  if (req.user) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ user: null });
  }
});

/**
 * STEP 5: Logout Route
 */
router.get("/logout", (req, res, next) => {
  console.log("👋 Logging out user...");

  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return next(err);
    }

    // ✅ Safely destroy session if it exists
    if (req.session) {
      req.session.destroy((err) => {
        if (err) console.error("Session destroy error:", err);
        res.clearCookie("connect.sid", { path: "/" });

        // ✅ Optional: Redirect to Microsoft logout to end SSO session
        const tenantId = process.env.AZURE_AD_TENANT_ID;
        const postLogoutRedirectUri = encodeURIComponent(
          process.env.CLIENT_URL || "http://localhost:3000/login"
        );

        const azureLogoutUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${postLogoutRedirectUri}`;

        console.log("🔒 Redirecting to Azure logout:", azureLogoutUrl);
        res.redirect(azureLogoutUrl);
      });
    } else {
      // No session to destroy, still redirect out
      const tenantId = process.env.AZURE_AD_TENANT_ID;
      const postLogoutRedirectUri = encodeURIComponent(
        process.env.CLIENT_URL || "http://localhost:3000/login"
      );
      const azureLogoutUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${postLogoutRedirectUri}`;

      console.log("⚠️ No session found, redirecting anyway");
      res.redirect(azureLogoutUrl);
    }
  });
});

export default router;
