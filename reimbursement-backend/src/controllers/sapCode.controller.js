import { SapCode } from "../models/index.js";

/**
 * Get all SAP codes
 */
export const getAllSapCodes = async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated"
      });
    }

    // Only Admin and Sales Director can view the full SAP code list
    if (!["Admin", "Sales Director"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin or Sales Director role required."
      });
    }

    const sapCodes = await SapCode.findAll({
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
 * ✅ NEW: Get only Active SAP codes (no role restriction)
 */
export const getActiveSapCodes = async (req, res) => {
  try {
    const sapCodes = await SapCode.findAll({
      where: { status: "Active" },
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
 * Create new SAP code
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

    const { code, name, description, status } = req.body;

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

    const sapCode = await SapCode.create({
      code,
      name,
      description: description || null,
      status: status || 'Active'
    });

    res.status(201).json({
      success: true,
      message: "SAP code created successfully",
      data: sapCode
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
 * Update SAP code
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
    const { code, name, description, status } = req.body;

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

    // Update fields
    const updateData = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    await sapCode.update(updateData);

    res.status(200).json({
      success: true,
      message: "SAP code updated successfully",
      data: sapCode
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
 * Delete SAP code
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
