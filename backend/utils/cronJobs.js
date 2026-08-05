import cron from "node-cron";
import Details from "../models/client.model.js";
import SoftwareClient from "../models/softwareClient.model.js";
import Software from "../models/software.model.js";
import dotenv from "dotenv";
import { sendReminderEmail } from "./emailHelpers.js";
import Reseller from "../models/reseller.model.js";
import ResellerLedger from "../models/resellerLedger.model.js";

dotenv.config();

export const startCronJobs = () => {
  console.log("⏰ Master Admin Cron Engine Started");

  // Run at 9:00 AM every day
  cron.schedule("0 9 * * *", async () => {
    console.log("⏰ [9:00 AM] Checking for expirations & sending reminders...");

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const checkClients = async (Model, isSoftware = false) => {
          const dateField = isSoftware ? 'packageEndDate' : 'expiryDate';
          
          // Fetch all active clients to check their dates manually for precision
          // (Alternatively, use MongoDB aggregation for 7, 2, 0 days)
          const activeClients = await Model.find({ isActive: true });

          for (const client of activeClients) {
              const expiryDate = new Date(client[dateField]);
              expiryDate.setHours(0, 0, 0, 0);
              
              const diffTime = expiryDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              const renewalLink = isSoftware 
                ? `${process.env.FRONTEND_URL}/renew/${encodeURIComponent(client.email)}`
                : `${process.env.FRONTEND_URL}/pay-service/${client._id}`;

              // 7 Days
              if (diffDays === 7 && !client.reminderSent7Days) {
                  await sendReminderEmail(client, 7, renewalLink); 
                  client.reminderSent7Days = true;
                  await client.save();
              }
              // 2 Days
              else if (diffDays === 2 && !client.reminderSent2Days) {
                  await sendReminderEmail(client, 2, renewalLink);
                  client.reminderSent2Days = true;
                  await client.save();
              }
              // 0 Days (Expiry Day)
              else if (diffDays <= 0 && !client.reminderSent0Days) {
                  await sendReminderEmail(client, 0, renewalLink);
                  client.reminderSent0Days = true;
                  // client.isActive = false; // We can deactivate if we want, but usually better to wait for 1 day after expiry
                  await client.save();
              }
          }
      };

      await checkClients(Details, false);
      await checkClients(SoftwareClient, true);

      console.log("✅ Daily checks completed.");

    } catch (error) {
      console.error("💥 Master Admin Cron Error:", error);
    }
  });

  // Monthly Ledger Initialization (Run at 00:01 on the 1st of every month)
  cron.schedule("1 0 1 * *", async () => {
    console.log("⏰ initializing monthly ledgers for resellers...");
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const resellers = await Reseller.find({ status: "Active" });
      for (const res of resellers) {
        // Create only if doesn't exist
        const existing = await ResellerLedger.findOne({ resellerId: res._id, month, year });
        if (!existing) {
          await ResellerLedger.create({
            resellerId: res._id,
            month,
            year,
            totalRevenue: 0,
            totalCommission: 0,
            status: "pending"
          });
        }
      }
      console.log(`✅ successfully initialized ${resellers.length} ledgers for ${month}/${year}`);
    } catch (error) {
      console.error("💥 Monthly Ledger Cron Error:", error);
    }
  });
};

