/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

import express from "express";
import {
  userSettings,
  getAllUsers,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";

const router = express.Router();

/**
 * @swagger
 * /api/users/settings:
 *   get:
 *     summary: Get current user's settings
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 */

// Get current user's settings
router.get("/settings", userSettings);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (Admin only)
 */

// Get all users (Admin only)
router.get("/", getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 example: "john.doe@company.com"
 *               role:
 *                 type: string
 *                 enum: [user, approver, admin]
 *                 example: "approver"
 *               sap_code_1:
 *                 type: string
 *                 example: "SAP001"
 *               sap_code_2:
 *                 type: string
 *                 example: "SAP002"
 *     responses:
 *       200:
 *         description: User updated successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (Admin only)
 *       404:
 *         description: User not found
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (Admin only)
 *       404:
 *         description: User not found
 */

// Update user (Admin only)
router.put("/:id", updateUser);

// Delete user (Admin only)
router.delete("/:id", deleteUser);

export default router;
