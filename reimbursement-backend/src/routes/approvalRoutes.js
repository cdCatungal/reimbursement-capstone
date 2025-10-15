// src/routes/approvalRoutes.js
import express from 'express';
import { approve, reject } from '../controllers/approvalController.js';
const router = express.Router();

router.post('/:id/approve', approve);
router.post('/:id/reject', reject);

export default router;