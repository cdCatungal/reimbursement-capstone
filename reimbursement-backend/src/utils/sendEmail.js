// src/utils/sendEmail.js
import dotenv from "dotenv";
import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import "isomorphic-fetch"; // needed for node fetch
dotenv.config();

export async function sendEmail(to, subject, html) {
  try {
    // 1️⃣ Authenticate using app credentials
    const credential = new ClientSecretCredential(
      process.env.AZURE_TENANT_ID,
      process.env.AZURE_CLIENT_ID,
      process.env.AZURE_CLIENT_SECRET
    );

    const client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const tokenResponse = await credential.getToken("https://graph.microsoft.com/.default");
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

    // 3️⃣ Send the email
    await client.api(`/users/${process.env.EMAIL_USER}/sendMail`).post(message);
    console.log(`📧 Email sent to ${to}`);
  } catch (err) {
    console.error("❌ sendEmail (Graph API) failed:", err);
    throw err;
  }
}
