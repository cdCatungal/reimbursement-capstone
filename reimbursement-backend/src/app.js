import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import flash from "connect-flash";
import passport from "./config/passport.js";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import sequelize from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import reimbursementRoutes from "./routes/reimbursementRoutes.js";
import approvalRoutes from "./routes/approvalRoutes.js";
import userRoutes from "./routes/user.routes.js";
import ocrRoutes from "./routes/ocrRoutes.js";
import adminRoutes from "./routes/admin.route.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);

// ✅ Cookie parser first
app.use(cookieParser());

// ✅ Session middleware (must come before passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // set true when using HTTPS
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);

// ✅ Enable flash messages for passport errors
app.use(flash());

// ✅ CORS (allow cookies)
const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// ✅ Body parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Initialize Passport (now uses session)
app.use(passport.initialize());
app.use(passport.session());

// ✅ Debug log for /auth routes
app.use((req, res, next) => {
  if (req.path.startsWith("/auth/")) {
    console.log("📍 Request:", req.method, req.path);
    console.log("👤 Authenticated user:", req.user?.email || "None");
  }
  next();
});

// ✅ Routes
app.use("/auth", authRoutes);
app.use("/api/reimbursements", reimbursementRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/users", userRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/api/admin", adminRoutes);

// ✅ Health check
app.get("/", (req, res) => {
  res.json({
    status: "running",
    message: "✅ Backend is running and connected to Azure Auth + MySQL",
  });
});

// ✅ 404 handler
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error("🚨 Server Error:", err.stack);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
(async () => {
  try {
    await sequelize.sync({ alter: false });
    console.log("✅ Database synced successfully");
    app.listen(PORT, () => {
      console.log(`🚀 Server running: http://localhost:${PORT}`);
      console.log(
        `🔑 Microsoft login: http://localhost:${PORT}/auth/microsoft`
      );
    });
  } catch (err) {
    console.error("❌ DB sync error:", err);
    process.exit(1);
  }
})();
