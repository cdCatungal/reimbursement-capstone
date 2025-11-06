// reimbursement-backend/src/utils/sendEmail.js
import dotenv from "dotenv";
dotenv.config();

/**
 * Send email using SendGrid API directly
 */
export async function sendEmail(to, subject, html, cc = null) {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error("SendGrid API key missing");
    }

    const emailData = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: subject,
        },
      ],
      from: {
        email: process.env.EMAIL_FROM || "ernitback@gmail.com",
        name: process.env.EMAIL_FROM_NAME || "ERNIt Reimbursement System",
      },
      content: [
        {
          type: "text/html",
          value: html,
        },
      ],
    };

    // Add CC if provided
    if (cc) {
      emailData.personalizations[0].cc = Array.isArray(cc)
        ? cc.map((email) => ({ email }))
        : [{ email: cc }];
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    if (response.ok) {
      console.log(`✅ Email sent successfully to ${to}`);
      return { success: true, messageId: response.headers.get("x-message-id") };
    } else {
      const errorText = await response.text();
      throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error("❌ SendGrid error:", error.message);
    throw error;
  }
}

/**
 * Verify SendGrid configuration
 */
export async function verifyEmailConfig() {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.error("❌ SENDGRID_API_KEY missing in environment variables");
      return false;
    }

    // Test API key by making a simple request
    const response = await fetch("https://api.sendgrid.com/v3/user/account", {
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      },
    });

    if (response.ok) {
      console.log("✅ SendGrid configuration is valid");
      return true;
    } else {
      console.error("❌ SendGrid API key invalid or insufficient permissions");
      return false;
    }
  } catch (error) {
    console.error("❌ SendGrid verification failed:", error.message);
    return false;
  }
}
