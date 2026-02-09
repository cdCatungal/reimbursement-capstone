/**
 * @swagger
 * tags:
 *   name: SAP Codes
 *   description: SAP code management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SAPCode:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         code:
 *           type: string
 *           example: "SAP001"
 *         description:
 *           type: string
 *           example: "Engineering Department"
 *         is_active:
 *           type: boolean
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 */

import express from "express";
import {
  getAllSapCodes,
  createSapCode,
  updateSapCode,
  deleteSapCode,
  getActiveSapCodes,
} from "../controllers/sapCode.controller.js";

const router = express.Router();

/**
 * @swagger
 * /api/sap-codes/active:
 *   get:
 *     summary: Get only active SAP codes
 *     tags: [SAP Codes]
 *     description: Returns active SAP codes for dropdowns in user management
 *     responses:
 *       200:
 *         description: List of active SAP codes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SAPCode'
 */

// ✅ Get only Active SAP Codes (for dropdowns in Manage Users)
router.get("/active", getActiveSapCodes);

/**
 * @swagger
 * /api/sap-codes:
 *   get:
 *     summary: Get all SAP codes (Admin only)
 *     tags: [SAP Codes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all SAP codes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SAPCode'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (Admin only)
 *   post:
 *     summary: Create new SAP code
 *     tags: [SAP Codes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - description
 *             properties:
 *               code:
 *                 type: string
 *                 example: "SAP001"
 *               description:
 *                 type: string
 *                 example: "Engineering Department"
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: SAP code created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (Admin only)
 */

// ✅ Get ALL SAP Codes (Admin Panel)
router.get("/", getAllSapCodes);

// ✅ Create new SAP code
router.post("/", createSapCode);

/**
 * @swagger
 * /api/sap-codes/{id}:
 *   put:
 *     summary: Update SAP code
 *     tags: [SAP Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: SAP code ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: SAP code updated successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (Admin only)
 *       404:
 *         description: SAP code not found
 *   delete:
 *     summary: Delete SAP code
 *     tags: [SAP Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: SAP code ID
 *     responses:
 *       200:
 *         description: SAP code deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (Admin only)
 *       404:
 *         description: SAP code not found
 */

// ✅ Update SAP code
router.put("/:id", updateSapCode);

// ✅ Delete SAP code
router.delete("/:id", deleteSapCode);

export default router;
