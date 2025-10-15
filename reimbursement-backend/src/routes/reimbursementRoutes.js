import express from 'express';
import { createReimbursement, getUserReimbursements } from '../controllers/reimbursementController.js';
import { upload } from '../middlewares/upload.js';

const router = express.Router();

// 📤 Submit a new reimbursement request
router.post('/', upload.single('receipt'), createReimbursement);

// 📥 Get reimbursements (optionally filtered by userId)
router.get('/', getUserReimbursements);

export default router;
