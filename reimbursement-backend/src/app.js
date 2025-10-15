import express from 'express';
import session from 'express-session';
import passport from './config/passport.js';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import sequelize from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import reimbursementRoutes from './routes/reimbursementRoutes.js';
import approvalRoutes from './routes/approvalRoutes.js';

dotenv.config();

const app = express();

// ✅ CORS must come BEFORE session
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);

app.use('/uploads', express.static('uploads'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ FIXED Session config - this is the key change
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'some_secret_key',
    resave: true, // ⬅️ Changed to true (important for passport-azure-ad)
    saveUninitialized: true, // ⬅️ Changed to true
    cookie: {
      secure: false, // false for HTTP, true for HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // ⬅️ Added: 24 hours
    },
  })
);

// ✅ Initialize Passport AFTER session
app.use(passport.initialize());
app.use(passport.session());

// ✅ Routes
app.use('/auth', authRoutes);
app.use('/api/reimbursements', reimbursementRoutes);
app.use('/api/approvals', approvalRoutes);

// ✅ Health check route
app.get('/', (req, res) => {
  res.send('✅ Backend is running and connected to Azure Auth + MySQL');
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// ✅ Sync database and start server
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running at: http://localhost:${PORT}`);
      console.log(`🔑 Microsoft login: http://localhost:${PORT}/auth/microsoft`);
    });
  } catch (err) {
    console.error('❌ Failed to sync DB:', err);
  }
})();