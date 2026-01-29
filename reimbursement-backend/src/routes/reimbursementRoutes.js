/**
 * @swagger
 * tags:
 *   name: Reimbursements
 *   description: Reimbursement request management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Reimbursement:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         user_id:
 *           type: integer
 *           example: 1
 *         amount:
 *           type: number
 *           format: float
 *           example: 1500.50
 *         description:
 *           type: string
 *           example: "Business lunch with client"
 *         status:
 *           type: string
 *           enum: [Pending, Manager Approved, Michelle Approved, Approved, Rejected]
 *           example: "Pending"
 *         submitted_at:
 *           type: string
 *           format: date-time
 *           example: "2024-12-15T10:30:00Z"
 *         receipt_url:
 *           type: string
 *           example: "https://storage.example.com/receipts/123.jpg"
 *     MonthlyStats:
 *       type: object
 *       properties:
 *         submitted:
 *           type: integer
 *           example: 10
 *         approved:
 *           type: integer
 *           example: 5
 *         pending:
 *           type: integer
 *           example: 3
 *         rejected:
 *           type: integer
 *           example: 2
 *         total:
 *           type: integer
 *           example: 10
 */

//src/routes/reimbursementRoutes.js
import express from "express";
import {
  createReimbursement,
  getUserReimbursements,
  updateReimbursementStatus,
  getPendingApprovals,
  getPendingAllApprovals,
} from "../controllers/reimbursementController.js";
import { upload } from "../middlewares/upload.js";
import Reimbursement from "../models/Reimbursement.js"; // ← MUST HAVE THIS
import { Op } from "sequelize"; // ← MUST HAVE THIS
import Approval from "../models/Approval.js";
import User from "../models/User.js"; // ✅ ADDED: Import User model

const router = express.Router();

// ⬅️ Middleware to check if user is authenticated via session (Passport)
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Not authenticated" });
};

/**
 * @swagger
 * /api/reimbursements:
 *   post:
 *     summary: Submit a new reimbursement request
 *     tags: [Reimbursements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 1500.50
 *               description:
 *                 type: string
 *                 example: "Business lunch with client"
 *               receipt:
 *                 type: string
 *                 format: binary
 *                 description: Receipt image file
 *     responses:
 *       201:
 *         description: Reimbursement created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reimbursement'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 */

// 📤 Submit a new reimbursement request
router.post(
  "/",
  isAuthenticated,
  upload.single("receipt"),
  createReimbursement,
);

/**
 * @swagger
 * /api/reimbursements/my-reimbursements:
 *   get:
 *     summary: Get current user's reimbursements
 *     tags: [Reimbursements]
 *     security:
 *       - bearerAuth: []
 *     description: Returns all reimbursements for the authenticated user (Status Tracker)
 *     responses:
 *       200:
 *         description: List of user's reimbursements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Reimbursement'
 *       401:
 *         description: Not authenticated
 */

// 📥 Get current user's reimbursements (for Status Tracker)
router.get("/my-reimbursements", isAuthenticated, getUserReimbursements);

/**
 * @swagger
 * /api/reimbursements/monthly-stats:
 *   get:
 *     summary: Get monthly statistics for current user
 *     tags: [Reimbursements]
 *     security:
 *       - bearerAuth: []
 *     description: Returns reimbursement statistics for the current month
 *     responses:
 *       200:
 *         description: Monthly statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MonthlyStats'
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Error fetching statistics
 */

// 📊 Get monthly statistics for current user - NEW ROUTE
router.get("/monthly-stats", isAuthenticated, async (req, res) => {
  try {
    console.log("📊 Monthly stats endpoint hit!");
    console.log("req.user:", req.user);

    const userId = req.user.id || req.user.userId || req.user.user_id;
    const userRole = req.user.role;
    console.log("Looking for reimbursements for userId:", userId);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    console.log("Start of month:", startOfMonth);

    if (userRole === "Employee") {
      const reimbursements = await Reimbursement.findAll({
        where: {
          user_id: userId,
          // submitted_at: {
          //   [Op.gte]: startOfMonth,
          // },
          updated_at: {
            [Op.gte]: startOfMonth,
          },
        },
      });

      console.log("Found reimbursements:", reimbursements.length);

      const stats = {
        submitted: reimbursements.length,
        approved: reimbursements.filter((r) => r.status === "Approved").length,
        pending: reimbursements.filter(
          (r) =>
            r.status === "Pending" ||
            r.status === "Manager Approved" ||
            r.status === "Michelle Approved",
        ).length,
        rejected: reimbursements.filter((r) => r.status === "Rejected").length,
        total: reimbursements.length,
      };

      console.log("Calculated stats:", stats);
      return res.json(stats);
    } else {
      const approval = await Approval.findAll({
        where: {
          approver_id: userId,
          // submitted_at: {
          //   [Op.gte]: startOfMonth,
          // },
        },
      });

      console.log("Found approval:", approval.length);

      const stats = {
        submitted: approval.length,
        approved: approval.filter((r) => r.status === "Approved").length,
        pending: approval.filter(
          (r) =>
            r.status === "Pending" ||
            r.status === "Manager Approved" ||
            r.status === "Michelle Approved",
        ).length,
        rejected: approval.filter((r) => r.status === "Rejected").length,
        total: approval.length,
      };

      console.log("Calculated stats:", stats);
      return res.json(stats);
    }
  } catch (error) {
    console.error("Error fetching monthly stats:", error);
    res.status(500).json({ message: "Error fetching monthly statistics" });
  }
});

/**
 * @swagger
 * /api/reimbursements/pending-approvals:
 *   get:
 *     summary: Get reimbursements pending current user's approval
 *     tags: [Reimbursements]
 *     security:
 *       - bearerAuth: []
 *     description: Returns reimbursements that require approval from the current user (Approval Dashboard)
 *     responses:
 *       200:
 *         description: List of pending approvals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Reimbursement'
 *       401:
 *         description: Not authenticated
 */

// 📋 Get reimbursements pending current user's approval (for Approval Dashboard)
router.get("/pending-approvals", isAuthenticated, getPendingApprovals);

/**
 * @swagger
 * /api/reimbursements/pending-all-approvals:
 *   get:
 *     summary: Get all pending approvals
 *     tags: [Reimbursements]
 *     security:
 *       - bearerAuth: []
 *     description: Returns all reimbursements with pending approval status
 *     responses:
 *       200:
 *         description: List of all pending approvals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Reimbursement'
 *       401:
 *         description: Not authenticated
 */

router.get("/pending-all-approvals", isAuthenticated, getPendingAllApprovals);

/**
 * @swagger
 * /api/reimbursements/batch/{batchCode}:
 *   get:
 *     summary: Get all reimbursements in a specific batch
 *     tags: [Reimbursements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch code to retrieve
 *     responses:
 *       200:
 *         description: List of reimbursements in the batch
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */

// ✅ FIXED: Get all reimbursements in a batch - using proper ES6 imports
router.get("/batch/:batchCode", isAuthenticated, async (req, res) => {
  try {
    const { batchCode } = req.params;

    console.log(`📦 Fetching batch: ${batchCode}`);

    const reimbursements = await Reimbursement.findAll({
      where: { batch_code: batchCode },
      include: [
        {
          model: User, // ✅ Using imported User model
          as: "user",
          attributes: ["id", "name", "email", "role"],
        },
        {
          model: Approval, // ✅ Using imported Approval model
          as: "approvals",
          include: [
            {
              model: User, // ✅ Using imported User model
              as: "approver",
              attributes: ["id", "name", "email", "role"],
            },
          ],
        },
      ],
      order: [["id", "ASC"]],
    });

    console.log(`✅ Found ${reimbursements.length} reimbursements in batch`);

    // Format receipts for response
    const formattedReimbursements = reimbursements.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      category: r.category,
      type: r.type,
      description: r.description,
      items: r.items,
      merchant: r.merchant,
      total: r.total,
      reimbursable_amount: r.reimbursable_amount,
      status: r.status,
      batch_code: r.batch_code,
      date: r.date_of_expense,
      sapCode: r.sap_code,
      submittedAt: r.submitted_at,
      approved_at: r.approved_at,
      number_of_people: r.number_of_people,
      number_of_days: r.number_of_days,
      receipt: r.receipt_url
        ? {
            url: r.receipt_url,
            mimetype: r.receipt_mimetype,
            filename: r.receipt_filename,
          }
        : null,
      user: r.user
        ? {
            id: r.user.id,
            name: r.user.name,
            email: r.user.email,
            role: r.user.role,
          }
        : null,
      approvals: r.approvals || [],
    }));

    res.json(formattedReimbursements);
  } catch (error) {
    console.error("❌ Error fetching batch reimbursements:", error);
    res.status(500).json({
      error: "Failed to fetch batch reimbursements",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/reimbursements/{id}:
 *   put:
 *     summary: Update reimbursement status
 *     tags: [Reimbursements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Reimbursement ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Approved, Rejected, Manager Approved, Michelle Approved]
 *                 example: "Approved"
 *               comments:
 *                 type: string
 *                 example: "Approved - valid expense"
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Reimbursement not found
 */

// 📝 Update reimbursement status (approve/reject)
router.put("/:id", isAuthenticated, updateReimbursementStatus);

export default router;
