import express from 'express';
import { 
  createReimbursement, 
  getUserReimbursements, 
  updateReimbursementStatus, 
  getPendingApprovals 
} from '../controllers/reimbursementController.js';
import { upload } from '../middlewares/upload.js';

const router = express.Router();

// ⬅️ Middleware to check if user is authenticated via session (Passport)
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'Not authenticated' });
};

// 📤 Submit a new reimbursement request
router.post('/', isAuthenticated, upload.single('receipt'), createReimbursement);

// 📥 Get current user's reimbursements (for Status Tracker)
router.get('/my-reimbursements', isAuthenticated, getUserReimbursements);  // ⬅️ ADDED

// 📋 Get reimbursements pending current user's approval (for Approval Dashboard)
router.get('/pending-approvals', isAuthenticated, getPendingApprovals);  // ⬅️ FIXED

// 📝 Update reimbursement status (approve/reject)
router.put('/:id', isAuthenticated, updateReimbursementStatus);

export default router;