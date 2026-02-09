// reimbursement-backend/src/controllers/reimbursementController.js
import { Reimbursement, User, Approval, SapCode } from "../models/index.js";
import { sendEmail } from "../utils/sendEmail.js";
import { getApprovalFlow, findAssignedSUL } from "../utils/approvalFlow.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from "../config/cloudinary.js";
import { newSubmissionToApproverTemplate } from "../utils/emailTemplates.js";

/**
 * ✅ FIXED: Create new reimbursement with batch_code support
 */
export async function createReimbursement(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = req.user;
    const payload = req.body;

    console.log("📋 Creating reimbursement for user:", user.name, user.role);

    // ✅ ADDED: Generate or enhance batch_code
    let batchCode = null;

    if (payload.batch_timestamp) {
      // Frontend sent timestamp, create full batch code
      batchCode = `BATCH_${payload.batch_timestamp}_${user.id}`;
      console.log("📦 Generated batch_code from timestamp:", batchCode);
    } else if (payload.batch_code) {
      // Frontend sent full batch code, verify/enhance it
      const parts = payload.batch_code.split("_");

      // If batch_code is "BATCH_timestamp", add user ID
      if (parts.length === 2 && parts[0] === "BATCH") {
        batchCode = `${payload.batch_code}_${user.id}`;
        console.log("📦 Enhanced batch_code:", batchCode);
      } else {
        // Already has user ID, use as-is
        batchCode = payload.batch_code;
        console.log("📦 Using existing batch_code:", batchCode);
      }
    } else {
      // No batch code - single receipt submission
      batchCode = null;
      console.log("📦 No batch_code (single receipt)");
    }

    const bypassSapValidation = ["Invoice Specialist", "SUL"].includes(
      user.role,
    );

    // Validate SAP code
    if (!bypassSapValidation) {
      if (!payload.sap_code) {
        return res.status(400).json({ error: "SAP code is required" });
      }

      if (!payload.marketing_unit) {
        return res.status(400).json({ error: "Marketing unit is required" });
      }

      const userWithSapCodes = await User.findByPk(user.id, {
        include: [
          {
            model: SapCode,
            as: "sapCodes",
            where: { code: payload.sap_code },
            required: false,
          },
        ],
      });

      if (!userWithSapCodes || userWithSapCodes.sapCodes.length === 0) {
        return res.status(400).json({
          error: `Invalid SAP code. You can only submit reimbursements with your assigned SAP codes.`,
        });
      }

      console.log(
        `✅ ${user.role} ${user.name} validated for SAP code: ${payload.sap_code}`,
      );
    } else {
      if (!payload.sap_code) {
        payload.sap_code =
          user.role === "Invoice Specialist"
            ? "INVOICE_SPECIALIST"
            : "SUL_DIRECT";
      }
      console.log(
        `✅ ${user.role} submission - bypassing SAP code validation (using: ${payload.sap_code})`,
      );
    }

    // Parse category-specific fields
    const numPeople = payload.number_of_people
      ? parseInt(payload.number_of_people)
      : 1;
    const numDays = payload.number_of_days
      ? parseInt(payload.number_of_days)
      : 1;
    const totalAmount = parseFloat(payload.total);

    // Calculate reimbursable amount
    const CATEGORY_LIMITS = {
      "Overtime Meal": 300,
      "Meal with Client": 800,
      Accomodation: 2500,
    };

    let calculatedReimbursable = totalAmount;

    if (payload.category === "Overtime Meal") {
      calculatedReimbursable = Math.min(
        totalAmount,
        CATEGORY_LIMITS["Overtime Meal"],
      );
    } else if (payload.category === "Meal with Client") {
      calculatedReimbursable = Math.min(
        totalAmount,
        CATEGORY_LIMITS["Meal with Client"] * numPeople,
      );
    } else if (payload.category === "Accomodation") {
      calculatedReimbursable = Math.min(
        totalAmount,
        CATEGORY_LIMITS["Accomodation"] * numDays,
      );
    }

    console.log(
      `💰 Total: ₱${totalAmount}, Reimbursable: ₱${calculatedReimbursable}`,
    );

    // Get approval flow
    const approvalFlow = getApprovalFlow(user.role);

    if (!approvalFlow || approvalFlow.length === 0) {
      return res.status(400).json({
        error: "No approval flow defined for your role",
      });
    }

    // Find first approver
    let firstApprover = null;
    const firstApproverRole = approvalFlow[0];

    if (firstApproverRole === "SUL") {
      const employeeWithSUL = await User.findByPk(user.id, {
        include: [{ model: User, as: "assignedSUL" }],
      });

      firstApprover = findAssignedSUL(employeeWithSUL);

      if (!firstApprover || !firstApprover.id) {
        return res.status(400).json({
          error: `No SUL assigned to you. Please contact Sales Director to assign a SUL.`,
        });
      }

      if (!firstApprover.email) {
        firstApprover = await User.findByPk(firstApprover.id);
      }
    } else if (firstApproverRole === "Account Manager") {
      const sapCodeWithAM = await SapCode.findOne({
        where: { code: payload.sap_code },
        include: [{ model: User, as: "accountManager" }],
      });

      firstApprover = sapCodeWithAM ? sapCodeWithAM.accountManager : null;

      if (!firstApprover) {
        return res.status(400).json({
          error: `No Account Manager assigned to SAP Code: ${payload.sap_code}`,
        });
      }
    } else {
      firstApprover = await User.findOne({
        where: { role: firstApproverRole },
      });

      if (!firstApprover) {
        return res.status(400).json({
          error: `No ${firstApproverRole} found in the system`,
        });
      }
    }

    console.log(
      `✅ First approver: ${firstApprover.name} (${firstApproverRole})`,
    );

    // ✅ Upload receipt to Cloudinary
    let receiptUrl = null;
    let receiptPublicId = null;
    let receiptMimetype = null;
    let receiptFilename = null;

    if (req.file) {
      try {
        console.log(
          `📤 Uploading to Cloudinary: ${req.file.originalname} (${req.file.mimetype})`,
        );

        // Determine resource type (image or raw for PDFs)
        const resourceType =
          req.file.mimetype === "application/pdf" ? "raw" : "image";

        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          process.env.CLOUDINARY_FOLDER || "reimbursement-receipts",
          resourceType,
        );

        receiptUrl = uploadResult.secure_url;
        receiptPublicId = uploadResult.public_id;
        receiptMimetype = req.file.mimetype;
        receiptFilename = req.file.originalname;

        console.log(`✅ Cloudinary upload successful: ${receiptUrl}`);
      } catch (uploadError) {
        console.error("❌ Cloudinary upload failed:", uploadError);
        return res.status(500).json({
          error: "Failed to upload receipt to cloud storage",
          details: uploadError.message,
        });
      }
    }

    // Parse date
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
    }

    // ✅ FIXED: Create reimbursement WITH batch_code
    const reimbursement = await Reimbursement.create({
      user_id: user.id,
      category: payload.category,
      type: payload.type || payload.merchant || payload.category,
      description: payload.description,
      items: payload.items,
      merchant: payload.merchant,
      total: payload.total,
      reimbursable_amount: calculatedReimbursable,
      number_of_people:
        payload.category === "Meal with Client" ? numPeople : null,
      number_of_days: payload.category === "Accomodation" ? numDays : null,
      status: "Pending",
      current_approver: firstApproverRole,
      sap_code: payload.sap_code,
      marketing_unit: payload.marketing_unit,
      date_of_expense: dateOfExpense,
      receipt_url: receiptUrl,
      receipt_public_id: receiptPublicId,
      receipt_mimetype: receiptMimetype,
      receipt_filename: receiptFilename,
      batch_code: batchCode, // ✅ Use generated/enhanced batch_code
      submitted_at: new Date(),
     
    });

    console.log(
      "✅ Created reimbursement #",
      reimbursement.id,
      "with batch_code:",
      reimbursement.batch_code,
    );

    // Create approval records
    const approvalRecords = [];

    for (let i = 0; i < approvalFlow.length; i++) {
      const approverRole = approvalFlow[i];
      let potentialApprover = null;

      if (i === 0) {
        potentialApprover = firstApprover;
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

    // Send email notification
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
            reimbursable_amount: reimbursement.reimbursable_amount,
          },
          {
            name: user.name,
            role: user.role,
          },
          firstApprover.name,
        );

        await sendEmail(
          firstApprover.email,
          `📢 New Reimbursement Request - ${reimbursement.sap_code}`,
          emailHtml,
        );

        console.log(`📧 Notification sent to ${firstApprover.name}`);
      } catch (emailError) {
        console.error("❌ Failed to send email:", emailError);
      }
    }
    res.json({
      reimbursement: {
        id: reimbursement.id,
        batch_code: reimbursement.batch_code,
        status: reimbursement.status,
        total: reimbursement.total,
      },
    });
  } catch (err) {
    console.error("❌ Error creating reimbursement:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}

/**
 * ✅ Get user reimbursements with Cloudinary URLs
 */
export async function getUserReimbursements(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

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
      reimbursable_amount: r.reimbursable_amount,
      status: r.status,
      currentApprover: r.current_approver,
      sapCode: r.sap_code,
      marketing_unit: r.marketing_unit,
      date: r.date_of_expense
        ? new Date(r.date_of_expense).toISOString().split("T")[0]
        : null,
      receipt: r.receipt_url
        ? {
            url: r.receipt_url,
            mimetype: r.receipt_mimetype,
            filename: r.receipt_filename,
          }
        : null,
      submittedAt: r.submitted_at ? r.submitted_at.toISOString() : null,
      approvedAt: r.approved_at ? r.approved_at.toISOString() : null,
      merchant: r.merchant,
      items: r.items,
      number_of_people: r.number_of_people,
      number_of_days: r.number_of_days,
      batch_code: r.batch_code, // ✅ ADDED: Include batch_code in response
      approvals: r.approvals || [],
    }));

    res.json(formattedReimbursements);
  } catch (err) {
    console.error("❌ Error fetching reimbursements:", err);
    res.status(500).json({ error: "Failed to fetch reimbursements" });
  }
}

/**
 * ✅ Get pending approvals with batch_code
 */
export async function getPendingApprovals(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

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

    let filteredReimbursements = allReimbursements.filter((r) => {
      const userApproval = r.approvals.find(
        (a) => a.approver_role === user.role,
      );
      if (!userApproval) return false;

      const previousApprovals = r.approvals.filter(
        (a) => a.approval_level < userApproval.approval_level,
      );

      if (userApproval.status === "Pending") {
        return previousApprovals.every((a) => a.status === "Approved");
      }

      if (userApproval.status === "Approved") {
        return true;
      }

      return false;
    });

    if (user.role === "SUL") {
      filteredReimbursements = await Promise.all(
        filteredReimbursements.map(async (r) => {
          const employee = await User.findByPk(r.user_id, {
            include: [{ model: User, as: "assignedSUL" }],
          });
          return employee?.assigned_sul_id === user.id ? r : null;
        }),
      ).then((results) => results.filter(Boolean));
    } else if (user.role === "Account Manager") {
      const managedSapCodes = await SapCode.findAll({
        where: { account_manager_id: user.id },
        attributes: ["code"],
      });

      const managedCodes = managedSapCodes.map((sc) => sc.code);

      if (managedCodes.length === 0) {
        return res.json([]);
      }

      filteredReimbursements = filteredReimbursements.filter((r) =>
        managedCodes.includes(r.sap_code),
      );
    }

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
      reimbursable_amount: r.reimbursable_amount,
      status: r.status,
      currentApprover: r.current_approver,
      sapCode: r.sap_code,
      date: r.date_of_expense
        ? new Date(r.date_of_expense).toISOString().split("T")[0]
        : null,
      receipt: r.receipt_url
        ? {
            url: r.receipt_url,
            mimetype: r.receipt_mimetype,
            filename: r.receipt_filename,
          }
        : null,
      submittedAt: r.submitted_at ? r.submitted_at.toISOString() : null,
      merchant: r.merchant,
      items: r.items,
      number_of_people: r.number_of_people,
      number_of_days: r.number_of_days,
      batch_code: r.batch_code, // ✅ ADDED
      approvals: r.approvals || [],
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ Error fetching pending approvals:", err);
    res.status(500).json({ error: "Failed to fetch pending approvals" });
  }
}

export async function getPendingAllApprovals(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const reimbursements = await Reimbursement.findAll({
      where: {
        status: ["Pending", "Approved", "Rejected"],
      },
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
      reimbursable_amount: r.reimbursable_amount,
      status: r.status,
      currentApprover: r.current_approver,
      sapCode: r.sap_code,
      marketing_unit: r.marketing_unit,
      date: r.date_of_expense
        ? new Date(r.date_of_expense).toISOString().split("T")[0]
        : null,
      receipt: r.receipt_url
        ? {
            url: r.receipt_url,
            mimetype: r.receipt_mimetype,
            filename: r.receipt_filename,
          }
        : null,
      submittedAt: r.submitted_at ? r.submitted_at.toISOString() : null,
      merchant: r.merchant,
      items: r.items,
      number_of_people: r.number_of_people,
      number_of_days: r.number_of_days,
      batch_code: r.batch_code, // ✅ ADDED
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
      `🔄 User ${user.name} (${user.role}) attempting to ${action} reimbursement #${reimbursementId}`,
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

    // ✅ Role-specific authorization checks
    if (user.role === "SUL") {
      const employee = await User.findByPk(reimbursement.user_id, {
        include: [{ model: User, as: "assignedSUL" }],
      });

      if (employee.assigned_sul_id !== user.id) {
        return res.status(403).json({
          error: "This reimbursement is assigned to a different SUL",
          assignedSUL: employee.assignedSUL?.name || "Unknown",
        });
      }
    } else if (user.role === "Account Manager") {
      const sapCode = await SapCode.findOne({
        where: { code: reimbursement.sap_code },
      });

      if (!sapCode || sapCode.account_manager_id !== user.id) {
        return res.status(403).json({
          error: "You are not the Account Manager managing this SAP code",
          sapCode: reimbursement.sap_code,
        });
      }
    }

    const currentApproval = reimbursement.approvals.find(
      (a) => a.approver_role === user.role && a.status === "Pending",
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
        `❌ Reimbursement #${reimbursementId} rejected by ${user.name}`,
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
        `✅ Approval level ${currentApproval.approval_level} completed by ${user.name}`,
      );

      const nextApproval = reimbursement.approvals.find(
        (a) => a.approval_level === currentApproval.approval_level + 1,
      );

      if (nextApproval) {
        let nextApprover = null;

        if (nextApproval.approver_role === "Account Manager") {
          const sapCode = await SapCode.findOne({
            where: { code: reimbursement.sap_code },
            include: [{ model: User, as: "accountManager" }],
          });
          nextApprover = sapCode ? sapCode.accountManager : null;
        } else {
          nextApprover = await User.findOne({
            where: { role: nextApproval.approver_role },
          });
        }

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
            `➡️ Moving to next approver: ${nextApprover.name} (${nextApproval.approver_role})`,
          );
        } else {
          return res.status(500).json({
            error: `No ${nextApproval.approver_role} found for next approval`,
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
