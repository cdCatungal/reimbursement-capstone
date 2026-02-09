/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative endpoints
 */

import express from "express";
import { getReport } from "../controllers/admin.controller.js";

const router = express.Router();

/**
 * @swagger
 * /api/admin/reports:
 *   post:
 *     summary: Generate admin report
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-31"
 *               status:
 *                 type: string
 *                 enum: [Pending, Approved, Rejected]
 *                 example: "Approved"
 *               userId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Report generated successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (Admin only)
 */

router.post("/reports", getReport);

export default router;
