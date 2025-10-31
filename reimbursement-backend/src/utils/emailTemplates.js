// reimbursement-backend/src/utils/emailTemplates.js
/**
 * Email template for intermediate approval (not final)
 */
export const approvalProgressTemplate = (reimbursement, approverName, approverRole, nextApproverRole, approvalLevel) => {
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
            <p><span class="label">SAP Code:</span> ${reimbursement.sap_code}</p>
            <p><span class="label">Category:</span> ${reimbursement.category}</p>
            <p><span class="label">Amount:</span> <span class="amount">₱${parseFloat(reimbursement.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></p>
            <p><span class="label">Description:</span> ${reimbursement.items || reimbursement.description || 'N/A'}</p>
            <p><span class="label">Date of Expense:</span> ${reimbursement.date_of_expense ? new Date(reimbursement.date_of_expense).toLocaleDateString() : 'N/A'}</p>
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
export const finalApprovalTemplate = (reimbursement, approverName, approverRole) => {
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
          <p>Good day,</p>
          
          <div class="success-box">
            <h2 style="color: #4CAF50; margin: 0 0 10px 0;">✅ All Approvals Complete!</h2>
            <p style="margin: 0;">Your reimbursement request has been approved by all required approvers.</p>
          </div>
          
          <div class="details">
            <p><span class="label">SAP Code:</span> ${reimbursement.sap_code}</p>
            <p><span class="label">Category:</span> ${reimbursement.category}</p>
            <p><span class="label">Amount:</span> <span class="amount">₱${parseFloat(reimbursement.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></p>
            <p><span class="label">Description:</span> ${reimbursement.items || reimbursement.description || 'N/A'}</p>
            <p><span class="label">Date of Expense:</span> ${reimbursement.date_of_expense ? new Date(reimbursement.date_of_expense).toLocaleDateString() : 'N/A'}</p>
            <p><span class="label">Final Approved by:</span> ${approverName} (${approverRole})</p>
          </div>
          
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
export const rejectionTemplate = (reimbursement, approverName, approverRole, remarks, approvalLevel) => {
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
          <p>Good day,</p>
          <p>Unfortunately, your reimbursement request has been <strong>rejected</strong>.</p>
          
          <div class="details">
            <p><span class="label">SAP Code:</span> ${reimbursement.sap_code}</p>
            <p><span class="label">Category:</span> ${reimbursement.category}</p>
            <p><span class="label">Amount:</span> <span class="amount">₱${parseFloat(reimbursement.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></p>
            <p><span class="label">Description:</span> ${reimbursement.items || reimbursement.description || 'N/A'}</p>
            <p><span class="label">Date of Expense:</span> ${reimbursement.date_of_expense ? new Date(reimbursement.date_of_expense).toLocaleDateString() : 'N/A'}</p>
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