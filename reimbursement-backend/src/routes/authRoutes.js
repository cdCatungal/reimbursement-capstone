/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Microsoft OAuth authentication endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         email:
 *           type: string
 *           example: "john.doe@company.com"
 *         name:
 *           type: string
 *           example: "John Doe"
 *         role:
 *           type: string
 *           enum: [user, approver, admin]
 *           example: "user"
 *         profilePicture:
 *           type: string
 *           example: "https://example.com/profile.jpg"
 *         sap_code_1:
 *           type: string
 *           example: "SAP001"
 *         sap_code_2:
 *           type: string
 *           example: "SAP002"
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
 *     description: Redirects user to Microsoft login page for authentication
 *     responses:
 *       302:
 *         description: Redirects to Microsoft login page
 *       401:
 *         description: Authentication failed
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
 *   post:
 *     summary: Microsoft OAuth callback endpoint
 *     tags: [Authentication]
 *     description: Handles the callback from Microsoft after successful authentication
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
 *         description: Redirects to frontend with session established
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
    res.redirect(process.env.CLIENT_URL || "http://localhost:3000");
  }
);

/**
 * STEP 3: Failure handler
 */

/**
 * @swagger
 * /auth/failure:
 *   get:
 *     summary: Authentication failure handler
 *     tags: [Authentication]
 *     responses:
 *       401:
 *         description: Microsoft authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Microsoft authentication failed"
 */

router.get("/failure", (req, res) => {
  res
    .status(401)
    .json({ success: false, message: "Microsoft authentication failed" });
});

/**
 * STEP 4: Get current user session
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Authentication]
 *     description: Returns the current user's session information
 *     responses:
 *       200:
 *         description: User is authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 authenticated:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: User is not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 authenticated:
 *                   type: boolean
 *                   example: false
 *                 user:
 *                   type: null
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
 *   get:
 *     summary: Logout user
 *     tags: [Authentication]
 *     description: Logs out the user and redirects to Microsoft logout
 *     responses:
 *       302:
 *         description: Redirects to Microsoft logout page
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
