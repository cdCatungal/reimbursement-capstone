import express from "express";
import { 
  userSettings, 
  getAllUsers, 
  updateUser, 
  deleteUser 
} from "../controllers/user.controller.js";

const router = express.Router();

// Get current user's settings
router.get("/settings", userSettings);

// Get all users (Admin only)
router.get("/", getAllUsers);

// Update user (Admin only)
router.put("/:id", updateUser);

// Delete user (Admin only)
router.delete("/:id", deleteUser);

export default router;