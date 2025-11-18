// reimbursement-backend/src/controllers/approvalController.js
import { User, Reimbursement, Approval, SapCode } from "../models/index.js";
// import { getNextApprover, findAssignedSUL, findAccountManagerForSapCode } from '../utils/approvalFlow.js';
import { getNextApprover } from "../utils/approvalFlow.js";
import { sendEmail } from "../utils/sendEmail.js";
import {
  approvalProgressTemplate,
  finalApprovalTemplate,
  rejectionTemplate,
  nextApproverNotificationTemplate,
} from "../utils/emailTemplates.js";

/**
 * ✅ UPDATED: Approve a reimbursement with new routing logic
 */
export async function approve(req, res) {
  try {
    const approver = req.user;
    const { id } = req.params;
    const { remarks } = req.body;

    if (!approver) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    console.log(
      `👤 ${approver.name} (${approver.role}) attempting to approve reimbursement #${id}`
    );

    // ✅ Fetch reimbursement with user and approvals - FIXED INCLUDE
    const r = await Reimbursement.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "role", "assigned_sul_id"], // ← EXPLICITLY INCLUDE assigned_sul_id
          include: [
            {
              model: User,
              as: "assignedSUL",
              attributes: ["id", "name", "email", "role"],
            },
          ],
        },
        {
          model: Approval,
          as: "approvals",
          include: [
            {
              model: User,
              as: "approver",
              attributes: ["id", "name", "email", "role"],
            },
          ],
        },
      ],
    });

    if (!r) {
      return res.status(404).json({ error: "Reimbursement not found" });
    }

    console.log(
      `📋 Reimbursement SAP Code: ${r.sap_code}, status: ${r.status}, current_approver: ${r.current_approver}`
    );
    console.log(
      `👤 User assigned_sul_id: ${r.user.assigned_sul_id}, Current approver ID: ${approver.id}`
    ); // ← DEBUG LOG

    // ✅ Check if it's this approver's turn
    if (r.current_approver !== approver.role) {
      console.log(
        `❌ Not approver's turn. Expected: ${r.current_approver}, Got: ${approver.role}`
      );
      return res.status(403).json({
        error: "Not your approval step",
        currentApprover: r.current_approver,
        yourRole: approver.role,
      });
    }

    // ✅ FIXED: Role-specific authorization with better logging
    if (approver.role === "SUL") {
      // Verify SUL is assigned to this employee
      console.log(
        `🔍 Checking SUL assignment: assigned_sul_id=${r.user.assigned_sul_id}, approver.id=${approver.id}`
      );

      if (!r.user.assigned_sul_id) {
        console.log(`❌ Employee has no assigned SUL`);
        return res.status(403).json({
          error: "This employee has no assigned SUL",
          employeeName: r.user.name,
        });
      }

      if (r.user.assigned_sul_id !== approver.id) {
        console.log(
          `❌ SUL not assigned to employee. Assigned SUL ID: ${r.user.assigned_sul_id}, Current SUL ID: ${approver.id}`
        );
        return res.status(403).json({
          error: "You are not the assigned SUL for this employee",
          assignedSUL: r.user.assignedSUL?.name || "Unknown",
          assignedSULId: r.user.assigned_sul_id,
        });
      }
      console.log(`✅ SUL assignment verified`);
    } else if (approver.role === "Account Manager") {
      // Verify AM manages this SAP code
      const sapCode = await SapCode.findOne({
        where: { code: r.sap_code },
      });

      console.log(
        `🔍 Checking AM assignment: SAP=${r.sap_code}, AM from DB=${sapCode?.account_manager_id}, approver.id=${approver.id}`
      );

      if (!sapCode) {
        console.log(`❌ SAP code not found: ${r.sap_code}`);
        return res.status(403).json({
          error: "SAP code not found in system",
          sapCode: r.sap_code,
        });
      }

      if (sapCode.account_manager_id !== approver.id) {
        console.log(
          `❌ Account Manager not assigned to SAP code. SAP: ${r.sap_code}, Expected AM ID: ${sapCode.account_manager_id}, Current AM ID: ${approver.id}`
        );
        return res.status(403).json({
          error: "You are not the Account Manager for this SAP code",
          sapCode: r.sap_code,
        });
      }
      console.log(`✅ Account Manager assignment verified`);
    }

    // ✅ Find the pending approval record for this user's role
    const pendingApproval = await Approval.findOne({
      where: {
        reimbursement_id: r.id,
        approver_role: approver.role,
        status: "Pending",
      },
    });

    if (!pendingApproval) {
      console.log(`❌ No pending approval found for role: ${approver.role}`);
      return res.status(404).json({
        error: "No pending approval found for your role",
        role: approver.role,
      });
    }

    console.log(
      `✅ Found pending approval at level ${pendingApproval.approval_level}`
    );

    // ✅ Update the approval record
    pendingApproval.approver_id = approver.id;
    pendingApproval.status = "Approved";
    pendingApproval.remarks = remarks || null;
    pendingApproval.approved_at = new Date();
    await pendingApproval.save();

    console.log(`✅ Updated approval record`);

    // ✅ Move to next approver or mark as fully approved
    const nextRole = getNextApprover(r.user.role, approver.role);

    if (nextRole) {
      console.log(`➡️ Moving to next approver: ${nextRole}`);

      // ✅ NEW: Find next approver based on role
      let nextApprover = null;

      if (nextRole === "Account Manager") {
        // Find AM for this SAP code
        const sapCode = await SapCode.findOne({
          where: { code: r.sap_code },
          include: [{ model: User, as: "accountManager" }],
        });
        nextApprover = sapCode ? sapCode.accountManager : null;
      } else {
        // Find any user with this role
        nextApprover = await User.findOne({ where: { role: nextRole } });
      }

      if (!nextApprover) {
        console.log(`⚠️ Warning: No ${nextRole} found`);
      }

      r.current_approver = nextRole;
      r.status = "Pending";
      await r.save();

      // ✅ Update the next approval record with approver_id if found
      if (nextApprover) {
        const nextApprovalRecord = await Approval.findOne({
          where: {
            reimbursement_id: r.id,
            approver_role: nextRole,
            status: "Pending",
          },
        });

        if (nextApprovalRecord && !nextApprovalRecord.approver_id) {
          nextApprovalRecord.approver_id = nextApprover.id;
          await nextApprovalRecord.save();
        }
      }

      // 📧 Send intermediate approval email to REQUESTER
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
        console.error("❌ Failed to send progress email:", emailError);
      }

      // 📧 Send email to NEXT APPROVER
      if (nextApprover) {
        try {
          const nextApprovalLevel = pendingApproval.approval_level + 1;
          const emailHtml = nextApproverNotificationTemplate(
            {
              sap_code: r.sap_code,
              category: r.category,
              total: r.total,
              items: r.items,
              description: r.description,
              date_of_expense: r.date_of_expense,
            },
            {
              name: r.user.name,
              role: r.user.role,
            },
            {
              name: approver.name,
              role: approver.role,
            },
            nextApprover.name,
            nextApprovalLevel
          );

          await sendEmail(
            nextApprover.email,
            `📋 Reimbursement Ready for Your Approval - Level ${nextApprovalLevel}`,
            emailHtml
          );

          console.log(
            `📧 Next approver notification sent to ${nextApprover.name} (${nextApprover.email})`
          );
        } catch (emailError) {
          console.error(
            "❌ Failed to send next approver notification:",
            emailError
          );
        }
      }
    } else {
      // 📧 Final approval - mark as fully approved
      console.log(`✅ Final approval! Marking as Approved`);
      r.status = "Approved";
      r.current_approver = null;
      r.approved_at = new Date();
      await r.save();

      // 📧 Send final approval email to requester
      try {
        const emailHtml = finalApprovalTemplate(
          r,
          approver.name,
          approver.role
        );

        await sendEmail(
          r.user.email,
          `🎉 Reimbursement Fully Approved - ${r.sap_code}`,
          emailHtml
        );

        console.log(`📧 Final approval email sent to ${r.user.email}`);
      } catch (emailError) {
        console.error("❌ Failed to send final approval email:", emailError);
      }
    }

    res.json({
      ok: true,
      message: nextRole
        ? "Approval recorded successfully. Email notifications sent to requester and next approver."
        : "Reimbursement fully approved! Email notification sent to requester.",
      reimbursement: r,
      nextApprover: nextRole,
    });
  } catch (err) {
    console.error("❌ Error approving reimbursement:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}

/**
 * ✅ UPDATED: Reject a reimbursement with new routing logic
 */
export async function reject(req, res) {
  try {
    const approver = req.user;
    const { id } = req.params;
    const { remarks } = req.body;

    if (!approver) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!remarks || remarks.trim() === "") {
      return res
        .status(400)
        .json({ error: "Remarks are required for rejection" });
    }

    console.log(
      `👤 ${approver.name} (${approver.role}) attempting to reject reimbursement #${id}`
    );

    // ✅ Fetch reimbursement with user and all approvals - FIXED INCLUDE
    const r = await Reimbursement.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "role", "assigned_sul_id"], // ← EXPLICITLY INCLUDE assigned_sul_id
          include: [
            {
              model: User,
              as: "assignedSUL",
              attributes: ["id", "name", "email", "role"],
            },
          ],
        },
        {
          model: Approval,
          as: "approvals",
          include: [
            {
              model: User,
              as: "approver",
              attributes: ["id", "name", "email", "role"],
            },
          ],
        },
      ],
    });

    if (!r) {
      return res.status(404).json({ error: "Reimbursement not found" });
    }

    console.log(
      `📋 Reimbursement SAP Code: ${r.sap_code}, status: ${r.status}, current_approver: ${r.current_approver}`
    );
    console.log(
      `👤 User assigned_sul_id: ${r.user.assigned_sul_id}, Current approver ID: ${approver.id}`
    ); // ← DEBUG LOG

    // ✅ Check if it's this approver's turn
    if (r.current_approver !== approver.role) {
      console.log(
        `❌ Not approver's turn. Expected: ${r.current_approver}, Got: ${approver.role}`
      );
      return res.status(403).json({
        error: "Not your approval step",
        currentApprover: r.current_approver,
        yourRole: approver.role,
      });
    }

    // ✅ FIXED: Role-specific authorization with better logging
    if (approver.role === "SUL") {
      console.log(
        `🔍 Checking SUL assignment: assigned_sul_id=${r.user.assigned_sul_id}, approver.id=${approver.id}`
      );

      if (!r.user.assigned_sul_id) {
        console.log(`❌ Employee has no assigned SUL`);
        return res.status(403).json({
          error: "This employee has no assigned SUL",
          employeeName: r.user.name,
        });
      }

      if (r.user.assigned_sul_id !== approver.id) {
        console.log(`❌ SUL not assigned to employee`);
        return res.status(403).json({
          error: "You are not the assigned SUL for this employee",
          assignedSUL: r.user.assignedSUL?.name || "Unknown",
          assignedSULId: r.user.assigned_sul_id,
        });
      }
      console.log(`✅ SUL assignment verified`);
    } else if (approver.role === "Account Manager") {
      const sapCode = await SapCode.findOne({
        where: { code: r.sap_code },
      });

      console.log(
        `🔍 Checking AM assignment: SAP=${r.sap_code}, AM from DB=${sapCode?.account_manager_id}, approver.id=${approver.id}`
      );

      if (!sapCode) {
        console.log(`❌ SAP code not found: ${r.sap_code}`);
        return res.status(403).json({
          error: "SAP code not found in system",
          sapCode: r.sap_code,
        });
      }

      if (sapCode.account_manager_id !== approver.id) {
        console.log(`❌ Account Manager not assigned to SAP code`);
        return res.status(403).json({
          error: "You are not the Account Manager for this SAP code",
          sapCode: r.sap_code,
        });
      }
      console.log(`✅ Account Manager assignment verified`);
    }

    // ✅ Find the pending approval record
    const pendingApproval = await Approval.findOne({
      where: {
        reimbursement_id: r.id,
        approver_role: approver.role,
        status: "Pending",
      },
    });

    if (!pendingApproval) {
      console.log(`❌ No pending approval found for role: ${approver.role}`);
      return res.status(404).json({
        error: "No pending approval found for your role",
        role: approver.role,
      });
    }

    console.log(
      `✅ Found pending approval at level ${pendingApproval.approval_level}`
    );

    // ✅ Update the approval record to rejected
    pendingApproval.approver_id = approver.id;
    pendingApproval.status = "Rejected";
    pendingApproval.remarks = remarks;
    pendingApproval.approved_at = new Date();
    await pendingApproval.save();

    console.log(`✅ Updated approval record to Rejected`);

    // ✅ Mark all remaining approvals as rejected (cascade)
    const remainingApprovals = await Approval.findAll({
      where: {
        reimbursement_id: r.id,
        status: "Pending",
      },
    });

    if (remainingApprovals.length > 0) {
      console.log(
        `🔄 Cascading rejection to ${remainingApprovals.length} remaining approvals`
      );
      for (const approval of remainingApprovals) {
        if (approval.approval_level > pendingApproval.approval_level) {
          approval.status = "Rejected";
          approval.remarks = "Rejected in previous approval level";
          await approval.save();
        }
      }
    }

    // ✅ Update reimbursement status
    r.status = "Rejected";
    r.current_approver = null;
    await r.save();

    console.log(`✅ Reimbursement marked as Rejected`);

    // 📧 Collect CC recipients (previous approvers who approved)
    const ccEmails = [];

    console.log(
      `📧 Building CC list from approvals that were already APPROVED...`
    );
    console.log(
      `   Current rejection level: ${pendingApproval.approval_level}`
    );

    const previouslyApprovedApprovals = r.approvals.filter(
      (approval) =>
        approval.status === "Approved" &&
        approval.approval_level < pendingApproval.approval_level
    );

    console.log(
      `   Found ${previouslyApprovedApprovals.length} previously approved stages`
    );

    for (const approval of previouslyApprovedApprovals) {
      if (approval.approver && approval.approver.email) {
        ccEmails.push(approval.approver.email);
        console.log(
          `   ✅ Added ${approval.approver_role} (Level ${approval.approval_level}): ${approval.approver.email}`
        );
      } else {
        console.log(
          `   ⚠️ Skipping ${approval.approver_role} (Level ${approval.approval_level}): No approver assigned`
        );
      }
    }

    console.log(`📧 Final CC list (${ccEmails.length} approvers):`, ccEmails);

    // 📧 Send rejection email to requester with CC to approvers who already approved
    try {
      const emailHtml = rejectionTemplate(
        r,
        r.user.name,
        approver.name,
        approver.role,
        remarks,
        pendingApproval.approval_level
      );

      await sendEmail(
        r.user.email,
        `❌ Reimbursement Rejected - ${r.sap_code}`,
        emailHtml,
        ccEmails.length > 0 ? ccEmails : null
      );

      console.log(`📧 Rejection email sent to ${r.user.email}`);
      if (ccEmails.length > 0) {
        console.log(
          `📧 CC sent to ${
            ccEmails.length
          } previous approver(s) who approved: ${ccEmails.join(", ")}`
        );
      } else {
        console.log(`📧 No CC recipients (no previous approvers)`);
      }
    } catch (emailError) {
      console.error("❌ Failed to send rejection email:", emailError);
    }

    res.json({
      ok: true,
      message:
        ccEmails.length > 0
          ? "Reimbursement rejected successfully. Email notification sent to requester and previous approvers."
          : "Reimbursement rejected successfully. Email notification sent to requester.",
      reimbursement: r,
    });
  } catch (err) {
    console.error("❌ Error rejecting reimbursement:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
