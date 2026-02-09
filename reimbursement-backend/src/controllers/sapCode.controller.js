import { SapCode, User, Reimbursement, Approval } from "../models/index.js";
import { sendEmail } from "../utils/sendEmail.js";

/**
 * Get all SAP codes with Account Manager info
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
 * Get only Active SAP codes with Account Manager info
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
 * Create new SAP code with Account Manager assignment
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

    // Validate Account Manager if provided
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
 * ✅ UPDATED: Update SAP code with automatic pending approval reassignment
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

    const sapCode = await SapCode.findByPk(id, {
      include: [{
        model: User,
        as: 'accountManager',
        attributes: ['id', 'name', 'email']
      }]
    });

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

    // Store old Account Manager ID for comparison
    const oldAccountManagerId = sapCode.account_manager_id;

    // Validate Account Manager if provided
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

    // ✅ NEW: Check if Account Manager is changing
    let pendingReassignments = [];
    
    if (account_manager_id !== undefined && 
        account_manager_id !== oldAccountManagerId) {
      
      console.log(`🔄 Account Manager changing for SAP ${sapCode.code}: ${oldAccountManagerId} → ${account_manager_id}`);
      
      // Find all pending reimbursements at Account Manager level for this SAP code
      const pendingAmApprovals = await Approval.findAll({
        where: {
          approver_role: 'Account Manager',
          status: 'Pending',
          approver_id: oldAccountManagerId // Current AM
        },
        include: [{
          model: Reimbursement,
          where: {
            sap_code: sapCode.code,
            status: 'Pending'
          }
        }]
      });

      if (pendingAmApprovals.length > 0 && account_manager_id !== null) {
        console.log(`📋 Found ${pendingAmApprovals.length} pending AM approvals to reassign`);
        
        // Get new Account Manager details
        const newAm = await User.findByPk(account_manager_id);
        
        if (!newAm || newAm.role !== 'Account Manager') {
          return res.status(400).json({
            success: false,
            message: "Invalid Account Manager assignment"
          });
        }

        // Update all pending AM approvals to new AM
        for (const approval of pendingAmApprovals) {
          await approval.update({
            approver_id: account_manager_id
          });
          
          pendingReassignments.push({
            reimbursementId: approval.reimbursement_id,
            sapCode: sapCode.code,
            oldApprover: oldAccountManagerId,
            newApprover: account_manager_id,
            role: 'Account Manager'
          });
        }

        // Send email notification to new Account Manager
        try {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1976d2;">🔔 New Approval Assignments</h2>
              <p>Hello ${newAm.name},</p>
              <p>You have been assigned as the Account Manager for SAP Code: <strong>${sapCode.code} - ${sapCode.name}</strong>.</p>
              <p>As a result, <strong>${pendingAmApprovals.length}</strong> pending reimbursement(s) have been reassigned to you for approval.</p>
              <p>Please review these reimbursements in your Approval Dashboard.</p>
              <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">This is an automated notification from the Reimbursement System.</p>
            </div>
          `;
          
          await sendEmail(
            newAm.email,
            `🔔 New Reimbursement Approvals Assigned to You - ${sapCode.code}`,
            emailHtml
          );
          
          console.log(`📧 Notification sent to new AM: ${newAm.email}`);
        } catch (emailError) {
          console.error('❌ Failed to send reassignment email:', emailError);
        }

        // Optionally notify old Account Manager (if exists)
        if (oldAccountManagerId && sapCode.accountManager) {
          try {
            const oldAmEmailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f57c00;">ℹ️ SAP Code Reassignment</h2>
                <p>Hello ${sapCode.accountManager.name},</p>
                <p>You have been removed as the Account Manager for SAP Code: <strong>${sapCode.code} - ${sapCode.name}</strong>.</p>
                <p><strong>${pendingAmApprovals.length}</strong> pending reimbursement(s) have been reassigned to the new Account Manager: <strong>${newAm.name}</strong>.</p>
                <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">This is an automated notification from the Reimbursement System.</p>
              </div>
            `;
            
            await sendEmail(
              sapCode.accountManager.email,
              `ℹ️ SAP Code Reassignment Notification - ${sapCode.code}`,
              oldAmEmailHtml
            );
            
            console.log(`📧 Notification sent to old AM: ${sapCode.accountManager.email}`);
          } catch (emailError) {
            console.error('❌ Failed to send old AM notification:', emailError);
          }
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

    const responseMessage = pendingReassignments.length > 0
      ? `SAP code updated successfully. ${pendingReassignments.length} pending approval(s) reassigned to new Account Manager.`
      : "SAP code updated successfully";

    res.status(200).json({
      success: true,
      message: responseMessage,
      data: sapCodeWithAM,
      reassignments: pendingReassignments.length > 0 ? pendingReassignments : undefined
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