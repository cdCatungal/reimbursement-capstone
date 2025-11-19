// reimbursement-backend/src/utils/sendEmail.js
import dotenv from "dotenv";
import fetch from "node-fetch";
dotenv.config();

/**
 * Send email using SendGrid API directly
 */
// export async function sendEmail(to, subject, html, cc = null) {
//   try {
//     if (!process.env.SENDGRID_API_KEY) {
//       throw new Error("SendGrid API key missing");
//     }

//     const emailData = {
//       personalizations: [
//         {
//           to: [{ email: to }],
//           subject: subject,
//         },
//       ],
//       from: {
//         email: process.env.EMAIL_FROM || "ernitback@gmail.com",
//         name: process.env.EMAIL_FROM_NAME || "ERNIt Reimbursement System",
//       },
//       reply_to: {
//         email: process.env.EMAIL_FROM || "ernitback@gmail.com",
//         name: process.env.EMAIL_FROM_NAME || "ERNIt Reimbursement System",
//       },
//       content: [
//         {
//           // ✅ PLAIN TEXT MUST BE FIRST
//           type: "text/plain",
//           value: generatePlainText(html),
//         },
//         {
//           // ✅ HTML COMES SECOND
//           type: "text/html",
//           value: html,
//         },
//       ],
//     };

//     // Add CC if provided
//     if (cc) {
//       emailData.personalizations[0].cc = Array.isArray(cc)
//         ? cc.map((email) => ({ email }))
//         : [{ email: cc }];
//     }

//     const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(emailData),
//     });

//     if (response.ok) {
//       console.log(`✅ Email sent successfully to ${to}`);
//       return { success: true, messageId: response.headers.get("x-message-id") };
//     } else {
//       const errorText = await response.text();
//       throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
//     }
//   } catch (error) {
//     console.error("❌ SendGrid error:", error.message);
//     throw error;
//   }
// }

export async function sendEmail(to, subject, html, cc = null) {
  try {
    if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE) {
      throw new Error("Mailjet API keys missing");
    }

    // Create authentication header
    const auth = Buffer.from(
      `${process.env.MJ_APIKEY_PUBLIC}:${process.env.MJ_APIKEY_PRIVATE}`
    ).toString("base64");

    const emailData = {
      Messages: [
        {
          From: {
            Email: "ernitback@gmail.com", // Your verified sender
            Name: "ERNIt Reimbursement System",
          },
          To: [
            {
              Email: to,
            },
          ],
          Subject: subject,
          HTMLPart: html,
          TextPart: html.replace(/<[^>]*>/g, "").trim(),
        },
      ],
    };

    // Add CC if provided
    if (cc) {
      emailData.Messages[0].Cc = Array.isArray(cc)
        ? cc.map((email) => ({ Email: email }))
        : [{ Email: cc }];
    }

    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(emailData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✅ Email sent successfully to ${to}`);
      // return { success: true, messageId: result.headers.get("x-message-id") };
      return {
        success: true,
        messageId: response.headers.get("x-message-id"), // ✅ Use response.headers
      };
    } else {
      console.error("❌ Mailjet API error:", result);
      throw new Error(result.ErrorMessage || "Email sending failed");
    }
  } catch (error) {
    console.error("❌ Email error:", error.message);
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
