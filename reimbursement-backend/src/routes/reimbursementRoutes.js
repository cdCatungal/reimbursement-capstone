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

const router = express.Router();

// ⬅️ Middleware to check if user is authenticated via session (Passport)
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Not authenticated" });
};

// 📤 Submit a new reimbursement request
router.post(
  "/",
  isAuthenticated,
  upload.single("receipt"),
  createReimbursement
);

// 📥 Get current user's reimbursements (for Status Tracker)
router.get("/my-reimbursements", isAuthenticated, getUserReimbursements);

// 📊 Get monthly statistics for current user - NEW ROUTE
router.get("/monthly-stats", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || req.user.user_id;
    if (!userId) {
      return res.status(400).json({ message: "User ID not found" });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // ✅ Use connection pool with timeout
    const stats = await sequelize.query(
      `
      SELECT 
        COUNT(id) as total,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status IN ('Pending', 'Manager Approved', 'Michelle Approved') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected
      FROM reimbursements 
      WHERE user_id = :userId 
        AND submitted_at >= :startOfMonth
    `,
      {
        replacements: { userId, startOfMonth },
        type: sequelize.QueryTypes.SELECT,
        timeout: 10000, // 10 second timeout
        // ✅ Connection pool settings
        pool: {
          acquireTimeout: 10000,
          evict: 10000, // Remove idle connections
        },
      }
    );

    const result = stats[0] || {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
    };

    const formattedStats = {
      submitted: parseInt(result.total) || 0,
      approved: parseInt(result.approved) || 0,
      pending: parseInt(result.pending) || 0,
      rejected: parseInt(result.rejected) || 0,
      total: parseInt(result.total) || 0,
    };

    // ✅ Cache for frequent stats
    res.set("Cache-Control", "private, max-age=300");
    res.json(formattedStats);
  } catch (error) {
    console.error("Error fetching monthly stats:", error);

    // ✅ Don't crash on database errors
    if (error.name.includes("Sequelize") || error.name.includes("Database")) {
      // Return empty stats instead of error for better UX
      res.json({
        submitted: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        total: 0,
      });
    } else {
      res.status(500).json({ message: "Error fetching monthly statistics" });
    }
  }
});

// 📋 Get reimbursements pending current user's approval (for Approval Dashboard)
router.get("/pending-approvals", isAuthenticated, getPendingApprovals);

router.get("/pending-all-approvals", isAuthenticated, getPendingAllApprovals);

// 📝 Update reimbursement status (approve/reject)
router.put("/:id", isAuthenticated, updateReimbursementStatus);

export default router;
