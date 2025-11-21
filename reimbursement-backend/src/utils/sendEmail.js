import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();

// Create Mailjet SMTP transporter
const transporter = nodemailer.createTransport({
  host: "in-v3.mailjet.com",
  port: 2525, // or 8025, 587, 25
  secure: false,
  auth: {
    user: process.env.MJ_APIKEY_PUBLIC, // Your API Key from Mailjet
    pass: process.env.MJ_APIKEY_PRIVATE, // Your Secret Key from environment
  },
});

// reimbursement-backend/src/utils/sendEmail.js
import dotenv from "dotenv";
dotenv.config();

export async function sendEmail(to, subject, html, cc = null) {
  try {
    if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE) {
      throw new Error("Mailjet API keys missing");
    }

    const auth = Buffer.from(
      `${process.env.MJ_APIKEY_PUBLIC}:${process.env.MJ_APIKEY_PRIVATE}`
    ).toString("base64");

    // ✅ CRITICAL: Change from Gmail to verified domain
    const fromEmail =
      process.env.EMAIL_FROM || "noreply@your-verified-domain.com";
    const fromName =
      process.env.EMAIL_FROM_NAME || "ERNIt Reimbursement System";

    const emailData = {
      Messages: [
        {
          From: {
            Email: fromEmail, // NOT Gmail!
            Name: fromName,
          },
          To: [{ Email: to }],
          Subject: subject,
          TextPart: generatePlainText(html),
          HTMLPart: html,
        },
      ],
    };

    if (cc) {
      emailData.Messages[0].Cc = Array.isArray(cc)
        ? cc.map((email) => ({ Email: email }))
        : [{ Email: cc }];
    }

    console.log("📤 Sending via Mailjet API...");

    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(emailData),
    });

    const result = await response.json();

    if (result.Messages?.[0]?.Status === "success") {
      console.log("✅ Email sent via API");
      return { success: true, messageId: result.Messages[0].To[0].MessageID };
    } else {
      throw new Error(result.ErrorMessage || "Email failed");
    }
  } catch (error) {
    console.error("❌ Email failed:", error.message);
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
    if (!process.env.MJ_APIKEY_PRIVATE) {
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
