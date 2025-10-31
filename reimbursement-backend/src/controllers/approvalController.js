// reimbursement-backend/src/controllers/approvalController.js
import { User, Reimbursement, Approval } from "../models/index.js";
import { getNextApprover, findApproverBySapCode } from '../utils/approvalFlow.js';
import { sendEmail } from '../utils/sendEmail.js';
import { approvalProgressTemplate, finalApprovalTemplate, rejectionTemplate } from '../utils/emailTemplates.js';

/**
 * Approve a reimbursement (by current approver with SAP code routing)
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

    console.log(`📋 Reimbursement SAP Code: ${r.sap_code}, status: ${r.status}, current_approver: ${r.current_approver}`);

    // ✅ Check if it's this approver's turn
    if (r.current_approver !== approver.role) {
      console.log(`❌ Not approver's turn. Expected: ${r.current_approver}, Got: ${approver.role}`);
      return res.status(403).json({ 
        error: 'Not your approval step',
        currentApprover: r.current_approver,
        yourRole: approver.role
      });
    }

    // ✅ For SUL and Account Manager, verify SAP code match
    if (['SUL', 'Account Manager'].includes(approver.role)) {
      const approverSapCodes = [approver.sap_code_1, approver.sap_code_2].filter(Boolean);
      
      if (!approverSapCodes.includes(r.sap_code)) {
        console.log(`❌ SAP code mismatch. Request: ${r.sap_code}, Approver: ${approverSapCodes.join(', ')}`);
        return res.status(403).json({
          error: 'This reimbursement is not assigned to your SAP code',
          requestSapCode: r.sap_code,
          yourSapCodes: approverSapCodes
        });
      }
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
      // 📧 Still has more approvers - send progress email
      console.log(`➡️ Moving to next approver: ${nextRole}`);
      
      // ✅ Find next approver based on SAP code (if applicable)
      const allUsers = await User.findAll();
      const nextApprover = findApproverBySapCode(nextRole, r.sap_code, allUsers);
      
      if (!nextApprover) {
        console.log(`⚠️ Warning: No ${nextRole} found for SAP code ${r.sap_code}`);
      }
      
      r.current_approver = nextRole;
      r.status = 'Pending';
      await r.save();

      // ✅ Update the next approval record with approver_id if found
      if (nextApprover) {
        const nextApprovalRecord = await Approval.findOne({
          where: {
            reimbursement_id: r.id,
            approver_role: nextRole,
            status: 'Pending'
          }
        });
        
        if (nextApprovalRecord && !nextApprovalRecord.approver_id) {
          nextApprovalRecord.approver_id = nextApprover.id;
          await nextApprovalRecord.save();
        }
      }

      // 📧 Send intermediate approval email to requester
      try {
        const emailHtml = approvalProgressTemplate(
          r, 
          approver.name, 
          approver.role, 
          nextRole,
          pendingApproval.approval_level
        );
        
        await sendEmail(
          r.user.email,
          `✅ Reimbursement Approved - Level ${pendingApproval.approval_level} (${approver.role})`,
          emailHtml
        );
        
        console.log(`📧 Progress email sent to ${r.user.email}`);
      } catch (emailError) {
        console.error('❌ Failed to send progress email:', emailError);
        // Don't fail the approval if email fails
      }

    } else {
      // 📧 Final approval - mark as fully approved
      console.log(`✅ Final approval! Marking as Approved`);
      r.status = 'Approved';
      r.current_approver = null;
      r.approved_at = new Date();
      await r.save();

      // 📧 Send final approval email to requester
      try {
        const emailHtml = finalApprovalTemplate(r, approver.name, approver.role);
        
        await sendEmail(
          r.user.email,
          `🎉 Reimbursement Fully Approved - ${r.sap_code}`,
          emailHtml
        );
        
        console.log(`📧 Final approval email sent to ${r.user.email}`);
      } catch (emailError) {
        console.error('❌ Failed to send final approval email:', emailError);
        // Don't fail the approval if email fails
      }
    }

    res.json({ 
      ok: true, 
      message: nextRole 
        ? 'Approval recorded successfully. Email notification sent to requester.' 
        : 'Reimbursement fully approved! Email notification sent to requester.',
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

    console.log(`📋 Reimbursement SAP Code: ${r.sap_code}, status: ${r.status}, current_approver: ${r.current_approver}`);

    // ✅ Check if it's this approver's turn
    if (r.current_approver !== approver.role) {
      console.log(`❌ Not approver's turn. Expected: ${r.current_approver}, Got: ${approver.role}`);
      return res.status(403).json({ 
        error: 'Not your approval step',
        currentApprover: r.current_approver,
        yourRole: approver.role
      });
    }

    // ✅ For SUL and Account Manager, verify SAP code match
    if (['SUL', 'Account Manager'].includes(approver.role)) {
      const approverSapCodes = [approver.sap_code_1, approver.sap_code_2].filter(Boolean);
      
      if (!approverSapCodes.includes(r.sap_code)) {
        console.log(`❌ SAP code mismatch. Request: ${r.sap_code}, Approver: ${approverSapCodes.join(', ')}`);
        return res.status(403).json({
          error: 'This reimbursement is not assigned to your SAP code',
          requestSapCode: r.sap_code,
          yourSapCodes: approverSapCodes
        });
      }
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

    // 📧 Send rejection email to requester
    try {
      const emailHtml = rejectionTemplate(
        r, 
        approver.name, 
        approver.role, 
        remarks,
        pendingApproval.approval_level
      );
      
      await sendEmail(
        r.user.email,
        `❌ Reimbursement Rejected - ${r.sap_code}`,
        emailHtml
      );
      
      console.log(`📧 Rejection email sent to ${r.user.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send rejection email:', emailError);
      // Don't fail the rejection if email fails
    }

    res.json({ 
      ok: true, 
      message: 'Reimbursement rejected successfully. Email notification sent to requester.',
      reimbursement: r 
    });
  } catch (err) {
    console.error('❌ Error rejecting reimbursement:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
}