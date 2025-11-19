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
          // ✅ ADD THESE HEADERS FOR DELIVERABILITY
          headers: {
            "X-Priority": "3",
            "X-Mailer": "ERNIt Reimbursement System",
            "List-Unsubscribe": `<mailto:unsubscribe@ernit.com?subject=unsubscribe>`,
            Precedence: "bulk",
          },
        },
      ],
      from: {
        // ✅ CRITICAL: Use a proper domain email, not Gmail
        email: process.env.EMAIL_FROM || "reimbursements@yourdomain.com",
        name: process.env.EMAIL_FROM_NAME || "ERNIt Reimbursement System",
      },
      reply_to: {
        // ✅ Use a different reply-to address
        email: process.env.EMAIL_REPLY_TO || "support@yourdomain.com",
        name: process.env.EMAIL_FROM_NAME || "ERNIt Support",
      },
      content: [
        {
          type: "text/plain",
          value: generatePlainText(html),
        },
        {
          type: "text/html",
          value: html,
        },
      ],
      // ✅ ADD TRACKING SETTINGS (disable for better deliverability)
      tracking_settings: {
        click_tracking: {
          enable: false,
        },
        open_tracking: {
          enable: false,
        },
        subscription_tracking: {
          enable: true,
          text: "If you would like to unsubscribe and stop receiving these emails, click here: <% %>.",
          html: "<p>If you would like to unsubscribe and stop receiving these emails, <a href='<% %>'>click here</a>.</p>",
        },
      },
      // ✅ ADD MAIL SETTINGS
      mail_settings: {
        bypass_list_management: {
          enable: false,
        },
        footer: {
          enable: false,
        },
        sandbox_mode: {
          enable: process.env.NODE_ENV === "development", // Test mode in dev
        },
      },
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
      console.error("SendGrid API Response:", errorText);
      throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error("❌ SendGrid error:", error.message);
    throw error;
  }
}

/**
 * Generate plain text version from HTML (essential for deliverability)
 */
function generatePlainText(html) {
  // Simple HTML to text conversion
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p\s*\/?>/gi, "\n\n")
    .replace(/<h[1-6]\s*\/?>/gi, "\n\n")
    .replace(/<[^>]*>/g, "") // Remove all HTML tags
    .replace(/\n{3,}/g, "\n\n") // Limit consecutive newlines
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
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
      console.log(
        "📧 Using sender:",
        process.env.EMAIL_FROM || "ernitback@gmail.com"
      );
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
