import dotenv from "dotenv";
dotenv.config();

import sendEmail from "./utils/emailService.js";

async function testEmail() {
  console.log("=== Testing SMTP Email Service ===");
  console.log(`SMTP User: ${process.env.SMTP_USER}`);
  
  const testRecipient = "jaimilgorajiya4763@gmail.com";
  console.log(`Sending test email to: ${testRecipient}`);

  const success = await sendEmail(
    testRecipient,
    "SMTP Connection Test",
    "<h1>SMTP Test</h1><p>If you receive this, the master admin SMTP configuration is working perfectly!</p>"
  );

  if (success) {
    console.log("✅ Test email sent successfully!");
  } else {
    console.log("❌ Test email failed to send. Please check your SMTP settings and credentials in .env");
  }
  process.exit(0);
}

testEmail();
