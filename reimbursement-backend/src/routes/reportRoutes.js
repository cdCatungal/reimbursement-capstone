/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Reporting and analytics endpoints
 */

// src/routes/reportRoutes.js
import express from "express";
import { authenticateToken } from "../middlewares/auth.js";
import {
  exportReimbursementReport,
  getReimbursementSummary,
} from "../controllers/reportController.js";

const router = express.Router();

/**
 * GET /api/reports/export
 * Export reimbursement report (no duplicates)
 * Query params: startDate, endDate, status, category, sapCode, userId, format (json|csv|excel)
 */

/**
 * @swagger
 * /api/reports/export:
 *   get:
 *     summary: Export reimbursement report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report (YYYY-MM-DD)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Approved, Rejected]
 *         description: Filter by status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: sapCode
 *         schema:
 *           type: string
 *         description: Filter by SAP code
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, excel]
 *           default: json
 *         description: Export format
 *     responses:
 *       200:
 *         description: Report exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Reimbursement'
 *           text/csv:
 *             schema:
 *               type: string
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Not authenticated
 */

router.get("/export", authenticateToken, exportReimbursementReport);

/**
 * GET /api/reports/summary
 * Get dashboard summary statistics
 */
/**
 * @swagger
 * /api/reports/summary:
 *   get:
 *     summary: Get dashboard summary statistics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     description: Returns aggregated statistics for the dashboard
 *     responses:
 *       200:
 *         description: Summary statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalReimbursements:
 *                   type: integer
 *                   example: 150
 *                 totalAmount:
 *                   type: number
 *                   example: 125000.50
 *                 pendingCount:
 *                   type: integer
 *                   example: 25
 *                 approvedCount:
 *                   type: integer
 *                   example: 100
 *                 rejectedCount:
 *                   type: integer
 *                   example: 25
 *                 pendingAmount:
 *                   type: number
 *                   example: 15000.00
 *                 approvedAmount:
 *                   type: number
 *                   example: 100000.50
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */

router.get("/summary", authenticateToken, getReimbursementSummary);

export default router;

// Add this to your main app.js or server.js:
// import reportRoutes from './routes/reportRoutes.js';
// app.use('/api/reports', reportRoutes);
