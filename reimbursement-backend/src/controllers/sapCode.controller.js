import { SapCode, User } from "../models/index.js";

/**
 * ✅ UPDATED: Get all SAP codes with Account Manager info
 */
export const getAllSapCodes = async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated"
      });
    }

    if (!["Admin", "Sales Director"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin or Sales Director role required."
      });
    }

    const sapCodes = await SapCode.findAll({
      include: [
        {
          model: User,
          as: 'accountManager',
          attributes: ['id', 'name', 'email', 'role']
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: sapCodes,
    });
  } catch (error) {
    console.error("Error fetching SAP codes:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * ✅ Get only Active SAP codes with Account Manager info
 */
export const getActiveSapCodes = async (req, res) => {
  try {
    const sapCodes = await SapCode.findAll({
      where: { status: "Active" },
      include: [
        {
          model: User,
          as: 'accountManager',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [["name", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      data: sapCodes,
    });
  } catch (error) {
    console.error("Error fetching active SAP codes:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * ✅ UPDATED: Create new SAP code with Account Manager assignment
 */
export const createSapCode = async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated" 
      });
    }

    if (!['Admin', 'Sales Director'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Admin or Sales Director role required." 
      });
    }

    const { code, name, description, status, account_manager_id } = req.body;

    // Validate required fields
    if (!code || !name) {
      return res.status(400).json({ 
        success: false, 
        message: "Code and name are required" 
      });
    }

    // Check if SAP code already exists
    const existingCode = await SapCode.findOne({ where: { code } });
    if (existingCode) {
      return res.status(400).json({ 
        success: false, 
        message: "SAP code already exists" 
      });
    }

    // ✅ NEW: Validate Account Manager if provided
    if (account_manager_id) {
      const accountManager = await User.findByPk(account_manager_id);
      if (!accountManager) {
        return res.status(400).json({
          success: false,
          message: "Account Manager not found"
        });
      }
      if (accountManager.role !== 'Account Manager') {
        return res.status(400).json({
          success: false,
          message: "Selected user is not an Account Manager"
        });
      }
    }

    const sapCode = await SapCode.create({
      code,
      name,
      description: description || null,
      status: status || 'Active',
      account_manager_id: account_manager_id || null
    });

    // Fetch the created SAP code with Account Manager info
    const sapCodeWithAM = await SapCode.findByPk(sapCode.id, {
      include: [
        {
          model: User,
          as: 'accountManager',
          attributes: ['id', 'name', 'email', 'role']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: "SAP code created successfully",
      data: sapCodeWithAM
    });
  } catch (error) {
    console.error("Error creating SAP code:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Server error" 
    });
  }
};

/**
 * ✅ UPDATED: Update SAP code with Account Manager assignment
 */
export const updateSapCode = async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated" 
      });
    }

    if (!['Admin', 'Sales Director'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Admin or Sales Director role required." 
      });
    }

    const { id } = req.params;
    const { code, name, description, status, account_manager_id } = req.body;

    const sapCode = await SapCode.findByPk(id);
    if (!sapCode) {
      return res.status(404).json({ 
        success: false, 
        message: "SAP code not found" 
      });
    }

    // If code is being changed, check if new code already exists
    if (code && code !== sapCode.code) {
      const existingCode = await SapCode.findOne({ where: { code } });
      if (existingCode) {
        return res.status(400).json({ 
          success: false, 
          message: "SAP code already exists" 
        });
      }
    }

    // ✅ NEW: Validate Account Manager if provided
    if (account_manager_id !== undefined) {
      if (account_manager_id !== null) {
        const accountManager = await User.findByPk(account_manager_id);
        if (!accountManager) {
          return res.status(400).json({
            success: false,
            message: "Account Manager not found"
          });
        }
        if (accountManager.role !== 'Account Manager') {
          return res.status(400).json({
            success: false,
            message: "Selected user is not an Account Manager"
          });
        }
      }
    }

    // Update fields
    const updateData = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (account_manager_id !== undefined) updateData.account_manager_id = account_manager_id;

    await sapCode.update(updateData);

    // Fetch updated SAP code with Account Manager info
    const sapCodeWithAM = await SapCode.findByPk(id, {
      include: [
        {
          model: User,
          as: 'accountManager',
          attributes: ['id', 'name', 'email', 'role']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: "SAP code updated successfully",
      data: sapCodeWithAM
    });
  } catch (error) {
    console.error("Error updating SAP code:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Server error" 
    });
  }
};

/**
 * ✅ Delete SAP code
 */
export const deleteSapCode = async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated" 
      });
    }

    if (!['Admin', 'Sales Director'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Admin or Sales Director role required." 
      });
    }

    const { id } = req.params;

    const sapCode = await SapCode.findByPk(id);
    if (!sapCode) {
      return res.status(404).json({ 
        success: false, 
        message: "SAP code not found" 
      });
    }

    await sapCode.destroy();

    res.status(200).json({
      success: true,
      message: "SAP code deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting SAP code:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message
    });
  }
};