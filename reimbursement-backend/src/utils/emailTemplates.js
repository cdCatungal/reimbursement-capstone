// reimbursement-backend/src/utils/emailTemplates.js

export const reimbursementApprovedTemplate = (reimbursement, approverName, remarks) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #4CAF50; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .amount { font-size: 24px; color: #4CAF50; font-weight: bold; }
        .label { font-weight: bold; color: #555; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Reimbursement Approved!</h1>
        </div>
        <div class="content">
          <p>Good day,</p>
          <p>Your reimbursement request has been <strong>approved</strong>.</p>
          
          <div class="details">
            <p><span class="label">Request ID:</span> ${reimbursement.sap_code}</p>
            <p><span class="label">Category:</span> ${reimbursement.category}</p>
            <p><span class="label">Amount:</span> <span class="amount">₱${parseFloat(reimbursement.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></p>
            <p><span class="label">Description:</span> ${reimbursement.description || 'N/A'}</p>
            <p><span class="label">Date of Expense:</span> ${reimbursement.date_of_expense ? new Date(reimbursement.date_of_expense).toLocaleDateString() : 'N/A'}</p>
            ${remarks ? `<p><span class="label">Approver Remarks:</span> ${remarks}</p>` : ''}
            <p><span class="label">Approved by:</span> ${approverName}</p>
          </div>
          
          <p>Your reimbursement will be processed according to company policy.</p>
          <p>You can track the status of your request by logging into the ERNIt Back system.</p>
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

export const reimbursementRejectedTemplate = (reimbursement, approverName, remarks) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #f44336; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .amount { font-size: 24px; color: #555; font-weight: bold; }
        .label { font-weight: bold; color: #555; }
        .remarks-box { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Reimbursement Rejected</h1>
        </div>
        <div class="content">
          <p>Good day,</p>
          <p>Unfortunately, your reimbursement request has been <strong>rejected</strong>.</p>
          
          <div class="details">
            <p><span class="label">Request ID:</span> ${reimbursement.sap_code}</p>
            <p><span class="label">Category:</span> ${reimbursement.category}</p>
            <p><span class="label">Amount:</span> <span class="amount">₱${parseFloat(reimbursement.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></p>
            <p><span class="label">Description:</span> ${reimbursement.description || 'N/A'}</p>
            <p><span class="label">Date of Expense:</span> ${reimbursement.date_of_expense ? new Date(reimbursement.date_of_expense).toLocaleDateString() : 'N/A'}</p>
            <p><span class="label">Rejected by:</span> ${approverName}</p>
          </div>
          
          ${remarks ? `
          <div class="remarks-box">
            <p style="margin: 0;"><span class="label">Reason for Rejection:</span></p>
            <p style="margin: 10px 0 0 0;">${remarks}</p>
          </div>
          ` : ''}
          
          <p>If you have questions about this rejection, please contact your approver or HR department.</p>
          <p>You may submit a new request with the necessary corrections.</p>
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

export const reimbursementPendingTemplate = (reimbursement, nextApproverRole) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2196F3; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .amount { font-size: 24px; color: #2196F3; font-weight: bold; }
        .label { font-weight: bold; color: #555; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏳ Reimbursement Submitted</h1>
        </div>
        <div class="content">
          <p>Good day,</p>
          <p>Your reimbursement request has been successfully submitted and is now pending approval.</p>
          
          <div class="details">
            <p><span class="label">Request ID:</span> ${reimbursement.sap_code}</p>
            <p><span class="label">Category:</span> ${reimbursement.category}</p>
            <p><span class="label">Amount:</span> <span class="amount">₱${parseFloat(reimbursement.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></p>
            <p><span class="label">Description:</span> ${reimbursement.description || 'N/A'}</p>
            <p><span class="label">Date of Expense:</span> ${reimbursement.date_of_expense ? new Date(reimbursement.date_of_expense).toLocaleDateString() : 'N/A'}</p>
            <p><span class="label">Next Approver:</span> ${nextApproverRole}</p>
          </div>
          
          <p>We will notify you once your request has been reviewed.</p>
          <p>You can track the status of your request by logging into the ERNIt Back system.</p>
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