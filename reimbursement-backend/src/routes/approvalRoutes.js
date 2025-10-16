import express from 'express';
import { approve, reject } from '../controllers/approvalController.js';
import { verifyToken } from '../middlewares/authMiddleware.js'; // ⬅️ Add this

const router = express.Router();

router.post('/:id/approve', verifyToken, approve);  // ✅ Add auth
router.post('/:id/reject', verifyToken, reject);    // ✅ Add auth

export default router;