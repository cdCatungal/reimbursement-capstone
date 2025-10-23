// src/controllers/approvalController.js
import { User, Reimbursement, Approval } from "../models/index.js";
import { getNextApprover } from '../utils/approvalFlow.js';
import { sendEmail } from '../utils/sendEmail.js';

/**
 * Approve a reimbursement (by current approver)
 */
export async function approve(req, res) {
  try {
    const approver = req.user;
    const { id } = req.params;
    const { remarks } = req.body;

    if (!approver) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log(`👤 ${approver.name} (${approver.role}) attempting to approve reimbursement #${id}`);

    // ✅ Fetch reimbursement with user and approvals
    const r = await Reimbursement.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: Approval,
          as: 'approvals',
          include: [
            {
              model: User,
              as: 'approver',
              attributes: ['id', 'name', 'email', 'role']
            }
          ]
        }
      ]
    });

    if (!r) {
      return res.status(404).json({ error: 'Reimbursement not found' });
    }

    console.log(`📋 Reimbursement status: ${r.status}, current_approver: ${r.current_approver}`);

    // ✅ Check if it's this approver's turn
    if (r.current_approver !== approver.role) {
      console.log(`❌ Not approver's turn. Expected: ${r.current_approver}, Got: ${approver.role}`);
      return res.status(403).json({ 
        error: 'Not your approval step',
        currentApprover: r.current_approver,
        yourRole: approver.role
      });
    }

    // ✅ Find the pending approval record for this user's role
    const pendingApproval = await Approval.findOne({
      where: {
        reimbursement_id: r.id,
        approver_role: approver.role,
        status: 'Pending'
      }
    });

    if (!pendingApproval) {
      console.log(`❌ No pending approval found for role: ${approver.role}`);
      return res.status(404).json({ 
        error: 'No pending approval found for your role',
        role: approver.role
      });
    }

    console.log(`✅ Found pending approval at level ${pendingApproval.approval_level}`);

    // ✅ Update the approval record
    pendingApproval.approver_id = approver.id;
    pendingApproval.status = 'Approved';
    pendingApproval.remarks = remarks || null;
    pendingApproval.approved_at = new Date();
    await pendingApproval.save();

    console.log(`✅ Updated approval record`);

    // ✅ Move to next approver or mark as fully approved
    const nextRole = getNextApprover(r.user.role, approver.role);
    
    if (nextRole) {
      // Still has more approvers
      console.log(`➡️ Moving to next approver: ${nextRole}`);
      r.current_approver = nextRole;
      r.status = 'Pending';
      await r.save();

      // ✅ Notify next approver
      const nextUser = await User.findOne({ where: { role: nextRole } });
      if (nextUser) {
        console.log(`📧 Would notify ${nextUser.name} (${nextUser.email})`);
        /*
        await sendEmail(nextUser.email, 'Reimbursement awaiting your approval', `
          <p>Hi ${nextUser.name},</p>
          <p>Reimbursement #${r.id} from ${r.user.name} was approved by ${approver.name}.</p>
          <p>Amount: ₱${r.total}</p>
          <p>Please review and approve.</p>
        `);
        */
      }
    } else {
      // ✅ Final approval - mark as fully approved
      console.log(`✅ Final approval! Marking as Approved`);
      r.status = 'Approved';
      r.current_approver = null;
      r.approved_at = new Date();
      await r.save();

      // ✅ Notify submitter
      console.log(`📧 Would notify submitter ${r.user.name} (${r.user.email})`);
      /*
      await sendEmail(r.user.email, 'Your reimbursement was approved', `
        <p>Hi ${r.user.name},</p>
        <p>Your reimbursement #${r.id} has been fully approved!</p>
        <p>Amount: ₱${r.total}</p>
      `);
      */
    }

    res.json({ 
      ok: true, 
      message: 'Reimbursement approved successfully',
      reimbursement: r,
      nextApprover: nextRole
    });
  } catch (err) {
    console.error('❌ Error approving reimbursement:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
}

/**
 * Reject a reimbursement (by current approver)
 */
export async function reject(req, res) {
  try {
    const approver = req.user;
    const { id } = req.params;
    const { remarks } = req.body;

    if (!approver) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!remarks || remarks.trim() === '') {
      return res.status(400).json({ error: 'Remarks are required for rejection' });
    }

    console.log(`👤 ${approver.name} (${approver.role}) attempting to reject reimbursement #${id}`);

    // ✅ Fetch reimbursement with user
    const r = await Reimbursement.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role']
        }
      ]
    });

    if (!r) {
      return res.status(404).json({ error: 'Reimbursement not found' });
    }

    console.log(`📋 Reimbursement status: ${r.status}, current_approver: ${r.current_approver}`);

    // ✅ Check if it's this approver's turn
    if (r.current_approver !== approver.role) {
      console.log(`❌ Not approver's turn. Expected: ${r.current_approver}, Got: ${approver.role}`);
      return res.status(403).json({ 
        error: 'Not your approval step',
        currentApprover: r.current_approver,
        yourRole: approver.role
      });
    }

    // ✅ Find the pending approval record
    const pendingApproval = await Approval.findOne({
      where: {
        reimbursement_id: r.id,
        approver_role: approver.role,
        status: 'Pending'
      }
    });

    if (!pendingApproval) {
      console.log(`❌ No pending approval found for role: ${approver.role}`);
      return res.status(404).json({ 
        error: 'No pending approval found for your role',
        role: approver.role
      });
    }

    console.log(`✅ Found pending approval at level ${pendingApproval.approval_level}`);

    // ✅ Update the approval record to rejected
    pendingApproval.approver_id = approver.id;
    pendingApproval.status = 'Rejected';
    pendingApproval.remarks = remarks;
    pendingApproval.approved_at = new Date();
    await pendingApproval.save();

    console.log(`✅ Updated approval record to Rejected`);

    // ✅ Mark all remaining approvals as rejected (cascade)
    const remainingApprovals = await Approval.findAll({
      where: {
        reimbursement_id: r.id,
        status: 'Pending'
      }
    });

    if (remainingApprovals.length > 0) {
      console.log(`🔄 Cascading rejection to ${remainingApprovals.length} remaining approvals`);
      for (const approval of remainingApprovals) {
        if (approval.approval_level > pendingApproval.approval_level) {
          approval.status = 'Rejected';
          approval.remarks = 'Rejected in previous approval level';
          await approval.save();
        }
      }
    }

    // ✅ Update reimbursement status
    r.status = 'Rejected';
    r.current_approver = null;
    await r.save();

    console.log(`✅ Reimbursement marked as Rejected`);

    // ✅ Notify submitter
    console.log(`📧 Would notify submitter ${r.user.name} (${r.user.email})`);
    /*
    await sendEmail(r.user.email, 'Your reimbursement was rejected', `
      <p>Hi ${r.user.name},</p>
      <p>Your reimbursement #${r.id} was rejected by ${approver.name} (${approver.role}).</p>
      <p>Amount: ₱${r.total}</p>
      <p><strong>Reason:</strong> ${remarks}</p>
    `);
    */

    res.json({ 
      ok: true, 
      message: 'Reimbursement rejected successfully',
      reimbursement: r 
    });
  } catch (err) {
    console.error('❌ Error rejecting reimbursement:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
}