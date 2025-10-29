// src/routes/reportRoutes.js
import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { 
  exportReimbursementReport, 
  getReimbursementSummary 
} from '../controllers/reportController.js';

const router = express.Router();

/**
 * GET /api/reports/export
 * Export reimbursement report (no duplicates)
 * Query params: startDate, endDate, status, category, sapCode, userId, format (json|csv|excel)
 */
router.get('/export', authenticateToken, exportReimbursementReport);

/**
 * GET /api/reports/summary
 * Get dashboard summary statistics
 */
router.get('/summary', authenticateToken, getReimbursementSummary);

export default router;

// Add this to your main app.js or server.js:
// import reportRoutes from './routes/reportRoutes.js';
// app.use('/api/reports', reportRoutes);