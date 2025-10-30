// src/utils/sendEmail.js
import dotenv from "dotenv";
import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import "isomorphic-fetch"; // needed for node fetch
dotenv.config();

// export async function sendEmail(to, subject, html) {
//   try {
//     // 1️⃣ Authenticate using app credentials
//     const credential = new ClientSecretCredential(
//       process.env.AZURE_TENANT_ID_1,
//       process.env.AZURE_CLIENT_ID,
//       process.env.AZURE_CLIENT_SECRET
//     );

//     const client = Client.initWithMiddleware({
//       authProvider: {
//         getAccessToken: async () => {
//           const tokenResponse = await credential.getToken(
//             "https://graph.microsoft.com/.default"
//           );
//           return tokenResponse.token;
//         },
//       },
//     });

//     // 2️⃣ Construct the message
//     const message = {
//       message: {
//         subject,
//         body: {
//           contentType: "HTML",
//           content: html,
//         },
//         toRecipients: [
//           {
//             emailAddress: { address: to },
//           },
//         ],
//       },
//       saveToSentItems: false,
//     };

//     // 3️⃣ Send the email
//     await client.api(`/users/${process.env.EMAIL_USER}/sendMail`).post(message);
//     console.log(`📧 Email sent to ${to}`);
//   } catch (err) {
//     console.error("❌ sendEmail (Graph API) failed:", err);
//     throw err;
//   }
// }

export async function sendEmail(to, subject, html) {
  try {
    console.log("🔧 sendEmail - Debug Info:");
    console.log("   Tenant ID:", process.env.AZURE_TENANT_ID_1);
    console.log("   Client ID:", process.env.AZURE_CLIENT_ID);
    console.log("   Email User:", process.env.EMAIL_USER);
    console.log("   Sending to:", to);

    // 1️⃣ Authenticate using app credentials
    const credential = new ClientSecretCredential(
      process.env.AZURE_TENANT_ID_1,
      process.env.AZURE_CLIENT_ID,
      process.env.AZURE_CLIENT_SECRET
    );

    const client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const tokenResponse = await credential.getToken(
            "https://graph.microsoft.com/.default"
          );
          console.log("   Token acquired successfully");
          return tokenResponse.token;
        },
      },
    });

    // 2️⃣ Construct the message
    const message = {
      message: {
        subject,
        body: {
          contentType: "HTML",
          content: html,
        },
        toRecipients: [
          {
            emailAddress: { address: to },
          },
        ],
      },
      saveToSentItems: false,
    };

    console.log("   Attempting to send email via Graph API...");

    // 3️⃣ Send the email
    await client.api(`/users/${process.env.EMAIL_USER}/sendMail`).post(message);
    console.log(`✅ Email sent successfully to ${to}`);
  } catch (err) {
    console.error("❌ sendEmail (Graph API) failed:");
    console.error("   Status:", err.statusCode);
    console.error("   Message:", err.message);
    console.error("   Code:", err.code);

    // More detailed error information
    if (err.body) {
      try {
        const errorBody = await streamToString(err.body);
        console.error("   Error Body:", errorBody);
      } catch (e) {
        console.error("   Could not read error body");
      }
    }

    throw err;
  }
}

// Helper function to read stream
async function streamToString(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value);
    }
  } finally {
    reader.releaseLock();
  }
  return result;
}
