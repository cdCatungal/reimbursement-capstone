import dotenv from "dotenv";
import fetch from "node-fetch";
dotenv.config();

export async function sendEmail(to, subject, html, cc = null) {
  try {
    if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE) {
      throw new Error("Mailjet API keys missing");
    }

    const auth = Buffer.from(
      `${process.env.MJ_APIKEY_PUBLIC}:${process.env.MJ_APIKEY_PRIVATE}`
    ).toString("base64");

    // ✅ FIX 1: Use your verified domain email
    const fromEmail = process.env.EMAIL_FROM || "noreply@yourcompany.com"; // CHANGE THIS
    const fromName = process.env.EMAIL_FROM_NAME || "Your Company Name";

    // ✅ FIX 2: Add proper email headers
    const emailData = {
      Messages: [
        {
          From: {
            Email: fromEmail,
            Name: fromName,
          },
          To: [
            {
              Email: to,
              Name: to.split("@")[0], // Basic name from email
            },
          ],
          Subject: subject,
          TextPart: generatePlainText(html),
          HTMLPart: html,
          // ✅ FIX 3: Add critical headers
          Headers: {
            "List-Unsubscribe": `<mailto:unsubscribe@yourcompany.com?subject=Unsubscribe>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            "X-Mailer": "ERNIt-Reimbursement-System",
            Precedence: "bulk",
          },
          // ✅ FIX 4: Add custom ID for tracking
          CustomID: `reimbursement_${Date.now()}`,
        },
      ],
    };

    if (cc) {
      emailData.Messages[0].Cc = Array.isArray(cc)
        ? cc.map((email) => ({ Email: email, Name: email.split("@")[0] }))
        : [{ Email: cc, Name: cc.split("@")[0] }];
    }

    console.log("📤 Attempting to send email:", {
      from: fromEmail,
      to: to,
      subject: subject,
    });

    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(emailData),
    });

    const result = await response.json();

    console.log("📬 Mailjet Response Status:", response.status);

    if (!response.ok) {
      const errorMsg = result.ErrorMessage || JSON.stringify(result);
      console.error("❌ Mailjet API Error:", errorMsg);
      throw new Error(`Mailjet API error: ${response.status} - ${errorMsg}`);
    }

    if (result.Messages && result.Messages.length > 0) {
      const message = result.Messages[0];
      if (message.Status === "success") {
        console.log("✅ Email sent successfully to", to);
        console.log("📧 Message ID:", message.To[0].MessageID);
        return {
          success: true,
          messageId: message.To[0].MessageID,
          messageUUID: message.To[0].MessageUUID,
        };
      } else {
        const errors = message.Errors || [];
        console.error("❌ Email failed:", errors);
        throw new Error(`Email failed: ${JSON.stringify(errors)}`);
      }
    } else {
      console.error("❌ Unexpected response format:", result);
      throw new Error("Unexpected Mailjet response format");
    }
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    throw error;
  }
}

// ✅ FIX 5: Better plain text generation
function generatePlainText(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<p\s*\/?>/gi, "\n\n")
    .replace(/<h[1-6]\s*\/?>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function verifyEmailConfig() {
  try {
    if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE) {
      console.error("❌ MJ_APIKEY_PUBLIC and MJ_APIKEY_PRIVATE required");
      return false;
    }

    console.log("✅ Mailjet API keys present in environment");
    console.log(
      "📧 Using sender:",
      process.env.EMAIL_FROM || "ernitback@gmail.com"
    );

    // For Mailjet, just having the keys is often enough verification
    // You could test with a simple send if you want to be sure
    return true;
  } catch (error) {
    console.error("❌ Mailjet verification failed:", error.message);
    return false;
  }
}
