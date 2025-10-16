import express from 'express';
import { createReimbursement, getUserReimbursements, updateReimbursementStatus } from '../controllers/reimbursementController.js';
import { upload } from '../middlewares/upload.js';

const router = express.Router();

// ⬅️ Middleware to check if user is authenticated via session (Passport)
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'Not authenticated' });
};

// 📤 Submit a new reimbursement request (requires authentication)
router.post('/', isAuthenticated, upload.single('receipt'), createReimbursement);

// 📥 Get reimbursements (optionally filtered by userId - requires authentication)
router.get('/', isAuthenticated, getUserReimbursements);

// 📝 Update reimbursement status (approve/reject - requires authentication)
router.put('/:id', isAuthenticated, updateReimbursementStatus);

export default router;