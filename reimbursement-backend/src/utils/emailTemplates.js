// reimbursement-backend/src/utils/emailTemplates.js

/**
 * Email template for intermediate approval (not final)
 */

export const approvalProgressTemplate = (
  reimbursement,
  approverName,
  approverRole,
  nextApproverRole,
  approvalLevel
) => {
  const getTotal = () => {
    const total = parseFloat(reimbursement.total) || 0;
    const reimbursableAmount =
      parseFloat(reimbursement.reimbursable_amount) || 0;

    return total > reimbursableAmount
      ? reimbursement.reimbursable_amount
      : reimbursement.total;
  };
  const total = getTotal();
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Poppins', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #063679; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #063679; }
        .progress-box { background-color: #e3f2fd; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .amount { font-size: 24px; color: #063679; font-weight: bold; }
        .label { font-weight: 600; color: #555; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Poppins', Arial, sans-serif; }
        p { font-family: 'Poppins', Arial, sans-serif; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Approval Level ${approvalLevel} Completed</h1>
        </div>
        <div class="content">
          <p>Good day,</p>
          <p>Your reimbursement request has been approved by <strong>${approverName}</strong> (${approverRole}).</p>
          
          <div class="details">
            <p><span class="label">SAP Code:</span> ${
              reimbursement.sap_code
            }</p>
            <p><span class="label">Category:</span> ${
              reimbursement.category
            }</p>
            <p><span class="label">Amount:</span> <span class="amount">₱${parseFloat(
              total
            ).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></p>
            <p><span class="label">Receipt totals:</span> ${
              reimbursement.reimbursable_amount
            }</p>
            <p><span class="label">Description:</span> ${
              reimbursement.items || reimbursement.description || "N/A"
            }</p>
            <p><span class="label">Date of Expense:</span> ${
              reimbursement.date_of_expense
                ? new Date(reimbursement.date_of_expense).toLocaleDateString()
                : "N/A"
            }</p>
          </div>
          
          <div class="progress-box">
            <p style="margin: 0;"><span class="label">📍 Current Status:</span></p>
            <p style="margin: 10px 0 0 0;">Your request is now awaiting approval from: <strong>${nextApproverRole}</strong></p>
          </div>
          
          <p>We will notify you when the next approval is completed or if there are any changes to your request.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ERNIt Back System. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} ERNI Philippines. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Email template for final approval (all levels complete)
 */
export const finalApprovalTemplate = (
  reimbursement,
  approverName,
  approverRole
) => {
  const getTotal = () => {
    const total = parseFloat(reimbursement.total) || 0;
    const reimbursableAmount =
      parseFloat(reimbursement.reimbursable_amount) || 0;

    return total > reimbursableAmount
      ? reimbursement.reimbursable_amount
      : reimbursement.total;
  };
  const total = getTotal();
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Poppins', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #4CAF50; }
        .success-box { background-color: #d4edda; padding: 20px; margin: 20px 0; border-radius: 4px; text-align: center; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .amount { font-size: 28px; color: #4CAF50; font-weight: bold; }
        .label { font-weight: 600; color: #555; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Poppins', Arial, sans-serif; }
        p { font-family: 'Poppins', Arial, sans-serif; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Reimbursement Fully Approved!</h1>
        </div>
        <div class="content">
          <div class="success-box">
            <h2 style="color: #4CAF50; margin: 0 0 10px 0;">✅ All Approvals Complete!</h2>
            <p style="margin: 0;">Your reimbursement request has been approved by all required approvers.</p>
          </div>
          
          <div class="details">
            <p><span class="label">SAP Code:</span> ${
              reimbursement.sap_code
            }</p>
            <p><span class="label">Category:</span> ${
              reimbursement.category
            }</p>
            <p><span class="label">Amount:</span> <span class="amount">₱${parseFloat(
              total
            ).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></p>
            <p><span class="label">Receipt amount:</Cspan> ${
              reimbursement.reimbursable_amount
            }</p>
            <p><span class="label">Description:</Cspan> ${
              reimbursement.items || reimbursement.description || "N/A"
            }</p>
            <p><span class="label">Date of Expense:</span> ${
              reimbursement.date_of_expense
                ? new Date(reimbursement.date_of_expense).toLocaleDateString()
                : "N/A"
            }</p>
            <p><span class="label">Final Approved by:</span> ${approverName} (${approverRole})</p>
          </div>
          <p>Good day,</p>
          <p>Your reimbursement will be processed according to company policy and you will receive payment in the next payroll cycle.</p>
          <p>Thank you for using ERNIt Back!</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ERNIt Back System. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} ERNI Philippines. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Email template for rejection
 */
export const rejectionTemplate = (
  reimbursement,
  requesterName,
  approverName,
  approverRole,
  remarks,
  approvalLevel
) => {
  const getTotal = () => {
    const total = parseFloat(reimbursement.total) || 0;
    const reimbursableAmount =
      parseFloat(reimbursement.reimbursable_amount) || 0;

    return total > reimbursableAmount
      ? reimbursement.reimbursable_amount
      : reimbursement.total;
  };
  const total = getTotal();
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Poppins', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #A31C1E; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #A31C1E; }
        .remarks-box { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .amount { font-size: 24px; color: #555; font-weight: bold; }
        .label { font-weight: 600; color: #555; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Poppins', Arial, sans-serif; }
        p { font-family: 'Poppins', Arial, sans-serif; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Reimbursement Rejected at Level ${approvalLevel}</h1>
        </div>
        <div class="content">
          <p>Good day ${requesterName},</p>
          <p>Unfortunately, your reimbursement request has been <strong>rejected</strong>.</p>
          
          <div class="details">
            <p><span class="label">SAP Code:</span> ${
              reimbursement.sap_code
            }</p>
            <p><span class="label">Category:</span> ${
              reimbursement.category
            }</p>
            <p><span class="label">Amount:</span> <span class="amount">₱${parseFloat(
              total
            ).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></p>
            <p><span class="label">Receipt total:</span> ${
              reimbursement.total
            }</p>
            <p><span class="label">Description:</span> ${
              reimbursement.items || reimbursement.description || "N/A"
            }</p>
            <p><span class="label">Date of Expense:</span> ${
              reimbursement.date_of_expense
                ? new Date(reimbursement.date_of_expense).toLocaleDateString()
                : "N/A"
            }</p>
            <p><span class="label">Rejected by:</span> ${approverName} (${approverRole})</p>
          </div>
          
          <div class="remarks-box">
            <p style="margin: 0 0 10px 0;"><span class="label">📝 Reason for Rejection:</span></p>
            <p style="margin: 0;">${remarks}</p>
          </div>
          
          <p>If you have questions about this rejection, please contact ${approverName} or the HR department.</p>
          <p>You may submit a new reimbursement request with the necessary corrections.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ERNIt Back System. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} ERNI Philippines. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Email template for NEW reimbursement submission - sent to FIRST APPROVER
 */
export const newSubmissionToApproverTemplate = (
  reimbursement,
  requester,
  approverName
) => {
  const getTotal = () => {
    const total = parseFloat(reimbursement.total) || 0;
    const reimbursableAmount =
      parseFloat(reimbursement.reimbursable_amount) || 0;

    return total > reimbursableAmount
      ? reimbursement.reimbursable_amount
      : reimbursement.total;
  };
  const total = getTotal();

  console.log("obejct: ", reimbursement);
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Poppins', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #FF9800; }
        .action-box { background-color: #fff3e0; padding: 20px; margin: 20px 0; border-radius: 4px; text-align: center; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .amount { font-size: 24px; color: #FF9800; font-weight: bold; }
        .label { font-weight: 600; color: #555; }
        .button { background-color: #FF9800; color: white; padding: 12px 30px; text-decoration: none; display: inline-block; margin: 10px 0; border-radius: 4px; font-family: 'Poppins', Arial, sans-serif; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Poppins', Arial, sans-serif; }
        p { font-family: 'Poppins', Arial, sans-serif; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New Reimbursement Request</h1>
        </div>
        <div class="content">
          <p>Dear ${approverName},</p>
          <p>A new reimbursement request has been submitted and requires your approval.</p>
          
          <div class="details">
            <p><span class="label">Submitted by:</span> ${requester.name} (${
    requester.role
  })</p>
            <p><span class="label">SAP Code:</span> ${
              reimbursement.sap_code
            }</p>
            <p><span class="label">Category:</span> ${
              reimbursement.category
            }</p>
            <p><span class="label">Reimbursable Amount:</span> <span class="amount">₱${parseFloat(
              total
            ).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></p>
            <p><span class="label">Receipt total:</span> ${
              reimbursement.total
            }</p>
            <p><span class="label">Purpose:</span> ${
              reimbursement.items || "N/A"
            }</p>
            <p><span class="label">Description:</span> ${
              reimbursement.description || "N/A"
            }</p>
            <p><span class="label">Date of Expense:</span> ${
              reimbursement.date_of_expense
                ? new Date(reimbursement.date_of_expense).toLocaleDateString()
                : "N/A"
            }</p>
            <p><span class="label">Submitted on:</span> ${new Date(
              reimbursement.submitted_at
            ).toLocaleString()}</p>
          </div>
          
          <div class="action-box">
            <p style="margin: 0 0 15px 0; font-weight: bold;">⏰ Action Required</p>
            <p style="margin: 0 0 15px 0;">This request is waiting for your review and approval.</p>
            <a href="${
              process.env.CLIENT_URL
            }/dashboard" class="button" style="color: #ffffff !important; text-decoration: none;">Review Request</a>
          </div>
          
          <p>Please log in to the ERNIt Back system to review the complete details including the receipt and make your decision.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ERNIt Back System. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} ERNI Philippines. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Email template for notifying NEXT APPROVER after intermediate approval
 */
export const nextApproverNotificationTemplate = (
  reimbursement,
  requester,
  previousApprover,
  nextApproverName,
  approvalLevel
) => {
  const getTotal = () => {
    const total = parseFloat(reimbursement.total) || 0;
    const reimbursableAmount =
      parseFloat(reimbursement.reimbursable_amount) || 0;

    return total > reimbursableAmount
      ? reimbursement.reimbursable_amount
      : reimbursement.total;
  };
  const total = getTotal();
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Poppins', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #063679; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #063679; }
        .progress-box { background-color: #e3f2fd; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .action-box { background-color: #bbdefb; padding: 20px; margin: 20px 0; border-radius: 4px; text-align: center; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .amount { font-size: 24px; color: #063679; font-weight: bold; }
        .label { font-weight: 600; color: #555; }
        .button { background-color: #063679; color: white; padding: 12px 30px; text-decoration: none; display: inline-block; margin: 10px 0; border-radius: 4px; font-family: 'Poppins', Arial, sans-serif; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Poppins', Arial, sans-serif; }
        p { font-family: 'Poppins', Arial, sans-serif; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Reimbursement Ready for Your Review</h1>
        </div>
        <div class="content">
          <p>Dear ${nextApproverName},</p>
          <p>A reimbursement request has been approved at Level ${
            approvalLevel - 1
          } and now requires your approval.</p>
          
          <div class="progress-box">
            <p style="margin: 0 0 10px 0;"><span class="label">✅ Previous Approval:</span></p>
            <p style="margin: 0;">Approved by ${previousApprover.name} (${
    previousApprover.role
  })</p>
          </div>
          
          <div class="details">
            <p><span class="label">Submitted by:</span> ${requester.name} (${
    requester.role
  })</p>
            <p><span class="label">SAP Code:</span> ${
              reimbursement.sap_code
            }</p>
            <p><span class="label">Category:</span> ${
              reimbursement.category
            }</p>
            <p><span class="label">Reimbursable Amount:</span> <span class="amount">₱${parseFloat(
              total
            ).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></p>
            <p><span class="label">Receipt total:</span> ${
              reimbursement.reimbursable_amount
            }</p>
            <p><span class="label">Purpose:</span> ${
              reimbursement.items || "N/A"
            }</p>
            <p><span class="label">Description:</span> ${
              reimbursement.description || "N/A"
            }</p>
            <p><span class="label">Date of Expense:</span> ${
              reimbursement.date_of_expense
                ? new Date(reimbursement.date_of_expense).toLocaleDateString()
                : "N/A"
            }</p>
          </div>
          
          <div class="action-box">
            <p style="margin: 0 0 15px 0; font-weight: bold;">⏰ Your Approval Needed - Level ${approvalLevel}</p>
            <p style="margin: 0 0 15px 0;">This request is now waiting for your review.</p>
            <a href="${
              process.env.CLIENT_URL
            }/dashboard" class="button" style="color: #ffffff !important; text-decoration: none;">Review & Approve</a>
          </div>
          
          <p>Please review the complete request details including the receipt and approval history in the ERNIt Back system.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ERNIt Back System. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} ERNI Philippines. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Add these templates to your existing emailTemplates.js file

/**
 * ✅ NEW: Email template for new SUL assignment
 * @param {string} sulName - Name of the new SUL
 * @param {string} employeeName - Name of the employee assigned to them
 * @param {number} reimbursementCount - Number of pending reimbursements reassigned
 * @param {Array} reimbursements - Array of reimbursement objects with basic info
 */
export const newSulAssignmentTemplate = (
  sulName,
  employeeName,
  reimbursementCount,
  reimbursements = []
) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .header .icon {
          font-size: 48px;
          margin-bottom: 10px;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .info-box {
          background: #f5f5f5;
          border-left: 4px solid #1976d2;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .info-box strong {
          color: #1976d2;
          font-size: 16px;
        }
        .reimbursement-list {
          background: #fafafa;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .reimbursement-item {
          background: white;
          padding: 15px;
          margin: 10px 0;
          border-radius: 6px;
          border-left: 3px solid #1976d2;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .reimbursement-item:first-child {
          margin-top: 0;
        }
        .reimbursement-item strong {
          color: #1976d2;
          display: block;
          margin-bottom: 5px;
        }
        .reimbursement-item .detail {
          color: #666;
          font-size: 14px;
          margin: 3px 0;
        }
        .cta-button {
          display: inline-block;
          background: #1976d2;
          color: white;
          padding: 14px 28px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 600;
          text-align: center;
        }
        .cta-button:hover {
          background: #1565c0;
        }
        .footer {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 0 0 10px 10px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .divider {
          height: 1px;
          background: #e0e0e0;
          margin: 25px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="icon">🔔</div>
        <h1>New Employee Assignment</h1>
      </div>
      
      <div class="content">
        <p>Hello <strong>${sulName}</strong>,</p>
        
        <p>You have been assigned as the <strong>SUL (Section Unit Lead)</strong> for:</p>
        
        <div class="info-box">
          <strong>👤 ${employeeName}</strong>
        </div>
        
        ${
          reimbursementCount > 0
            ? `
          <p>As a result of this assignment, <strong>${reimbursementCount}</strong> pending reimbursement${
                reimbursementCount > 1 ? "s have" : " has"
              } been automatically reassigned to you for approval.</p>
          
          ${
            reimbursements.length > 0
              ? `
            <div class="reimbursement-list">
              <h3 style="margin-top: 0; color: #1976d2;">📋 Pending Reimbursements:</h3>
              ${reimbursements
                .map(
                  (r) => `
                <div class="reimbursement-item">
                  <strong>Reimbursement #${r.id}</strong>
                  <div class="detail">📁 Category: ${r.category}</div>
                  <div class="detail">💰 Amount: ₱${parseFloat(
                    r.total
                  ).toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}</div>
                  <div class="detail">🏢 SAP Code: ${r.sap_code}</div>
                  ${
                    r.date_of_expense
                      ? `<div class="detail">📅 Date: ${new Date(
                          r.date_of_expense
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}</div>`
                      : ""
                  }
                </div>
              `
                )
                .join("")}
            </div>
          `
              : ""
          }
          
          <div style="text-align: center;">
            <a href="${
              process.env.FRONTEND_URL || "http://localhost:5173"
            }/approvals" class="cta-button">
              📋 Review Pending Approvals
            </a>
          </div>
        `
            : `
          <p>This employee currently has no pending reimbursements awaiting your approval.</p>
        `
        }
        
        <div class="divider"></div>
        
        <p style="color: #666; font-size: 14px;">
          <strong>Your responsibilities as SUL include:</strong>
        </p>
        <ul style="color: #666; font-size: 14px;">
          <li>Review and approve/reject reimbursement requests from ${employeeName}</li>
          <li>Verify expense validity and compliance with company policies</li>
          <li>Provide timely feedback on submissions</li>
        </ul>
      </div>
      
      <div class="footer">
        <p style="margin: 5px 0;">This is an automated notification from the <strong>ERNIt Back Reimbursement System</strong></p>
        <p style="margin: 5px 0; color: #999;">If you have questions, please contact your Sales Director</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * ✅ NEW: Email template for new Account Manager assignment
 * @param {string} amName - Name of the new Account Manager
 * @param {Object} sapCode - SAP Code object { code, name }
 * @param {number} reimbursementCount - Number of pending reimbursements reassigned
 * @param {Array} reimbursements - Array of reimbursement objects with basic info
 */
export const newAccountManagerAssignmentTemplate = (
  amName,
  sapCode,
  reimbursementCount,
  reimbursements = []
) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .header .icon {
          font-size: 48px;
          margin-bottom: 10px;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .sap-code-box {
          background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
          border-left: 4px solid #2e7d32;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
        }
        .sap-code-box .code {
          color: #1b5e20;
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .sap-code-box .name {
          color: #2e7d32;
          font-size: 16px;
        }
        .reimbursement-list {
          background: #fafafa;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .reimbursement-item {
          background: white;
          padding: 15px;
          margin: 10px 0;
          border-radius: 6px;
          border-left: 3px solid #2e7d32;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .reimbursement-item:first-child {
          margin-top: 0;
        }
        .reimbursement-item strong {
          color: #2e7d32;
          display: block;
          margin-bottom: 5px;
        }
        .reimbursement-item .detail {
          color: #666;
          font-size: 14px;
          margin: 3px 0;
        }
        .reimbursement-item .submitter {
          background: #e8f5e9;
          padding: 5px 10px;
          border-radius: 4px;
          display: inline-block;
          margin-top: 5px;
          font-size: 13px;
          color: #1b5e20;
        }
        .cta-button {
          display: inline-block;
          background: #2e7d32;
          color: white;
          padding: 14px 28px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 600;
          text-align: center;
        }
        .cta-button:hover {
          background: #1b5e20;
        }
        .footer {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 0 0 10px 10px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .divider {
          height: 1px;
          background: #e0e0e0;
          margin: 25px 0;
        }
        .info-note {
          background: #fff3e0;
          border-left: 4px solid #f57c00;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          font-size: 14px;
          color: #e65100;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="icon">🔔</div>
        <h1>New SAP Code Assignment</h1>
      </div>
      
      <div class="content">
        <p>Hello <strong>${amName}</strong>,</p>
        
        <p>You have been assigned as the <strong>Account Manager</strong> for:</p>
        
        <div class="sap-code-box">
          <div class="code">🏢 ${sapCode.code}</div>
          <div class="name">${sapCode.name}</div>
        </div>
        
        ${
          reimbursementCount > 0
            ? `
          <p>As a result of this assignment, <strong>${reimbursementCount}</strong> pending reimbursement${
                reimbursementCount > 1 ? "s have" : " has"
              } been automatically reassigned to you for approval.</p>
          
          ${
            reimbursements.length > 0
              ? `
            <div class="reimbursement-list">
              <h3 style="margin-top: 0; color: #2e7d32;">📋 Pending Reimbursements:</h3>
              ${reimbursements
                .map(
                  (r) => `
                <div class="reimbursement-item">
                  <strong>Reimbursement #${r.id}</strong>
                  <div class="detail">📁 Category: ${r.category}</div>
                  <div class="detail">💰 Amount: ₱${parseFloat(
                    r.total
                  ).toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}</div>
                  ${
                    r.date_of_expense
                      ? `<div class="detail">📅 Date: ${new Date(
                          r.date_of_expense
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}</div>`
                      : ""
                  }
                  ${
                    r.user
                      ? `<div class="submitter">👤 ${r.user.name}</div>`
                      : ""
                  }
                </div>
              `
                )
                .join("")}
            </div>
          `
              : ""
          }
          
          <div style="text-align: center;">
            <a href="${
              process.env.FRONTEND_URL || "http://localhost:5173"
            }/approvals" class="cta-button">
              📋 Review Pending Approvals
            </a>
          </div>
        `
            : `
          <p>This SAP code currently has no pending reimbursements awaiting your approval.</p>
        `
        }
        
        <div class="divider"></div>
        
        <div class="info-note">
          <strong⚠️ Important:</strong> This assignment is for <strong>approval responsibilities</strong>. You can still submit your own reimbursements using any SAP codes assigned to you in the "Manage Users" section.
        </div>
        
        <p style="color: #666; font-size: 14px;">
          <strong>Your responsibilities as Account Manager include:</strong>
        </p>
        <ul style="color: #666; font-size: 14px;">
          <li>Review and approve/reject reimbursements using this SAP code</li>
          <li>Ensure expenses align with project/department budgets</li>
          <li>Verify documentation and compliance</li>
          <li>Provide timely decisions to maintain workflow</li>
        </ul>
      </div>
      
      <div class="footer">
        <p style="margin: 5px 0;">This is an automated notification from the <strong>ERNIt Back Reimbursement System</strong></p>
        <p style="margin: 5px 0; color: #999;">If you have questions, please contact your Sales Director</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * ✅ NEW: Email template for old Account Manager removal notification
 * @param {string} oldAmName - Name of the removed Account Manager
 * @param {Object} sapCode - SAP Code object { code, name }
 * @param {string} newAmName - Name of the new Account Manager
 * @param {number} reimbursementCount - Number of pending reimbursements reassigned
 */
export const oldAccountManagerRemovalTemplate = (
  oldAmName,
  sapCode,
  newAmName,
  reimbursementCount
) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #f57c00 0%, #e65100 100%);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .header .icon {
          font-size: 48px;
          margin-bottom: 10px;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .sap-code-box {
          background: #fff3e0;
          border-left: 4px solid #f57c00;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
        }
        .sap-code-box .code {
          color: #e65100;
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .sap-code-box .name {
          color: #f57c00;
          font-size: 16px;
        }
        .new-am-box {
          background: #e8f5e9;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .new-am-box strong {
          color: #2e7d32;
        }
        .footer {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 0 0 10px 10px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .divider {
          height: 1px;
          background: #e0e0e0;
          margin: 25px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="icon">ℹ️</div>
        <h1>SAP Code Reassignment</h1>
      </div>
      
      <div class="content">
        <p>Hello <strong>${oldAmName}</strong>,</p>
        
        <p>You have been <strong>removed</strong> as the Account Manager for:</p>
        
        <div class="sap-code-box">
          <div class="code">🏢 ${sapCode.code}</div>
          <div class="name">${sapCode.name}</div>
        </div>
        
        ${
          reimbursementCount > 0
            ? `
          <p><strong>${reimbursementCount}</strong> pending reimbursement${
                reimbursementCount > 1 ? "s that were" : " that was"
              } awaiting your approval ${
                reimbursementCount > 1 ? "have" : "has"
              } been reassigned to the new Account Manager.</p>
        `
            : `
          <p>There were no pending reimbursements to transfer.</p>
        `
        }
        
        <div class="new-am-box">
          <p style="margin: 0;">
            <strong>New Account Manager:</strong> ${newAmName}
          </p>
        </div>
        
        <div class="divider"></div>
        
        <p style="color: #666; font-size: 14px;">
          You no longer have approval responsibilities for this SAP code. If you believe this change was made in error, please contact your Sales Director.
        </p>
      </div>
      
      <div class="footer">
        <p style="margin: 5px 0;">This is an automated notification from the <strong>ERNIt Back Reimbursement System</strong></p>
        <p style="margin: 5px 0; color: #999;">If you have questions, please contact your Sales Director</p>
      </div>
    </body>
    </html>
  `;
};
