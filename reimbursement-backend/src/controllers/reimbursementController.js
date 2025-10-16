import Reimbursement from '../models/Reimbursement.js';
import { User, Approval } from "../models/index.js";
import { sendEmail } from '../utils/sendEmail.js';
import { getNextApprover } from '../utils/approvalFlow.js';

// 📤 Create new reimbursement
export async function createReimbursement(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const payload = req.body;
    const firstApprover = getNextApprover(null);

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

    const manager = await User.findOne({ where: { role: 'Manager' } });
    if (manager) {
      // Email notification can be enabled later
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
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { userId } = req.query;
    let where = {};

    if (userId) {
      where.user_id = userId;
    } else if (!user.isAdmin) {
      where.user_id = user.id;
    }

    const reimbursements = await Reimbursement.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
    });

    const formattedReimbursements = reimbursements.map(r => ({
      id: r.id,
      userId: r.user_id,
      user: r.user ? {
        displayName: r.user.name || r.user.email
      } : null,
      category: r.category,
      type: r.type,
      description: r.description,
      total: r.total,
      status: r.status,
      currentApprover: r.current_approver,
      receipt: r.receipt_url,
      date: r.createdAt,
      submittedAt: r.submitted_at || r.createdAt,
      approvedAt: r.approved_at,
      merchant: r.type,
      items: r.description,
      extractedText: null
    }));

    res.json(formattedReimbursements);
  } catch (err) {
    console.error('❌ Error fetching reimbursements:', err);
    res.status(500).json({ error: 'Failed to fetch reimbursements' });
  }
}

// 📝 Update reimbursement status (approve/reject)
export async function updateReimbursementStatus(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Find the reimbursement
    const reimbursement = await Reimbursement.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!reimbursement) {
      return res.status(404).json({ error: 'Reimbursement not found' });
    }

    // Update the status
    reimbursement.status = status;
    if (status === 'Approved') {
      reimbursement.approved_at = new Date();
      reimbursement.current_approver = null;
    } else if (status === 'Rejected') {
      reimbursement.current_approver = null;
    }

    await reimbursement.save();

    // Optionally send email to user about approval/rejection
    if (reimbursement.user) {
      const subject = status === 'Approved' 
        ? 'Your Reimbursement Has Been Approved' 
        : 'Your Reimbursement Has Been Rejected';
      
      const message = status === 'Approved'
        ? `Hi ${reimbursement.user.name}, your reimbursement request for ₱${reimbursement.total} has been approved.`
        : `Hi ${reimbursement.user.name}, your reimbursement request for ₱${reimbursement.total} has been rejected.`;
      
      // Uncomment to enable email notifications
      // await sendEmail(reimbursement.user.email, subject, message);
    }

    res.json({ 
      success: true, 
      message: `Reimbursement ${status.toLowerCase()} successfully`,
      reimbursement 
    });
  } catch (err) {
    console.error('❌ Error updating reimbursement:', err);
    res.status(500).json({ error: 'Failed to update reimbursement' });
  }
}