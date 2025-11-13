import { Reimbursement, User, Approval, SapCode } from "../models/index.js";
import { sendEmail } from "../utils/sendEmail.js";
<<<<<<< HEAD
import {
  getApprovalFlow,
  findApproverBySapCode,
} from "../utils/approvalFlow.js";
=======
import { getApprovalFlow, findAssignedSUL, findAccountManagerForSapCode } from "../utils/approvalFlow.js";
>>>>>>> d9068ce5d15143245313495df18292d8a892c1d3
import { bufferToBase64 } from "../middlewares/upload.js";
import { newSubmissionToApproverTemplate } from "../utils/emailTemplates.js";

/**
 * ✅ UPDATED: Create new reimbursement - SUL and Invoice Specialist bypass SAP validation
 */
export async function createReimbursement(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = req.user;
    const payload = req.body;

    console.log("📋 Creating reimbursement for user:", user.name, user.role);
    console.log("📅 Received date_of_expense:", payload.date_of_expense);

    // ✅ NEW: Roles that bypass SAP code validation
    const bypassSapValidation = ['Invoice Specialist', 'SUL'].includes(user.role);

    // ✅ UPDATED: Validate SAP code (skip for Invoice Specialists AND SULs)
    if (!bypassSapValidation) {
      if (!payload.sap_code) {
        return res.status(400).json({ error: "SAP code is required" });
      }

<<<<<<< HEAD
      // ✅ Validate user has this SAP code
      if (
        user.sap_code_1 !== payload.sap_code &&
        user.sap_code_2 !== payload.sap_code
      ) {
        return res.status(400).json({
          error:
            "Invalid SAP code. You can only submit reimbursements with your assigned SAP codes.",
          userSapCodes: [user.sap_code_1, user.sap_code_2].filter(Boolean),
=======
      // ✅ Validate user has this SAP code in junction table
      const userWithSapCodes = await User.findByPk(user.id, {
        include: [{
          model: SapCode,
          as: 'sapCodes',
          where: { code: payload.sap_code },
          required: false
        }]
      });

      if (!userWithSapCodes || userWithSapCodes.sapCodes.length === 0) {
        return res.status(400).json({ 
          error: `Invalid SAP code. You can only submit reimbursements with your assigned SAP codes.`,
          providedSapCode: payload.sap_code,
          userRole: user.role
>>>>>>> d9068ce5d15143245313495df18292d8a892c1d3
        });
      }
      
      console.log(`✅ ${user.role} ${user.name} validated for SAP code: ${payload.sap_code}`);
    } else {
      // ✅ Auto-assign special SAP code for roles that bypass validation
      if (!payload.sap_code) {
        payload.sap_code = user.role === 'Invoice Specialist' 
          ? 'INVOICE_SPECIALIST' 
          : 'SUL_DIRECT';
      }
      console.log(`✅ ${user.role} submission - bypassing SAP code validation (using: ${payload.sap_code})`);
    }

    // ✅ Get the full approval flow
    const approvalFlow = getApprovalFlow(user.role);

    if (!approvalFlow || approvalFlow.length === 0) {
      return res.status(400).json({
        error: "No approval flow defined for your role",
        role: user.role,
      });
    }

    console.log("📋 Approval flow:", approvalFlow);

    // ✅ Find first approver based on role-specific logic
    let firstApprover = null;
    const firstApproverRole = approvalFlow[0];
<<<<<<< HEAD
    let firstApprover;

    if (isInvoiceSpecialist) {
      // For Invoice Specialists, find any approver with the required role
      firstApprover = allUsers.find((u) => u.role === firstApproverRole);
    } else {
      firstApprover = findApproverBySapCode(
        firstApproverRole,
        payload.sap_code,
        allUsers
      );
    }

    if (!firstApprover) {
      return res.status(400).json({
        error: `No ${firstApproverRole} found${
          isInvoiceSpecialist
            ? ""
            : ` with matching SAP code: ${payload.sap_code}`
        }`,
        sapCode: payload.sap_code,
=======

    if (firstApproverRole === "SUL") {
      // ✅ For Employees → Find manually assigned SUL
      const employeeWithSUL = await User.findByPk(user.id, {
        include: [{ model: User, as: 'assignedSUL' }]
>>>>>>> d9068ce5d15143245313495df18292d8a892c1d3
      });

      firstApprover = findAssignedSUL(employeeWithSUL);
      
      if (!firstApprover || !firstApprover.id) {
        return res.status(400).json({
          error: `No SUL assigned to you. Please contact Sales Director to assign a SUL.`,
        });
      }

      // If we only have the ID, fetch the full user object
      if (!firstApprover.email) {
        firstApprover = await User.findByPk(firstApprover.id);
      }

    } else if (firstApproverRole === "Account Manager") {
      // ✅ For SULs & Account Managers → Find Account Manager assigned to SAP Code
      const sapCodeWithAM = await SapCode.findOne({
        where: { code: payload.sap_code },
        include: [{ model: User, as: 'accountManager' }]
      });

      firstApprover = sapCodeWithAM ? sapCodeWithAM.accountManager : null;

      if (!firstApprover) {
        return res.status(400).json({
          error: `No Account Manager assigned to SAP Code: ${payload.sap_code}. Please contact Sales Director.`,
          sapCode: payload.sap_code
        });
      }

    } else {
      // ✅ For other roles → Find any user with that role
      firstApprover = await User.findOne({ where: { role: firstApproverRole } });

      if (!firstApprover) {
        return res.status(400).json({
          error: `No ${firstApproverRole} found in the system`,
        });
      }
    }

    console.log(
      `✅ First approver: ${firstApprover.name} (${firstApproverRole})`
    );

    // ✅ Process receipt image
    let receiptData = null;
    let receiptMimetype = null;
    let receiptFilename = null;

    if (req.file) {
      receiptData = bufferToBase64(req.file.buffer);
      receiptMimetype = req.file.mimetype;
      receiptFilename = req.file.originalname;
      console.log(
        `📸 Receipt uploaded: ${receiptFilename} (${receiptMimetype}), Size: ${req.file.size} bytes`
      );
    }

    // ✅ Parse date_of_expense
    let dateOfExpense = null;
    if (payload.date_of_expense) {
      const dateStr = payload.date_of_expense;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        dateOfExpense = dateStr;
      } else {
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          dateOfExpense = parsedDate.toISOString().split("T")[0];
        }
      }
      console.log("📅 Parsed date_of_expense:", dateOfExpense);
    }

    // ✅ Create the reimbursement
    const reimbursement = await Reimbursement.create({
      user_id: user.id,
      category: payload.category,
      type: payload.type || payload.merchant || payload.category,
      description: payload.description,
      items: payload.items,
      merchant: payload.merchant,
      total: payload.total,
      status: "Pending",
      current_approver: firstApproverRole,
      sap_code: payload.sap_code,
      date_of_expense: dateOfExpense,
      receipt_data: receiptData,
      receipt_mimetype: receiptMimetype,
      receipt_filename: receiptFilename,
      submitted_at: new Date(),
    });

    console.log("✅ Created reimbursement #", reimbursement.id);

    // ✅ Create approval records for all levels
    const approvalRecords = [];

    for (let i = 0; i < approvalFlow.length; i++) {
      const approverRole = approvalFlow[i];
<<<<<<< HEAD
      let potentialApprover;

      if (isInvoiceSpecialist) {
        // For Invoice Specialists, find any approver with the required role
        potentialApprover = allUsers.find((u) => u.role === approverRole);
      } else {
        potentialApprover = findApproverBySapCode(
          approverRole,
          payload.sap_code,
          allUsers
        );
=======
      let potentialApprover = null;
      
      // Find approver based on role
      if (i === 0) {
        // First approver already found above
        potentialApprover = firstApprover;
      } else {
        // Future approvers TBD
        potentialApprover = null;
>>>>>>> d9068ce5d15143245313495df18292d8a892c1d3
      }

      approvalRecords.push({
        reimbursement_id: reimbursement.id,
        approver_id: potentialApprover ? potentialApprover.id : null,
        approver_role: approverRole,
        approval_level: i + 1,
        status: "Pending",
        remarks: null,
        approved_at: null,
      });
    }

    await Approval.bulkCreate(approvalRecords);
    console.log(`✅ Created ${approvalRecords.length} approval records`);

    // 📧 Send email to FIRST APPROVER
    if (firstApprover) {
      try {
        const emailHtml = newSubmissionToApproverTemplate(
          {
            sap_code: reimbursement.sap_code,
            category: reimbursement.category,
            total: reimbursement.total,
            items: reimbursement.items,
            description: reimbursement.description,
            date_of_expense: dateOfExpense,
            submitted_at: reimbursement.submitted_at,
          },
          {
            name: user.name,
            role: user.role,
          },
          firstApprover.name
        );

        await sendEmail(
          firstApprover.email,
          `📢 New Reimbursement Request - ${reimbursement.sap_code}`,
          emailHtml
        );

        console.log(
          `📧 Submission notification email sent to ${firstApprover.name} (${firstApprover.email})`
        );
      } catch (emailError) {
<<<<<<< HEAD
        console.error(
          "❌ Failed to send submission notification email:",
          emailError
        );
        // Don't fail the submission if email fails
=======
        console.error('❌ Failed to send submission notification email:', emailError);
>>>>>>> d9068ce5d15143245313495df18292d8a892c1d3
      }
    }

    res.json({ reimbursement });
  } catch (err) {
    console.error("❌ Error creating reimbursement:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}

/**
 * ✅ Get current user's reimbursements with approval details
 */
export async function getUserReimbursements(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    console.log("📋 Fetching reimbursements for user:", user.name);

    const reimbursements = await Reimbursement.findAll({
      where: { user_id: user.id },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "role", "profile_picture"],
        },
        {
          model: Approval,
          as: "approvals",
          include: [
            {
              model: User,
              as: "approver",
              attributes: ["id", "name", "email", "role", "profile_picture"],
            },
          ],
          order: [["approval_level", "ASC"]],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    console.log(`✅ Found ${reimbursements.length} reimbursements`);

    const formattedReimbursements = reimbursements.map((r) => ({
      id: r.id,
      userId: r.user_id,
      user: r.user
        ? {
            id: r.user.id,
            name: r.user.name,
            email: r.user.email,
            role: r.user.role,
            profile_picture: r.user?.dataValues?.profile_picture,
          }
        : null,
      category: r.category,
      type: r.type,
      description: r.description,
      total: r.total,
      status: r.status,
      currentApprover: r.current_approver,
      sapCode: r.sap_code,
      date: r.date_of_expense
        ? new Date(r.date_of_expense).toISOString().split("T")[0]
        : null,
      receipt: r.receipt_data
        ? {
            data: r.receipt_data,
            mimetype: r.receipt_mimetype,
            filename: r.receipt_filename,
          }
        : null,
      submittedAt: r.submitted_at ? r.submitted_at.toISOString() : null,
      approvedAt: r.approved_at ? r.approved_at.toISOString() : null,
      merchant: r.merchant,
      items: r.items,
      extractedText: null,
      approvals: r.approvals || [],
    }));

    res.json(formattedReimbursements);
  } catch (err) {
    console.error("❌ Error fetching reimbursements:", err);
    res.status(500).json({ error: "Failed to fetch reimbursements" });
  }
}

/**
 * ✅ Get reimbursements pending current user's approval
 */
export async function getPendingApprovals(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    console.log("🔍 Fetching approvals for role:", user.role);

    // Fetch all reimbursements with approval data
    const allReimbursements = await Reimbursement.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "role", "profile_picture"],
        },
        {
          model: Approval,
          as: "approvals",
          include: [
            {
              model: User,
              as: "approver",
              attributes: ["id", "name", "email", "role", "profile_picture"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

<<<<<<< HEAD
    // ✅ Filter to only show reimbursements that have REACHED the user's approval level
    let filteredReimbursements = allReimbursements.filter((r) => {
      // Find the approval record for this user's role
      const userApproval = r.approvals.find(
        (a) => a.approver_role === user.role
      );
      if (!userApproval) return false;

      const previousApprovals = r.approvals.filter(
        (a) => a.approval_level < userApproval.approval_level
      );

      // ✅ CASE 1: User is current approver → show only if previous are approved
      if (userApproval.status === "Pending") {
        return previousApprovals.every((a) => a.status === "Approved");
      }

      // ✅ CASE 2: User already approved → ALWAYS allowed to see it
      if (userApproval.status === "Approved") {
        return true;
      }

      // ✅ CASE 3: Rejected or other → hide
      return false;
    });

    // ✅ If user is SUL or Account Manager, filter by SAP code
    if (["SUL", "Account Manager"].includes(user.role)) {
      const userSapCodes = [user.sap_code_1, user.sap_code_2].filter(Boolean);

      if (userSapCodes.length === 0) {
        console.log("⚠️ User has no SAP codes assigned");
        return res.json([]);
      }

      filteredReimbursements = filteredReimbursements.filter((r) =>
        userSapCodes.includes(r.sap_code)
=======
    // ✅ Filter to show reimbursements at user's approval level
    let filteredReimbursements = allReimbursements.filter(r => {
      const userApproval = r.approvals.find(a => a.approver_role === user.role);
      if (!userApproval) return false;

      const previousApprovals = r.approvals.filter(
        a => a.approval_level < userApproval.approval_level
      );

      // Show if pending and previous approved, OR if already approved by user
      if (userApproval.status === 'Pending') {
        return previousApprovals.every(a => a.status === 'Approved');
      }

      if (userApproval.status === 'Approved') {
        return true;
      }

      return false;
    });

    // ✅ Role-specific filtering
    if (user.role === "SUL") {
      // SUL sees only reimbursements where they are the assigned SUL
      filteredReimbursements = await Promise.all(
        filteredReimbursements.map(async (r) => {
          const employee = await User.findByPk(r.user_id, {
            include: [{ model: User, as: 'assignedSUL' }]
          });
          return employee?.assigned_sul_id === user.id ? r : null;
        })
      ).then(results => results.filter(Boolean));
      
      console.log("🔍 Filtering for SUL - showing only assigned employees");
      
    } else if (user.role === "Account Manager") {
      // Account Manager sees only reimbursements for SAP codes they MANAGE
      const managedSapCodes = await SapCode.findAll({
        where: { account_manager_id: user.id },
        attributes: ['code']
      });
      
      const managedCodes = managedSapCodes.map(sc => sc.code);
      
      if (managedCodes.length === 0) {
        console.log("⚠️ Account Manager has no managed SAP codes for approval");
        return res.json([]);
      }
      
      filteredReimbursements = filteredReimbursements.filter(r => 
        managedCodes.includes(r.sap_code)
>>>>>>> d9068ce5d15143245313495df18292d8a892c1d3
      );
      
      console.log("🔍 Filtering by Account Manager's managed SAP codes:", managedCodes);
    }

    console.log(
      `✅ Found ${filteredReimbursements.length} reimbursements at this approval level`
    );

    const formatted = filteredReimbursements.map((r) => ({
      id: r.id,
      userId: r.user_id,
      user: r.user
        ? {
            id: r.user.id,
            name: r.user.name,
            email: r.user.email,
            role: r.user.role,
            profile_picture: r.user?.dataValues?.profile_picture,
          }
        : null,
      category: r.category,
      type: r.type,
      description: r.description,
      total: r.total,
      status: r.status,
      currentApprover: r.current_approver,
      sapCode: r.sap_code,
      date: r.date_of_expense
        ? new Date(r.date_of_expense).toISOString().split("T")[0]
        : null,
      receipt: r.receipt_data
        ? {
            data: r.receipt_data,
            mimetype: r.receipt_mimetype,
            filename: r.receipt_filename,
          }
        : null,
      submittedAt: r.submitted_at ? r.submitted_at.toISOString() : null,
      merchant: r.merchant,
      items: r.items,
      extractedText: null,
      approvals: r.approvals || [],
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ Error fetching pending approvals:", err);
    res.status(500).json({ error: "Failed to fetch pending approvals" });
  }
}

/**
 * ✅ Get all reimbursements for Sales Director view
 */
export async function getPendingAllApprovals(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    console.log("🔍 Fetching pending approvals for role:", user.role);

    const whereClause = {
      status: ["Pending", "Approved", "Rejected"],
    };

    const reimbursements = await Reimbursement.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "role", "profile_picture"],
        },
        {
          model: Approval,
          as: "approvals",
          include: [
            {
              model: User,
              as: "approver",
              attributes: ["id", "name", "email", "role", "profile_picture"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    console.log(`✅ Found ${reimbursements.length} reimbursements`);

    const formatted = reimbursements.map((r) => ({
      id: r.id,
      userId: r.user_id,
      user: r.user
        ? {
            id: r.user.id,
            name: r.user.name,
            email: r.user.email,
            role: r.user.role,
            profile_picture: r.user?.dataValues?.profile_picture,
          }
        : null,
      category: r.category,
      type: r.type,
      description: r.description,
      total: r.total,
      status: r.status,
      currentApprover: r.current_approver,
      sapCode: r.sap_code,
      date: r.date_of_expense
        ? new Date(r.date_of_expense).toISOString().split("T")[0]
        : null,
      receipt: r.receipt_data
        ? {
            data: r.receipt_data,
            mimetype: r.receipt_mimetype,
            filename: r.receipt_filename,
          }
        : null,
      submittedAt: r.submitted_at ? r.submitted_at.toISOString() : null,
      merchant: r.merchant,
      items: r.items,
      extractedText: null,
      approvals: r.approvals || [],
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ Error fetching all reimbursements:", err);
    res.status(500).json({ error: "Failed to fetch reimbursements" });
  }
}

/**
 * ✅ Update reimbursement status (approve/reject)
 */
export async function updateReimbursementStatus(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const reimbursementId = req.params.id;
    const { action, remarks } = req.body;

    console.log(
      `🔄 User ${user.name} (${user.role}) attempting to ${action} reimbursement #${reimbursementId}`
    );

    const reimbursement = await Reimbursement.findByPk(reimbursementId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "role"],
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
          order: [["approval_level", "ASC"]],
        },
      ],
    });

    if (!reimbursement) {
      return res.status(404).json({ error: "Reimbursement not found" });
    }

    if (reimbursement.current_approver !== user.role) {
      return res.status(403).json({
        error: "You are not authorized to approve this reimbursement",
        currentApprover: reimbursement.current_approver,
        yourRole: user.role,
      });
    }

<<<<<<< HEAD
    if (["SUL", "Account Manager"].includes(user.role)) {
      const userSapCodes = [user.sap_code_1, user.sap_code_2].filter(Boolean);

      if (!userSapCodes.includes(reimbursement.sap_code)) {
        return res.status(403).json({
          error: "This reimbursement is assigned to a different SAP code",
          reimbursementSapCode: reimbursement.sap_code,
          yourSapCodes: userSapCodes,
=======
    // ✅ Role-specific authorization checks
    if (user.role === "SUL") {
      const employee = await User.findByPk(reimbursement.user_id, {
        include: [{ model: User, as: 'assignedSUL' }]
      });
      
      if (employee.assigned_sul_id !== user.id) {
        return res.status(403).json({ 
          error: "This reimbursement is assigned to a different SUL",
          assignedSUL: employee.assignedSUL?.name || "Unknown"
        });
      }
    } else if (user.role === "Account Manager") {
      // Verify this AM MANAGES the SAP code (not just has it assigned)
      const sapCode = await SapCode.findOne({
        where: { code: reimbursement.sap_code }
      });
      
      if (!sapCode || sapCode.account_manager_id !== user.id) {
        return res.status(403).json({ 
          error: "You are not the Account Manager managing this SAP code",
          sapCode: reimbursement.sap_code
>>>>>>> d9068ce5d15143245313495df18292d8a892c1d3
        });
      }
    }

    const currentApproval = reimbursement.approvals.find(
      (a) => a.approver_role === user.role && a.status === "Pending"
    );

    if (!currentApproval) {
      return res.status(400).json({
        error: "No pending approval found for your role",
      });
    }

    if (action === "reject") {
      await currentApproval.update({
        status: "Rejected",
        approver_id: user.id,
        remarks: remarks || "Rejected",
        approved_at: new Date(),
      });

      await reimbursement.update({
        status: "Rejected",
        current_approver: null,
      });

      console.log(
        `❌ Reimbursement #${reimbursementId} rejected by ${user.name}`
      );

      return res.json({
        message: "Reimbursement rejected successfully",
        reimbursement: await Reimbursement.findByPk(reimbursementId, {
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "email", "role"],
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
        }),
      });
    }

    if (action === "approve") {
      await currentApproval.update({
        status: "Approved",
        approver_id: user.id,
        remarks: remarks || "Approved",
        approved_at: new Date(),
      });

      console.log(
        `✅ Approval level ${currentApproval.approval_level} completed by ${user.name}`
      );

      const nextApproval = reimbursement.approvals.find(
        (a) => a.approval_level === currentApproval.approval_level + 1
      );

      if (nextApproval) {
<<<<<<< HEAD
        const allUsers = await User.findAll();
        const nextApprover = findApproverBySapCode(
          nextApproval.approver_role,
          reimbursement.sap_code,
          allUsers
        );
=======
        // ✅ Find next approver based on role
        let nextApprover = null;
        
        if (nextApproval.approver_role === "Account Manager") {
          // Find AM who MANAGES this SAP code
          const sapCode = await SapCode.findOne({
            where: { code: reimbursement.sap_code },
            include: [{ model: User, as: 'accountManager' }]
          });
          nextApprover = sapCode ? sapCode.accountManager : null;
        } else {
          // Find any user with this role
          nextApprover = await User.findOne({ 
            where: { role: nextApproval.approver_role } 
          });
        }
>>>>>>> d9068ce5d15143245313495df18292d8a892c1d3

        if (nextApprover) {
          if (!nextApproval.approver_id) {
            await nextApproval.update({
              approver_id: nextApprover.id,
            });
          }

          await reimbursement.update({
            current_approver: nextApproval.approver_role,
          });

          console.log(
            `➡️ Moving to next approver: ${nextApprover.name} (${nextApproval.approver_role})`
          );
        } else {
<<<<<<< HEAD
          return res.status(500).json({
            error: `No ${nextApproval.approver_role} found with matching SAP code: ${reimbursement.sap_code}`,
=======
          return res.status(500).json({ 
            error: `No ${nextApproval.approver_role} found for next approval`
>>>>>>> d9068ce5d15143245313495df18292d8a892c1d3
          });
        }
      } else {
        await reimbursement.update({
          status: "Approved",
          current_approver: null,
          approved_at: new Date(),
        });

        console.log(`🎉 Reimbursement #${reimbursementId} FULLY APPROVED`);
      }

      return res.json({
        message: nextApproval
          ? "Approval recorded, moved to next approver"
          : "Reimbursement fully approved",
        reimbursement: await Reimbursement.findByPk(reimbursementId, {
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "email", "role", "profile_picture"],
            },
            {
              model: Approval,
              as: "approvals",
              include: [
                {
                  model: User,
                  as: "approver",
                  attributes: [
                    "id",
                    "name",
                    "email",
                    "role",
                    "profile_picture",
                  ],
                },
              ],
            },
          ],
        }),
      });
    }

    return res.status(400).json({
      error: "Invalid action. Must be 'approve' or 'reject'",
      receivedAction: action,
    });
  } catch (err) {
    console.error("❌ Error updating reimbursement status:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
