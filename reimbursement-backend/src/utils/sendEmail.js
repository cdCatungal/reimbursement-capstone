// reimbursement-backend/src/utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Send email using SendGrid with CC support
 * @param {string} to - Primary recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @param {string|string[]} cc - Optional CC recipients (single email or array)
 */
export async function sendEmail(to, subject, html, cc = null) {
  try {
    // Validate SendGrid configuration
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error(
        "SendGrid configuration missing. Please set SENDGRID_API_KEY in environment variables"
      );
    }

    // Create SendGrid transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: {
        user: "apikey", // Literally this string
        pass: process.env.SENDGRID_API_KEY,
      },
    });

    // Email options
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || "ERNIt Reimbursement System",
        address: process.env.EMAIL_FROM || "ernitback@gmail.com",
      },
      to: to,
      subject: subject,
      html: html,
    };

    // Add CC if provided
    if (cc) {
      if (Array.isArray(cc)) {
        mailOptions.cc = cc.filter((email) => email && email.trim()).join(", ");
      } else if (typeof cc === "string" && cc.trim()) {
        mailOptions.cc = cc;
      }

      if (mailOptions.cc) {
        console.log(`📧 CC: ${mailOptions.cc}`);
      }
    }

    console.log(`📧 Attempting to send email to: ${to}`);
    if (mailOptions.cc) {
      console.log(`   CC: ${mailOptions.cc}`);
    }

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent successfully to ${to}`);
    if (mailOptions.cc) {
      console.log(`   CC sent to: ${mailOptions.cc}`);
    }
    console.log(`   Message ID: ${info.messageId}`);

    return info;
  } catch (error) {
    console.error("❌ Error sending email:", error.message);

    // SendGrid specific error handling
    if (error.code === "EAUTH") {
      console.error(
        "❌ SendGrid authentication failed. Check your SENDGRID_API_KEY"
      );
      console.error("💡 Verify your API key in Render environment variables");
    } else if (error.code === "ECONNECTION" || error.code === "ESOCKET") {
      console.error("❌ Connection to SendGrid failed");
      console.error("💡 Check your internet connection and firewall settings");
    } else if (error.code === "ETIMEDOUT") {
      console.error("❌ SendGrid connection timeout");
      console.error("💡 This might be a temporary issue with SendGrid service");
    }

    throw error;
  }
}

/**
 * Verify SendGrid configuration
 */
export async function verifyEmailConfig() {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.error("❌ SendGrid configuration missing:");
      console.log(
        "   SENDGRID_API_KEY:",
        process.env.SENDGRID_API_KEY ? "✅ Set" : "❌ Missing"
      );
      console.log(
        "   EMAIL_FROM:",
        process.env.EMAIL_FROM || "ernitback@gmail.com (default)"
      );
      console.log(
        "   EMAIL_FROM_NAME:",
        process.env.EMAIL_FROM_NAME || "ERNIt Reimbursement System (default)"
      );
      console.log("\n📝 Setup instructions:");
      console.log("1. Set SENDGRID_API_KEY in Render environment variables");
      console.log("2. Optional: Set EMAIL_FROM for custom from address");
      console.log("3. Optional: Set EMAIL_FROM_NAME for custom display name");
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      auth: {
        user: "apikey",
        pass: process.env.SENDGRID_API_KEY,
      },
    });

    await transporter.verify();
    console.log("✅ SendGrid configuration is valid and ready to send emails");
    console.log(
      `   From: ${
        process.env.EMAIL_FROM_NAME || "ERNIt Reimbursement System"
      } <${process.env.EMAIL_FROM || "ernitback@gmail.com"}>`
    );
    return true;
  } catch (error) {
    console.error("❌ SendGrid configuration error:", error.message);

    if (error.code === "EAUTH") {
      console.error("\n❌ SendGrid Authentication Failed!");
      console.log("📝 Check these steps:");
      console.log(
        "   1. Verify SENDGRID_API_KEY in Render environment variables"
      );
      console.log("   2. Make sure the API key has 'Mail Send' permissions");
      console.log("   3. Check that your sender email is verified in SendGrid");
    }

    return false;
  }
}
