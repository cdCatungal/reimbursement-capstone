import express from 'express';
import { createReimbursement, getUserReimbursements, updateReimbursementStatus } from '../controllers/reimbursementController.js';
import { upload } from '../middlewares/upload.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 📤 Submit a new reimbursement request (requires authentication)
router.post('/', verifyToken, upload.single('receipt'), createReimbursement);

// 📥 Get reimbursements (optionally filtered by userId - requires authentication)
router.get('/', verifyToken, getUserReimbursements);

// 📝 Update reimbursement status (approve/reject - requires authentication)
router.put('/:id', verifyToken, updateReimbursementStatus);

export default router;