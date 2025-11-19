//reimbursement-backend/src/app.js
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
import sapCodeRoutes from './routes/sapCode.routes.js';
import { verifyEmailConfig } from "./utils/sendEmail.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);

// ✅ Middleware order is critical for security and functionality
app.use(cookieParser());

// ✅ Session middleware with store (if using production, use RedisStore)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // ✅ Use HTTPS in production
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);

app.use(flash());

// ✅ CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// ✅ Body parsers with size limits to prevent memory issues
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

// ✅ Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// ✅ Request logging middleware
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
app.use('/api/sap-codes', sapCodeRoutes);

// ✅ Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "running",
    message: "✅ Backend is running and connected to Azure Auth + PostgreSQL",
    environment: process.env.NODE_ENV || "development",
  });
});

// ✅ Health check for database connection
app.get("/health/db", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(503).json({ status: "error", database: "disconnected", error: err.message });
  }
});

// ✅ 404 handler (before error handler)
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ✅ Global error handler (must be last)
app.use((err, req, res, next) => {
  console.error("🚨 Server Error:", err);
  
  // ✅ Don't leak sensitive info in production
  const isDevelopment = process.env.NODE_ENV !== "production";
  const errorMessage = isDevelopment ? err.message : "Internal Server Error";
  const errorStack = isDevelopment ? err.stack : undefined;
  
  res.status(err.status || 500).json({
    error: errorMessage,
    ...(errorStack && { stack: errorStack }),
  });
});

// ✅ Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📛 SIGTERM signal received: closing HTTP server');
  try {
    await sequelize.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
});

// ✅ Enhanced server startup
const PORT = process.env.PORT || 5000;
(async () => {
  try {
    // ✅ Step 1: Verify database connection
    console.log('\n📡 Verifying database connection...');
    await sequelize.authenticate();
    console.log("✅ Database authenticated");
    
    // ✅ Step 2: Sync database models
    console.log('🔄 Syncing database models...');
    await sequelize.sync({ alter: false });
    console.log("✅ Database synced successfully");
    
    // ✅ Step 3: Verify email configuration
    console.log('📧 Checking email configuration...');
    await verifyEmailConfig();
    
    // ✅ Step 4: Start server
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running: http://localhost:${PORT}`);
      console.log(`🔑 Microsoft login: http://localhost:${PORT}/auth/microsoft`);
      console.log(`💾 Database: ${process.env.DB_HOST}`);
      console.log(`📧 Email: ${process.env.EMAIL_USER ? '✅ Configured' : '❌ Not configured'}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (err) {
    console.error("❌ Server startup error:", err.message);
    console.error(err);
    process.exit(1);
  }
})();