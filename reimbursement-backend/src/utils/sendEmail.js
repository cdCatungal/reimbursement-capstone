// reimbursement-backend/src/utils/sendEmail.js
import dotenv from "dotenv";
dotenv.config();

/**
 * Send email using SendGrid API directly
 */
export async function sendEmail(to, subject, html, cc = null) {
  try {
    // Validate required environment variables
    if (!process.env.RENDER_API_KEY) {
      throw new Error("Render API key missing");
    }

    if (!process.env.EMAIL_FROM) {
      throw new Error("FROM email address not configured");
    }

    // Validate input parameters
    if (!to || !subject || !html) {
      throw new Error("Missing required parameters: to, subject, or html");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error(`Invalid recipient email format: ${to}`);
    }

    if (cc) {
      if (Array.isArray(cc)) {
        cc.forEach((email) => {
          if (!emailRegex.test(email)) {
            throw new Error(`Invalid CC email format: ${email}`);
          }
        });
      } else if (!emailRegex.test(cc)) {
        throw new Error(`Invalid CC email format: ${cc}`);
      }
    }

    // Generate message ID with your domain for better deliverability
    const messageId = `${Date.now()}.${Math.random()
      .toString(36)
      .substr(2, 9)}@${process.env.EMAIL_FROM.split("@")[1]}`;

    const emailData = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: subject,
          // ✅ ENHANCED HEADERS FOR BETTER DELIVERABILITY
          headers: {
            "X-Priority": "3",
            "X-Mailer": "ERNIt Reimbursement System",
            "List-Unsubscribe": `<mailto:unsubscribe@${
              process.env.EMAIL_FROM.split("@")[1]
            }?subject=unsubscribe>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            Precedence: "bulk",
            "Message-ID": `<${messageId}>`,
            "X-Entity-Ref-ID": `${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
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
      // ✅ OPTIMIZED TRACKING SETTINGS FOR DELIVERABILITY
      tracking_settings: {
        click_tracking: {
          enable: false, // Disabled to avoid spam filters
        },
        open_tracking: {
          enable: false, // Disabled to avoid spam filters
        },
        subscription_tracking: {
          enable: true,
          text: `If you would like to unsubscribe and stop receiving these emails, click here: <% %>.`,
          html: `<p>If you would like to unsubscribe and stop receiving these emails, <a href='<% %>'>click here</a>.</p>`,
        },
      },
      // ✅ ENHANCED MAIL SETTINGS FOR DELIVERABILITY
      mail_settings: {
        bypass_list_management: {
          enable: false, // Keep false to respect unsubscribe requests
        },
        footer: {
          enable: true, // Enable for legitimacy
          text: `\n\n${
            process.env.EMAIL_FROM_NAME || "ERNIt Reimbursement System"
          }\n${process.env.COMPANY_ADDRESS || ""}`,
          html: `<p><br><br>${
            process.env.EMAIL_FROM_NAME || "ERNIt Reimbursement System"
          }<br>${process.env.COMPANY_ADDRESS || ""}</p>`,
        },
        sandbox_mode: {
          enable: process.env.NODE_ENV === "development", // Test mode in dev
        },
        spam_check: {
          enable: true,
          threshold: 5, // 1-10, lower is more strict
          post_to_url: process.env.SPAM_WEBHOOK_URL || "", // Optional: Get spam reports
        },
      },
      // ✅ ADD CATEGORIES FOR BETTER TRACKING AND DELIVERABILITY
      categories: [
        "reimbursement",
        "transactional",
        process.env.NODE_ENV || "production",
      ],
      // ✅ ADD CUSTOM ARGS FOR INTERNAL TRACKING
      custom_args: {
        system: "ernit-reimbursement",
        environment: process.env.NODE_ENV || "production",
        user_type: "subscriber",
      },
      // ✅ IMPORTANT: SET SEND AT FOR RATE LIMITING
      send_at: Math.floor(Date.now() / 1000) + 1, // Send 1 second from now
    };

    // Add CC if provided
    if (cc) {
      emailData.personalizations[0].cc = Array.isArray(cc)
        ? cc.map((email) => ({ email }))
        : [{ email: cc }];
    }

    // ✅ USE RENDER API FOR AUTHENTICATION
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RENDER_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "ERNIt-Reimbursement-System/1.0",
      },
      body: JSON.stringify(emailData),
    });

    if (response.ok) {
      const messageId = response.headers.get("x-message-id");
      console.log(`✅ Email sent successfully to ${to}`, { messageId });

      return {
        success: true,
        messageId: messageId,
        renderMessageId: messageId, // Additional identifier for Render tracking
      };
    } else {
      const errorData = await response.json();
      console.error("SendGrid API Error:", {
        status: response.status,
        statusText: response.statusText,
        errors: errorData.errors,
      });

      // Handle specific SendGrid errors
      if (response.status === 403) {
        throw new Error(
          "Render API key authentication failed - check your API key permissions"
        );
      } else if (response.status === 429) {
        throw new Error("Rate limit exceeded - try again later");
      } else {
        throw new Error(
          `SendGrid API error: ${response.status} - ${JSON.stringify(
            errorData.errors
          )}`
        );
      }
    }
  } catch (error) {
    console.error("❌ Email sending error:", {
      message: error.message,
      to: to,
      subject: subject,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

// Helper function to generate plain text from HTML (keep your existing implementation)
// function generatePlainText(html) {
//   // Your existing implementation here
//   return html.replace(/<[^>]*>/g, '').trim();
// }

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
