import {
  User,
  SapCode,
  UserSapCode,
  Reimbursement,
  Approval,
} from "../models/index.js";
import { sendEmail } from "../utils/sendEmail.js";

/**
 * Get current user settings
 */
export const userSettings = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const user = await User.findByPk(req.user.id, {
      attributes: [
        "id",
        "email",
        "name",
        "role",
        "profilePicture",
        "authProvider",
        "created_at",
        "isActive",
      ],
      include: [
        {
          model: SapCode,
          as: "sapCodes",
          attributes: ["id", "code", "name"],
          through: { attributes: [] },
        },
        {
          model: User,
          as: "assignedSUL",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Get all users (Admin/Sales Director only)
 */
export const getAllUsers = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (!["Admin", "Sales Director"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin or Sales Director role required.",
      });
    }

    const users = await User.findAll({
      attributes: [
        "id",
        "email",
        "name",
        "role",
        "profilePicture",
        "authProvider",
        "isActive",
        "assigned_sul_id",
      ],
      include: [
        {
          model: SapCode,
          as: "sapCodes",
          attributes: ["id", "code", "name"],
          through: { attributes: [] },
        },
        {
          model: User,
          as: "assignedSUL",
          attributes: ["id", "name", "email", "role"],
        },
      ],
      order: [["name", "ASC"]],
    });

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * ✅ UPDATED: Update user with automatic pending approval reassignment
 */
export const updateUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (!["Admin", "Sales Director"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin or Sales Director role required.",
      });
    }

    const { id } = req.params;
    const { role, sap_code_ids, assigned_sul_id, isActive } = req.body;

    const user = await User.findByPk(id, {
      include: [
        {
          model: SapCode,
          as: "sapCodes",
          through: { attributes: [] },
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Store old values for comparison
    const oldAssignedSulId = user.assigned_sul_id;
    const oldRole = user.role;

    // ✅ NEW: Check if assigned_sul_id is changing for an Employee
    let pendingReassignments = [];

    if (
      assigned_sul_id !== undefined &&
      assigned_sul_id !== oldAssignedSulId &&
      user.role === "Employee"
    ) {
      console.log(
        `🔄 SUL assignment changing for ${user.name}: ${oldAssignedSulId} → ${assigned_sul_id}`,
      );

      // Find all pending reimbursements at SUL level for this employee
      const pendingSulApprovals = await Approval.findAll({
        where: {
          approver_role: "SUL",
          status: "Pending",
          approver_id: oldAssignedSulId, // Current SUL
        },
        include: [
          {
            model: Reimbursement,
            where: {
              user_id: user.id,
              status: "Pending",
            },
          },
        ],
      });

      if (pendingSulApprovals.length > 0 && assigned_sul_id !== null) {
        console.log(
          `📋 Found ${pendingSulApprovals.length} pending SUL approvals to reassign`,
        );

        // Get new SUL details
        const newSul = await User.findByPk(assigned_sul_id);

        if (!newSul || newSul.role !== "SUL") {
          return res.status(400).json({
            success: false,
            message: "Invalid SUL assignment",
          });
        }

        // Update all pending SUL approvals to new SUL
        for (const approval of pendingSulApprovals) {
          await approval.update({
            approver_id: assigned_sul_id,
          });

          pendingReassignments.push({
            reimbursementId: approval.reimbursement_id,
            oldApprover: oldAssignedSulId,
            newApprover: assigned_sul_id,
            role: "SUL",
          });
        }

        // Send email notification to new SUL
        try {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1976d2;">🔔 New Approval Assignments</h2>
              <p>Hello ${newSul.name},</p>
              <p>You have been assigned as the SUL for <strong>${user.name}</strong>.</p>
              <p>As a result, <strong>${pendingSulApprovals.length}</strong> pending reimbursement(s) have been reassigned to you for approval.</p>
              <p>Please review these reimbursements in your Approval Dashboard.</p>
              <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">This is an automated notification from the Reimbursement System.</p>
            </div>
          `;

          await sendEmail(
            newSul.email,
            `🔔 New Reimbursement Approvals Assigned to You`,
            emailHtml,
          );

          console.log(`📧 Notification sent to new SUL: ${newSul.email}`);
        } catch (emailError) {
          console.error("❌ Failed to send reassignment email:", emailError);
        }
      }
    }

    // Update basic user fields
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (assigned_sul_id !== undefined) user.assigned_sul_id = assigned_sul_id;

    await user.save();

    // Update SAP code assignments if provided
    if (sap_code_ids !== undefined) {
      if (Array.isArray(sap_code_ids) && sap_code_ids.length > 0) {
        // Remove existing assignments
        await UserSapCode.destroy({
          where: { user_id: user.id },
        });

        // Create new assignments
        const assignments = sap_code_ids.map((sapCodeId) => ({
          user_id: user.id,
          sap_code_id: sapCodeId,
        }));

        await UserSapCode.bulkCreate(assignments);
      } else {
        // Remove all SAP code assignments if empty array
        await UserSapCode.destroy({
          where: { user_id: user.id },
        });
      }
    }

    // Fetch updated user with associations
    const updatedUser = await User.findByPk(id, {
      attributes: [
        "id",
        "email",
        "name",
        "role",
        "profilePicture",
        "authProvider",
        "isActive",
        "assigned_sul_id",
      ],
      include: [
        {
          model: SapCode,
          as: "sapCodes",
          attributes: ["id", "code", "name"],
          through: { attributes: [] },
        },
        {
          model: User,
          as: "assignedSUL",
          attributes: ["id", "name", "email", "role"],
        },
      ],
    });

    const responseMessage =
      pendingReassignments.length > 0
        ? `User updated successfully. ${pendingReassignments.length} pending approval(s) reassigned to new SUL.`
        : "User updated successfully";

    res.status(200).json({
      success: true,
      message: responseMessage,
      data: updatedUser,
      reassignments:
        pendingReassignments.length > 0 ? pendingReassignments : undefined,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

/**
 * Delete user (Admin/Sales Director only)
 */
export const deleteUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (!["Admin", "Sales Director"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin or Sales Director role required.",
      });
    }

    const { id } = req.params;

    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has any reimbursements
    const reimbursementCount = await Reimbursement.count({
      where: { user_id: id },
    });

    if (reimbursementCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete user. This user has ${reimbursementCount} reimbursement(s) in the system. Consider deactivating the account instead.`,
      });
    }

    await user.destroy();

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
