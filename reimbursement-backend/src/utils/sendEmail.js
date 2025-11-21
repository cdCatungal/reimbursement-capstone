import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();

// Create Mailjet SMTP transporter
const transporter = nodemailer.createTransport({
  host: "in-v3.mailjet.com",
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.MJ_APIKEY_PUBLIC, // Your API Key from Mailjet
    pass: process.env.MAILJET_SECRET_KEY, // Your Secret Key from environment
  },
});

export async function sendEmail(to, subject, html, cc = null) {
  try {
    const fromEmail = process.env.EMAIL_FROM || "noreply@yourdomain.com";
    const fromName =
      process.env.EMAIL_FROM_NAME || "ERNIt Reimbursement System";

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: to,
      subject: subject,
      html: html,
      text: generatePlainText(html),
    };

    if (cc) {
      mailOptions.cc = cc;
    }

    console.log("📤 Sending email via Mailjet SMTP:", {
      from: fromEmail,
      to: to,
      subject: subject,
      hasCC: !!cc,
    });

    const result = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully via Mailjet SMTP");
    console.log("📧 Message ID:", result.messageId);
    console.log("📨 Response:", result.response);

    return {
      success: true,
      messageId: result.messageId,
      service: "mailjet-smtp",
    };
  } catch (error) {
    console.error("❌ Mailjet SMTP email failed:", error.message);
    throw error;
  }
}

function generatePlainText(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p\s*\/?>/gi, "\n\n")
    .replace(/<h[1-6]\s*\/?>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export async function verifyEmailConfig() {
  try {
    if (!process.env.MAILJET_SECRET_KEY) {
      console.error("❌ Mailjet Secret Key missing");
      return false;
    }

    console.log("✅ Mailjet configuration present");
    console.log("📧 Sender email:", process.env.EMAIL_FROM);

    // Test SMTP connection
    await transporter.verify();
    console.log("✅ Mailjet SMTP connection successful");
    return true;
  } catch (error) {
    console.error("❌ Mailjet SMTP connection failed:", error.message);
    return false;
  }
}
