// src/controllers/reportController.js
import { Reimbursement, User, Approval } from "../models/index.js";
import { Op } from "sequelize";

/**
 * Export reimbursement report without duplicate rows
 * Returns one row per reimbursement (not per approval)
 */
export async function exportReimbursementReport(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Parse query parameters for filtering
    const {
      startDate,
      endDate,
      status,
      category,
      sapCode,
      userId,
      format = 'json' // json, csv, or excel
    } = req.query;

    console.log("📊 Generating report with filters:", {
      startDate,
      endDate,
      status,
      category,
      sapCode,
      userId,
      format
    });

    // Build where clause based on filters
    const whereClause = {};

    if (startDate) {
      whereClause.submitted_at = {
        ...whereClause.submitted_at,
        [Op.gte]: new Date(startDate)
      };
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      whereClause.submitted_at = {
        ...whereClause.submitted_at,
        [Op.lte]: endDateTime
      };
    }

    if (status && status !== 'All') {
      whereClause.status = status;
    }

    if (category && category !== 'All') {
      whereClause.category = category;
    }

    if (sapCode && sapCode !== 'All') {
      whereClause.sap_code = sapCode;
    }

    if (userId) {
      whereClause.user_id = userId;
    }

    // Role-based filtering
    if (user.role === 'Employee') {
      whereClause.user_id = user.id; // Only their own reimbursements
    } else if (['SUL', 'Account Manager'].includes(user.role)) {
      // Filter by SAP code for SUL and Account Manager
      const userSapCodes = [user.sap_code_1, user.sap_code_2].filter(Boolean);
      if (userSapCodes.length > 0) {
        whereClause.sap_code = userSapCodes;
      }
    }
    // Admin, Sales Director, Invoice Specialist, Finance Officer see all

    // Fetch reimbursements without joining approvals (to avoid duplicates)
    const reimbursements = await Reimbursement.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role']
        }
      ],
      order: [['submitted_at', 'DESC']],
      raw: false // Need model instances for proper serialization
    });

    console.log(`✅ Found ${reimbursements.length} reimbursements for report`);

    // For each reimbursement, get approval summary separately
    const reportData = await Promise.all(
      reimbursements.map(async (r) => {
        // Get approval status summary
        const approvals = await Approval.findAll({
          where: { reimbursement_id: r.id },
          include: [
            {
              model: User,
              as: 'approver',
              attributes: ['name', 'role']
            }
          ],
          order: [['approval_level', 'ASC']]
        });

        // Calculate approval metrics
        const totalApprovals = approvals.length;
        const approvedCount = approvals.filter(a => a.status === 'Approved').length;
        const rejectedCount = approvals.filter(a => a.status === 'Rejected').length;
        const pendingCount = approvals.filter(a => a.status === 'Pending').length;
        
        // Get current approver info
        const currentApproval = approvals.find(a => a.status === 'Pending');
        const currentApproverName = currentApproval?.approver?.name || 'N/A';
        
        // Get last action info
        const lastApproval = approvals
          .filter(a => a.status !== 'Pending')
          .sort((a, b) => new Date(b.approved_at) - new Date(a.approved_at))[0];
        
        const lastActionBy = lastApproval?.approver?.name || 'N/A';
        const lastActionDate = lastApproval?.approved_at 
          ? new Date(lastApproval.approved_at).toLocaleString()
          : 'N/A';

        return {
          // Reimbursement Details
          id: r.id,
          submittedAt: new Date(r.submitted_at).toLocaleString(),
          submittedDate: new Date(r.submitted_at).toLocaleDateString('en-CA'),
          
          // Employee Details
          employeeName: r.user?.name || 'N/A',
          employeeEmail: r.user?.email || 'N/A',
          employeeRole: r.user?.role || 'N/A',
          
          // Request Details
          sapCode: r.sap_code,
          category: r.category,
          description: r.description || '',
          items: r.items || '',
          merchant: r.merchant || '',
          amount: parseFloat(r.total),
          
          // Status
          status: r.status,
          currentApprover: r.current_approver || 'N/A',
          currentApproverName: currentApproverName,
          
          // Approval Progress
          approvalProgress: `${approvedCount}/${totalApprovals}`,
          approvedSteps: approvedCount,
          rejectedSteps: rejectedCount,
          pendingSteps: pendingCount,
          totalSteps: totalApprovals,
          
          // Last Action
          lastActionBy: lastActionBy,
          lastActionDate: lastActionDate,
          
          // Dates
          approvedAt: r.approved_at ? new Date(r.approved_at).toLocaleString() : 'N/A',
          
          // For detailed approval chain (optional)
          approvalChain: approvals.map(a => ({
            level: a.approval_level,
            role: a.approver_role,
            approverName: a.approver?.name || 'Pending',
            status: a.status,
            remarks: a.remarks || '',
            date: a.approved_at ? new Date(a.approved_at).toLocaleString() : 'N/A'
          }))
        };
      })
    );

    // Format response based on requested format
    if (format === 'csv') {
      return exportAsCSV(res, reportData);
    } else if (format === 'excel') {
      return exportAsExcel(res, reportData);
    } else {
      // Default JSON response
      return res.json({
        success: true,
        count: reportData.length,
        filters: {
          startDate,
          endDate,
          status,
          category,
          sapCode,
          userId
        },
        data: reportData
      });
    }
  } catch (err) {
    console.error("❌ Error generating report:", err);
    res.status(500).json({ 
      error: "Failed to generate report", 
      details: err.message 
    });
  }
}

/**
 * Export as CSV format
 */
function exportAsCSV(res, data) {
  const headers = [
    'ID',
    'Submitted Date',
    'Employee Name',
    'Employee Email',
    'Employee Role',
    'SAP Code',
    'Category',
    'Description',
    'Items',
    'Merchant',
    'Amount',
    'Status',
    'Current Approver',
    'Current Approver Name',
    'Approval Progress',
    'Approved Steps',
    'Rejected Steps',
    'Pending Steps',
    'Last Action By',
    'Last Action Date',
    'Approved At'
  ];

  const csvRows = [headers.join(',')];

  data.forEach(row => {
    const values = [
      row.id,
      row.submittedDate,
      escapeCsvValue(row.employeeName),
      escapeCsvValue(row.employeeEmail),
      row.employeeRole,
      row.sapCode,
      escapeCsvValue(row.category),
      escapeCsvValue(row.description),
      escapeCsvValue(row.items),
      escapeCsvValue(row.merchant),
      row.amount,
      row.status,
      row.currentApprover,
      escapeCsvValue(row.currentApproverName),
      row.approvalProgress,
      row.approvedSteps,
      row.rejectedSteps,
      row.pendingSteps,
      escapeCsvValue(row.lastActionBy),
      row.lastActionDate,
      row.approvedAt
    ];
    csvRows.push(values.join(','));
  });

  const csv = csvRows.join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=reimbursement_report_${Date.now()}.csv`);
  res.send(csv);
}

/**
 * Escape CSV values that contain commas, quotes, or newlines
 */
function escapeCsvValue(value) {
  if (!value) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Export as Excel format (requires xlsx library)
 */
function exportAsExcel(res, data) {
  // Note: You'll need to install 'xlsx' package: npm install xlsx
  try {
    const XLSX = require('xlsx');
    
    const worksheet = XLSX.utils.json_to_sheet(
      data.map(row => ({
        'ID': row.id,
        'Submitted Date': row.submittedDate,
        'Employee Name': row.employeeName,
        'Employee Email': row.employeeEmail,
        'Employee Role': row.employeeRole,
        'SAP Code': row.sapCode,
        'Category': row.category,
        'Description': row.description,
        'Items': row.items,
        'Merchant': row.merchant,
        'Amount': row.amount,
        'Status': row.status,
        'Current Approver': row.currentApprover,
        'Current Approver Name': row.currentApproverName,
        'Approval Progress': row.approvalProgress,
        'Approved Steps': row.approvedSteps,
        'Rejected Steps': row.rejectedSteps,
        'Pending Steps': row.pendingSteps,
        'Last Action By': row.lastActionBy,
        'Last Action Date': row.lastActionDate,
        'Approved At': row.approvedAt
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reimbursements');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=reimbursement_report_${Date.now()}.xlsx`);
    res.send(excelBuffer);
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: 'Failed to export as Excel', details: err.message });
  }
}

/**
 * Get summary statistics for dashboard
 */
export async function getReimbursementSummary(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const whereClause = {};

    // Role-based filtering
    if (user.role === 'Employee') {
      whereClause.user_id = user.id;
    } else if (['SUL', 'Account Manager'].includes(user.role)) {
      const userSapCodes = [user.sap_code_1, user.sap_code_2].filter(Boolean);
      if (userSapCodes.length > 0) {
        whereClause.sap_code = userSapCodes;
      }
    }

    // Get counts by status
    const [total, pending, approved, rejected] = await Promise.all([
      Reimbursement.count({ where: whereClause }),
      Reimbursement.count({ where: { ...whereClause, status: 'Pending' } }),
      Reimbursement.count({ where: { ...whereClause, status: 'Approved' } }),
      Reimbursement.count({ where: { ...whereClause, status: 'Rejected' } })
    ]);

    // Get total amounts
    const approvedReimbursements = await Reimbursement.findAll({
      where: { ...whereClause, status: 'Approved' },
      attributes: ['total']
    });

    const totalApprovedAmount = approvedReimbursements.reduce(
      (sum, r) => sum + parseFloat(r.total),
      0
    );

    res.json({
      success: true,
      summary: {
        total,
        pending,
        approved,
        rejected,
        totalApprovedAmount: totalApprovedAmount.toFixed(2)
      }
    });
  } catch (err) {
    console.error("❌ Error generating summary:", err);
    res.status(500).json({ error: "Failed to generate summary" });
  }
}