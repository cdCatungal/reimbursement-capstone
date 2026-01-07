/**
 * @swagger
 * tags:
 *   name: Approvals
 *   description: Reimbursement approval endpoints
 */

//src/routes/approvalRoutes.js
import express from "express";
import { approve, reject } from "../controllers/approvalController.js";
import { verifyToken } from "../middlewares/authMiddleware.js"; // ⬅️ Add this

const router = express.Router();

/**
 * @swagger
 * /api/approvals/{id}/approve:
 *   post:
 *     summary: Approve a reimbursement request
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Reimbursement ID to approve
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *                 example: "Approved - expense looks valid"
 *     responses:
 *       200:
 *         description: Reimbursement approved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: User not authorized to approve
 *       404:
 *         description: Reimbursement not found
 */

router.post("/:id/approve", verifyToken, approve); // ✅ Add auth

/**
 * @swagger
 * /api/approvals/{id}/reject:
 *   post:
 *     summary: Reject a reimbursement request
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Reimbursement ID to reject
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - comments
 *             properties:
 *               comments:
 *                 type: string
 *                 example: "Missing required documentation"
 *     responses:
 *       200:
 *         description: Reimbursement rejected successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: User not authorized to reject
 *       404:
 *         description: Reimbursement not found
 */

router.post("/:id/reject", verifyToken, reject); // ✅ Add auth

export default router;
