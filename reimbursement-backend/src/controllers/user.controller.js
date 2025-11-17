import { User, SapCode, UserSapCode } from "../models/index.js";
// import { Op } from "sequelize";

/**
 * Get current user's settings with SAP codes and assigned SUL
 */
export const userSettings = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: SapCode,
          as: "sapCodes",
          attributes: ["id", "code", "name"],
          through: { attributes: [] }, // Exclude junction table fields
        },
        {
          model: User,
          as: "assignedSUL",
          attributes: ["id", "name", "email"],
        },
      ],
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ data: user });
  } catch (error) {
    console.error("Error in user settings:", error);
    return res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Get all users with SAP codes and SUL assignments
 */
export const getAllUsers = async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (!["Admin", "Sales Director"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Admin role required. Your role: ${req.user.role}`,
      });
    }

    const users = await User.findAll({
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
        {
          model: SapCode,
          as: "managedSapCodes",
          attributes: ["id", "code", "name"],
        },
      ],
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
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
      error: error.message,
    });
  }
};

/**
 * ✅ UPDATED: Update user with multiple SAP codes and SUL assignment
 * Now supports Account Managers having assigned SAP codes
 */
export const updateUser = async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (!["Admin", "Sales Director"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    const { id } = req.params;
    const { role, sap_code_ids, assigned_sul_id, isActive } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updateData = {};

    if (role !== undefined) {
      updateData.role = role;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // ✅ Handle SUL assignment for Employees
    if (assigned_sul_id !== undefined) {
      if (assigned_sul_id !== null) {
        // Validate the SUL exists and is actually a SUL
        const sul = await User.findByPk(assigned_sul_id);
        if (!sul) {
          return res.status(400).json({
            success: false,
            message: "Assigned SUL not found",
          });
        }
        if (sul.role !== "SUL") {
          return res.status(400).json({
            success: false,
            message: "Selected user is not a SUL",
          });
        }
      }
      updateData.assigned_sul_id = assigned_sul_id;
    }

    await user.update(updateData);

    // ✅ UPDATED: Handle SAP codes for BOTH Employees AND Account Managers
    const finalRole = role || user.role;

    if (
      (finalRole === "Employee" || finalRole === "Account Manager") &&
      sap_code_ids !== undefined
    ) {
      // Clear existing SAP codes
      await UserSapCode.destroy({ where: { user_id: id } });

      // Add new SAP codes
      if (Array.isArray(sap_code_ids) && sap_code_ids.length > 0) {
        const sapCodeRecords = sap_code_ids.map((sap_code_id) => ({
          user_id: id,
          sap_code_id: sap_code_id,
        }));
        await UserSapCode.bulkCreate(sapCodeRecords);
      }
    } else if (
      [
        "SUL",
        "Sales Director",
        "Invoice Specialist",
        "Finance Officer",
        "Admin",
      ].includes(finalRole)
    ) {
      // These roles should NOT have SAP codes in junction table
      await UserSapCode.destroy({ where: { user_id: id } });

      // Clear SUL assignment if changing to non-Employee role
      if (finalRole !== "Employee") {
        updateData.assigned_sul_id = null;
      }
    }

    // Fetch updated user with associations
    const updatedUser = await User.findByPk(id, {
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
        {
          model: SapCode,
          as: "managedSapCodes",
          attributes: ["id", "code", "name"],
        },
      ],
      attributes: { exclude: ["password"] },
    });

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
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
 * Delete user
 */
export const deleteUser = async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (!["Admin", "Sales Director"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    const { id } = req.params;

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

    // UserSapCode entries will be auto-deleted by CASCADE
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
      error: error.message,
    });
  }
};
