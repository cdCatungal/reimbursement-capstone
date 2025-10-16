import express from 'express';
import { createReimbursement, getUserReimbursements } from '../controllers/reimbursementController.js';
import { upload } from '../middlewares/upload.js';
import { verifyToken } from '../middlewares/authMiddleware.js'; // ⬅️ Import auth middleware

const router = express.Router();

// 📤 Submit a new reimbursement request (requires authentication)
router.post('/', verifyToken, upload.single('receipt'), createReimbursement);

// 📥 Get reimbursements (optionally filtered by userId - requires authentication)
router.get('/', verifyToken, getUserReimbursements);

export default router;