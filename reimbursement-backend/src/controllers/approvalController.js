// src/controllers/approvalController.js
import { User, Reimbursement, Approval } from "../models/index.js";
import { getNextApprover } from '../utils/approvalFlow.js';
import { sendEmail } from '../utils/sendEmail.js';

export async function approve(req, res) {
  try {
    const approver = req.user;
    const { id } = req.params;
    const { remarks } = req.body;

    const r = await Reimbursement.findByPk(id);
    if (!r) return res.status(404).json({ error: 'Not found' });

    // Check if it's this approver's turn
    if (r.current_approver !== approver.role) {
      return res.status(403).json({ error: 'Not your approval step' });
    }

    // Record approval
    await Approval.create({
      reimbursement_id: r.id,
      approver_id: approver.id,
      approved: true,
      remarks
    });

    // Move to next approver
    const nextRole = getNextApprover(approver.role);
    if (nextRole) {
      r.status = `${approver.role} Approved`;
      r.current_approver = nextRole;
      await r.save();

      // notify next approver (find a user with that role)
      const nextUser = await User.findOne({ where: { role: nextRole }});
      if (nextUser) {
        await sendEmail(nextUser.email, 'Reimbursement awaiting your approval', `
          <p>Hi ${nextUser.name},</p>
          <p>Reimbursement #${r.id} was approved by ${approver.name}. Please review.</p>
        `);
      }
    } else {
      // final approval
      r.status = 'Approved';
      r.current_approver = null;
      r.approved_at = new Date();
      await r.save();

      // notify owner
      const owner = await User.findByPk(r.user_id);
      if (owner) {
        await sendEmail(owner.email, 'Your reimbursement was approved', `
          <p>Hi ${owner.name},</p>
          <p>Your reimbursement #${r.id} has been fully approved.</p>
        `);
      }
    }

    res.json({ ok: true, reimbursement: r });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function reject(req, res) {
  try {
    const approver = req.user;
    const { id } = req.params;
    const { remarks } = req.body;

    const r = await Reimbursement.findByPk(id);
    if (!r) return res.status(404).json({ error: 'Not found' });

    if (r.current_approver !== approver.role) {
      return res.status(403).json({ error: 'Not your approval step' });
    }

    await Approval.create({
      reimbursement_id: r.id,
      approver_id: approver.id,
      approved: false,
      remarks
    });

    r.status = 'Rejected';
    r.current_approver = null;
    await r.save();

    const owner = await User.findByPk(r.user_id);
    if (owner) {
      await sendEmail(owner.email, 'Your reimbursement was rejected', `
        <p>Hi ${owner.name},</p>
        <p>Your reimbursement #${r.id} was rejected by ${approver.name}.</p>
        <p>Remarks: ${remarks || 'No remarks provided'}</p>
      `);
    }

    res.json({ ok: true, reimbursement: r });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}