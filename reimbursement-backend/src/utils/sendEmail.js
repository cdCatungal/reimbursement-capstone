// reimbursement-backend/src/utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Send email using Nodemailer
 * Works with Gmail, Outlook, or any SMTP service
 */
export async function sendEmail(to, subject, html) {
  try {
    // Create transporter based on email service
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail', // 'gmail' or 'outlook'
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // App password, not your regular password
      },
    });

    // Email options
    const mailOptions = {
      from: {
        name: 'ERNIt Back System',
        address: process.env.EMAIL_USER
      },
      to: to,
      subject: subject,
      html: html,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${to}`);
    console.log(`Message ID: ${info.messageId}`);
    
    return info;
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    throw error;
  }
}

/**
 * Verify email configuration
 * Call this on server startup to check if email is configured correctly
 */
export async function verifyEmailConfig() {
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.verify();
    console.log("✅ Email configuration is valid and ready to send emails");
    return true;
  } catch (error) {
    console.error("❌ Email configuration error:", error.message);
    console.log("\n📝 Setup instructions:");
    console.log("1. Set EMAIL_USER in your .env file");
    console.log("2. Set EMAIL_PASSWORD (use App Password, not regular password)");
    console.log("3. Set EMAIL_SERVICE ('gmail' or 'outlook')");
    return false;
  }
}