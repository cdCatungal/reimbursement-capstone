// reimbursement-backend/src/utils/sendEmail.js
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

    const emailData = {
      Messages: [
        {
          From: {
            Email: process.env.EMAIL_FROM || "ernitback@gmail.com",
            Name: process.env.EMAIL_FROM_NAME || "ERNIt Reimbursement System",
          },
          To: [
            {
              Email: to,
              Name: "", // Optional
            },
          ],
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

    console.log("📤 Attempting to send email:", {
      from: emailData.Messages[0].From.Email,
      to: to,
      subject: subject,
      hasCC: !!cc,
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

    // ✅ Detailed logging
    console.log("📬 Mailjet Response Status:", response.status);
    console.log("📬 Mailjet Full Response:", JSON.stringify(result, null, 2));

    // ✅ Check if email was actually sent
    if (!response.ok) {
      // API returned error
      const errorMsg = result.ErrorMessage || JSON.stringify(result);
      console.error("❌ Mailjet API Error:", errorMsg);
      throw new Error(`Mailjet API error: ${response.status} - ${errorMsg}`);
    }

    // Check message status
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
        // Status is not success
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
    console.error("Stack trace:", error.stack);
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
    if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE) {
      console.error("❌ Mailjet API keys missing");
      return false;
    }

    console.log("✅ Mailjet API keys present");
    console.log(
      "📧 Sender email:",
      process.env.EMAIL_FROM || "ernitback@gmail.com"
    );

    const auth = Buffer.from(
      `${process.env.MJ_APIKEY_PUBLIC}:${process.env.MJ_APIKEY_PRIVATE}`
    ).toString("base64");

    // Test API connectivity
    const response = await fetch("https://api.mailjet.com/v3/REST/sender", {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Mailjet API connection successful");
      console.log("📧 Available senders:", data.Count);
      return true;
    } else {
      const error = await response.json();
      console.error("❌ Mailjet API error:", error);
      return false;
    }
  } catch (error) {
    console.error("❌ Mailjet verification failed:", error.message);
    return false;
  }
}
