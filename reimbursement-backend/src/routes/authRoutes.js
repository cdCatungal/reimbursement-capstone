/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Microsoft OAuth authentication endpoints
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 1
 *             email:
 *               type: string
 *               example: "john@example.com"
 *             name:
 *               type: string
 *               example: "John Doe"
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Authentication failed"
 */

import express from "express";
import passport from "passport";

const router = express.Router();

/**
 * STEP 1: Redirect to Microsoft Login
 */

/**
 * @swagger
 * /auth/microsoft:
 *   get:
 *     summary: Initiate Microsoft OAuth login
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirects to Microsoft login page
 */
router.get(
  "/microsoft",
  (req, res, next) => {
    console.log("\n🚀 ====== MICROSOFT LOGIN INITIATED ======");
    console.log("🔑 Session ID:", req.sessionID);
    console.log("📦 Session:", req.session);
    next();
  },
  passport.authenticate("azuread-openidconnect", {
    failureRedirect: "/auth/failure",
    prompt: "select_account",
  })
);

/**
 * STEP 2: Handle Microsoft redirect (POST)
 */

/**
 * @swagger
 * /auth/microsoft/callback:
 *   get:
 *     summary: Microsoft OAuth callback endpoint
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: OAuth authorization code from Microsoft
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: OAuth state parameter
 *     responses:
 *       302:
 *         description: Redirects to frontend with JWT token
 *       401:
 *         description: Authentication failed
 */
router.post(
  "/microsoft/callback",
  (req, res, next) => {
    console.log("\n📥 ====== CALLBACK RECEIVED ======");
    console.log("🔑 Session ID:", req.sessionID);
    console.log("📦 Session before passport:", req.session);
    next();
  },
  passport.authenticate("azuread-openidconnect", {
    failureRedirect: "/auth/failure",
    failureFlash: true,
  }),
  (req, res) => {
    console.log("\n✅ ====== AUTHENTICATION SUCCESS ======");
    console.log("👤 Authenticated user:", req.user?.email);
    console.log("🆔 User ID:", req.user?.id);
    console.log("📦 Session after login:", req.session);
    res.redirect(process.env.CLIENT_URL);
  }
);

/**
 * STEP 3: Failure handler
 */
router.get("/failure", (req, res) => {
  res
    .status(401)
    .json({ success: false, message: "Microsoft authentication failed" });
});

/**
 * STEP 4: Get current user session
 */
router.get("/me", (req, res) => {
  console.log("\n🔍 ====== AUTH CHECK ======");
  console.log("🔑 Session ID:", req.sessionID);
  console.log("👤 User:", req.user?.email || "None");

  if (req.isAuthenticated() && req.user) {
    res.json({
      success: true,
      authenticated: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        profilePicture: req.user.profilePicture,
        sap_code_1: req.user.sap_code_1,
        sap_code_2: req.user.sap_code_2,
      },
    });
  } else {
    res.status(401).json({ success: false, authenticated: false, user: null });
  }
});

/**
 * STEP 5: Logout
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 */
router.get("/logout", (req, res, next) => {
  console.log("\n👋 ====== LOGOUT INITIATED ======");
  console.log("👤 Logging out user:", req.user?.email || "Unknown");

  const tenantId = process.env.AZURE_TENANT_ID || "common";
  const postLogoutRedirectUri = encodeURIComponent(
    process.env.CLIENT_URL || "http://localhost:3000"
  );

  req.logout((err) => {
    if (err) return next(err);

    req.session.destroy(() => {
      res.clearCookie("connect.sid", { path: "/" });
      const logoutUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${postLogoutRedirectUri}`;
      console.log("🔒 Redirecting to Azure logout");
      res.redirect(logoutUrl);
    });
  });
});

export default router;
