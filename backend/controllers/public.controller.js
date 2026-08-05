import Details from "../models/client.model.js";
import SoftwareClient from "../models/softwareClient.model.js";
import Software from "../models/software.model.js";
import Package from "../models/package.model.js";
import Transaction from "../models/transaction.model.js";
import axios from "axios";
import { verifyPaymentSignature } from "./payment.controller.js";
import nodemailer from "nodemailer";

// ✅ Helper to handle DD/MM/YYYY formats
const parseDateSafely = (dateVal) => {
    if (!dateVal) return null;
    let d = new Date(dateVal);
    if (!isNaN(d.getTime())) return d;
    
    // Handle DD/MM/YYYY string format
    if (typeof dateVal === 'string' && dateVal.includes('/')) {
        const parts = dateVal.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            const isoDate = new Date(`${year}-${month}-${day}`);
            if (!isNaN(isoDate.getTime())) return isoDate;
        }
    }
    return null;
};

// ✅ Public Client Info - DISABLED
export const getPublicServiceInfo = async (req, res) => {
    return res.status(403).json({ 
        success: false, 
        message: "Public renewal portal is currently disabled by administrator." 
    });
};

// ✅ Process Renewal - DISABLED
export const processRenewal = async (req, res) => {
    return res.status(403).json({ 
        success: false, 
        message: "Subscription renewals are currently not available via the public portal." 
    });
};
