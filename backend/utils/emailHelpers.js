import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const createTransporter = () => {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS 
        }
    });
};

export const sendReminderEmail = async (client, daysLeft, renewalLink) => {
    const transporter = createTransporter();
    const clientEmail = client.clientEmail || client.email;
    const clientName = client.clientName || client.ownerName || client.businessName;
    const softwareName = client.softwareName || "Your Subscription";
    
    let subject = "";
    if (daysLeft === 0) subject = `Alert: Your ${softwareName} Subscription Expires Today!`;
    else if (daysLeft < 0) subject = `URGENT: Your ${softwareName} Subscription has Expired!`;
    else subject = `Reminder: Your ${softwareName} Subscription expires in ${daysLeft} Days`;

    let headerColor = daysLeft <= 0 ? "#ff3b30" : (daysLeft === 2 ? "#ff9500" : "#f0ad4e");
    let expiryDate = client.expiryDate || client.packageEndDate;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: ${headerColor}; text-align: center;">Subscription ${daysLeft <= 0 ? 'Expiring Today' : 'Expiring Soon'}</h2>
            <p>Dear <strong>${clientName}</strong>,</p>
            <p>We're reaching out to remind you that your subscription for <strong>${softwareName}</strong> is ${daysLeft <= 0 ? 'expiring today (or already expired)' : `expiring in ${daysLeft} days`} on <strong>${new Date(expiryDate).toDateString()}</strong>.</p>
            <p>To ensure uninterrupted service for your business, please renew your subscription now.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${renewalLink}" style="background: #00c8ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    View Renewal Plans & Pay
                </a>
            </div>
            <p style="font-size: 13px; color: #666;">If you have already processed your payment, please ignore this message.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">Iflora Info Pvt. Ltd. - Modern Business Solutions</p>
        </div>
    `;

    await transporter.sendMail({
        from: `"Notification Engine" <${process.env.SMTP_USER}>`,
        to: clientEmail,
        subject: subject,
        html: html
    });
};
