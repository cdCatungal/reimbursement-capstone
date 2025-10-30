import { User } from "../models/index.js";

/**
 * Get current user's settings
 */
export const userSettings = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Remove sensitive data
    const userWithoutPassword = { ...user.toJSON() };
    delete userWithoutPassword.password;
    delete userWithoutPassword.id;

    res.status(200).json({
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error in user settings:", error);
    return res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Get all users (Admin only)
 */
export const getAllUsers = async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated" 
      });
    }

    // Check if user is Admin
    if (!['Admin', 'Sales Director'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Admin role required." 
      });
    }

    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message
    });
  }
};

/**
 * Update user (Admin only)
 */
export const updateUser = async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated" 
      });
    }

    // Check if user is Admin
    if (req.user.role !== 'Admin', 'Sales Director') {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Admin role required." 
      });
    }

    const { id } = req.params;
    const { role, sap_code_1, sap_code_2 } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Update fields
    const updateData = {};
    
    if (role !== undefined) {
      updateData.role = role;
    }

    // Handle SAP codes based on role
    const finalRole = role || user.role;
    const rolesWithoutSapCodes = ['Admin', 'Invoice Specialist', 'Sales Director', 'Finance Officer'];
    
    if (rolesWithoutSapCodes.includes(finalRole)) {
      // Clear SAP codes for roles that don't need them
      updateData.sap_code_1 = null;
      updateData.sap_code_2 = null;
    } else {
      // Update SAP codes for other roles
      if (sap_code_1 !== undefined) {
        updateData.sap_code_1 = sap_code_1 || null;
      }
      
      if (sap_code_2 !== undefined) {
        // Only Employee can have 2 SAP codes
        if (finalRole === 'Employee') {
          updateData.sap_code_2 = sap_code_2 || null;
        } else {
          updateData.sap_code_2 = null;
        }
      }
    }

    await user.update(updateData);

    // Fetch updated user without password
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Server error" 
    });
  }
};

/**
 * Delete user (Admin only)
 */
export const deleteUser = async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated" 
      });
    }

    // Check if user is Admin
    if (req.user.role !== 'Admin', 'Sales Director') {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Admin role required." 
      });
    }

    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        message: "You cannot delete your own account" 
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    await user.destroy();

    res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message
    });
  }
};