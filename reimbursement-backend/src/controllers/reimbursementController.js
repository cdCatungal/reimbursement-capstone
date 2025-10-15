// src/controllers/reimbursementController.js
import Reimbursement from '../models/Reimbursement.js';
import { User, Approval } from "../models/index.js";
import { sendEmail } from '../utils/sendEmail.js';
import { getNextApprover } from '../utils/approvalFlow.js';

// 📤 Create new reimbursement
export async function createReimbursement(req, res) {
  try {
    // ⚠️ Temporary hardcoded test user for local testing
    const user = req.user || { id: 1, name: 'Test Employee', email: 'employee@demo.com' };

    const payload = req.body;
    const firstApprover = getNextApprover(null); // returns 'Manager'

    const r = await Reimbursement.create({
      user_id: user.id,
      category: payload.category,
      type: payload.type,
      description: payload.description,
      total: payload.total,
      status: 'Pending',
      current_approver: firstApprover,
      receipt_url: req.file ? `/uploads/${req.file.filename}` : null,
    });

    // Optionally notify a manager (email sending disabled for now)
    const manager = await User.findOne({ where: { role: 'Manager' } });
    if (manager) {
      /*
      await sendEmail(manager.email, 'Reimbursement pending your approval', `
        <p>Hello ${manager.name},</p>
        <p>A reimbursement (#${r.id}) from ${user.name} requires your approval.</p>
        <p>Amount: ₱${r.total}</p>
        <p><a href="${process.env.CLIENT_URL || 'http://localhost:3000'}">Open Reimbursement Tool</a></p>
      `);
      */
    }

    res.json({ reimbursement: r });
  } catch (err) {
    console.error('❌ Error creating reimbursement:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// 📥 Get reimbursements (by userId, or all if admin)
export async function getUserReimbursements(req, res) {
  try {
    const { userId } = req.query;
    let where = {};

    // If userId is provided, fetch only that user’s reimbursements
    if (userId) {
      where.user_id = userId;
    }

    const reimbursements = await Reimbursement.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    res.json({ reimbursements });
  } catch (err) {
    console.error('❌ Error fetching reimbursements:', err);
    res.status(500).json({ error: 'Failed to fetch reimbursements' });
  }
}
