import bcrypt from "bcryptjs";
import axios from "axios";
import mongoose from "mongoose";
import Reseller from "../models/reseller.model.js";
import ResellerEmployee from "../models/resellerEmployee.model.js";
import SoftwareClient from "../models/softwareClient.model.js";
import Software from "../models/software.model.js";
import { generatePassword } from "../utils/passwordGenerator.js";
import { emitEvent } from "../socket/socketHandler.js";
import { sendPaymentEmail } from "./softwareClientPayment.controller.js";
import sendEmail from "../utils/emailService.js";

// Helper for external API calls
const callExternal = async (url, method, data = {}) => {
  return await axios({
    method: method || "POST",
    url,
    data,
    headers: {
      "x-api-key": process.env.HRMS_API_KEY || "hrms_master_admin_secret_key_2026",
      "Content-Type": "application/json"
    },
    timeout: 15000,
    validateStatus: () => true
  });
};

// ── TEAM MANAGEMENT ──────────────────────────────────────────────────────────

export const addTeamMember = async (req, res) => {
    try {
        let { name, email, password, status, assignedServices, assignedSoftware } = req.body;
        
        // Extract Reseller ID and Creator Info from token
        const isEmployeeCreator = req.user.role === "RESELLER_EMPLOYEE";
        const resellerId = isEmployeeCreator ? req.user.resellerId : req.user.id;
        const creatorId = req.user.id;

        if(!name || !email) return res.status(400).json({ success: false, message: "Required fields missing" });

        // Auto-generate password if not provided
        const finalPassword = password || generatePassword(10);

        const existing = await ResellerEmployee.findOne({ email: email.toLowerCase() });
        if(existing) return res.status(400).json({ success: false, message: "Email already in use" });

        const reseller = await Reseller.findById(resellerId);
        const resellerName = reseller ? reseller.name : "Your Partner";

        const hashedPassword = await bcrypt.hash(finalPassword, 10);
        const employee = await ResellerEmployee.create({
            resellerId,
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            status: status || "Active",
            assignedServices: assignedServices || [],
            assignedSoftware: assignedSoftware || [],
            createdByReseller: !isEmployeeCreator ? creatorId : undefined,
            createdByEmployee: isEmployeeCreator ? creatorId : undefined
        });

        // Send Email to Team Member
        const subject = `Welcome to the Team - ${resellerName}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #6366f1; text-align: center;">Welcome to the Team!</h2>
                <p>Hello <strong>${name}</strong>,</p>
                <p>You have been added as a team member by <strong>${resellerName}</strong> on the Partner Dashboard.</p>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #666;">Your Login Credentials:</p>
                    <p style="margin: 10px 0 5px; font-size: 16px;"><strong>Email:</strong> ${email.toLowerCase()}</p>
                    <p style="margin: 0; font-size: 16px;"><strong>Password:</strong> ${finalPassword}</p>
                </div>

                <p>Please log in to your dashboard to get started with your assigned services and software.</p>
                
                <div style="text-align: center; margin-top: 30px;">
                    <p style="font-size: 12px; color: #999;">This is an automated system message. Please do not reply.</p>
                </div>
            </div>
        `;

        await sendEmail(email.toLowerCase(), subject, html);

        return res.status(201).json({ success: true, message: "Team member added and credentials sent and email sent", employee });
    } catch (error) {
        console.error("Add team member error:", error);
        return res.status(500).json({ success: false, message: "Error adding team member" });
    }
};

export const getTeam = async (req, res) => {
    try {
        const isEmployee = req.user.role === "RESELLER_EMPLOYEE";
        const resellerId = isEmployee ? req.user.resellerId : req.user.id;

        const team = await ResellerEmployee.find({ resellerId })
            .select("-password")
            .populate("createdByReseller", "name email")
            .populate("createdByEmployee", "name email")
            .populate("assignedServices", "name price")
            .populate("assignedSoftware", "name");

        return res.status(200).json({ success: true, data: team });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching team" });
    }
};

export const deleteTeamMember = async (req, res) => {
    try {
        const { id } = req.params;
        const resellerId = req.user.id;
        const employee = await ResellerEmployee.findOneAndDelete({ _id: id, resellerId });
        if(!employee) return res.status(404).json({ success: false, message: "Member not found" });
        return res.status(200).json({ success: true, message: "Member removed" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error deleting member" });
    }
};

// ── CLIENT MANAGEMENT ────────────────────────────────────────────────────────

export const getMyClients = async (req, res) => {
    try {
        const isEmployee = req.user.role === "RESELLER_EMPLOYEE";
        const resellerId = isEmployee ? req.user.resellerId : req.user.id;
        const employeeId = isEmployee ? req.user.id : null;

        // If employee, only show clients they created? 
        // Or show all reseller clients? 
        // Based on user feedback "Staff Panel proper" and tracking, 
        // usually we show all clients of the reseller or specific assignment.
        // Let's show all clients for now but we have the creator info to filter if needed.
        
        let query = { createdByReseller: resellerId };
        if (isEmployee) {
            query.createdByResellerEmployee = employeeId;
        }
        
        const clients = await SoftwareClient.find(query)
            .populate("softwareId")
            .populate("selectedServices.serviceId")
            .populate("createdByResellerEmployee", "name")
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, data: clients });
    } catch (error) {
        console.error("[Reseller] getMyClients Error:", error.message);
        return res.status(500).json({ success: false, message: "Error fetching clients" });
    }
};

// Resellers or their Employees can fetch software/services assigned to them
export const getMyPermissions = async (req, res) => {
    try {
        const isEmployee = req.user.role === "RESELLER_EMPLOYEE";
        
        if (isEmployee) {
            const employee = await ResellerEmployee.findById(req.user.id)
                .populate('assignedServices')
                .populate('assignedSoftware');
            
            if(!employee) return res.status(404).json({ success: false, message: "Staff account not found" });

            return res.status(200).json({
                success: true,
                data: {
                    allowedServices: employee.assignedServices,
                    allowedSoftware: employee.assignedSoftware
                }
            });
        } else {
            const resellerId = req.user.id;
            const reseller = await Reseller.findById(resellerId)
                .populate('allowedServices')
                .populate('allowedSoftware');
            
            if(!reseller) return res.status(404).json({ success: false, message: "Reseller account not found" });

            return res.status(200).json({
                success: true,
                data: {
                    allowedServices: reseller.allowedServices,
                    allowedSoftware: reseller.allowedSoftware
                }
            });
        }
    } catch (error) {
        console.error("[Reseller] getMyPermissions Error:", error.message);
        return res.status(500).json({ success: false, message: "Error fetching permissions" });
    }
};

// Reseller can create client with identical logic to Master Admin
export const resellerCreateClient = async (req, res) => {
    try {
        const isEmployee = req.user.role === "RESELLER_EMPLOYEE";
        const resellerId = isEmployee ? req.user.resellerId : req.user.id;
        const employeeId = isEmployee ? req.user.id : null;

        const {
            businessName, ownerName, email, phone,
            softwareId, signupFieldValues = {}, packageId, packageName, packagePrice,
            selectedServices = [],
            appliedCoupon, discountAmount
        } = req.body;

        if (!businessName || !ownerName || !email || !phone) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        let software = null;
        let externalClientId = null;

        // Fetch Reseller for attribution/email injecting
        const reseller = await Reseller.findById(resellerId);
        if (!reseller) return res.status(404).json({ success: false, message: "Reseller account not found" });

        if (softwareId) {
            software = await Software.findById(softwareId);
            if (!software) return res.status(404).json({ success: false, message: "Software not found" });

            // 1. External Signup (if configured)
            if (software.clientSignupApi) {
                // Ensure external software knows which partner is creating the client
                // We send the signup fields + basic details + reseller identification
                const externalPayload = { 
                    ...signupFieldValues,
                    ownerName,
                    businessName,
                    email,
                    phone,
                    phoneNumber: signupFieldValues.phoneNumber || signupFieldValues.phone || phone,
                    resellerEmail: reseller.email,
                    resellerName: reseller.name
                };
                if (packageId) {
                    externalPayload.package = packageId;
                    externalPayload.packageId = packageId;
                }
                
                console.log(`[ResellerAction] Creating client for ${software.name} via ${isEmployee ? 'Staff' : 'Owner'}`);
                console.log(`[ResellerAction] Payload:`, JSON.stringify(externalPayload));

                const externalRes = await callExternal(software.clientSignupApi, "POST", externalPayload);
                
                if (!externalRes.data?.success) {
                    const errMsg = externalRes.data?.message || `External registration failed (${externalRes.status})`;
                    console.error(`[ResellerAction] External Error:`, externalRes.data);
                    
                    const isAlreadyRegistered = errMsg.toLowerCase().includes("already registered") || errMsg.toLowerCase().includes("already exists");
                    if (isAlreadyRegistered && software.clientsGetApi) {
                        console.log(`[ResellerAction] ${email} already registered on ${software.name}. Attempting to link existing ID...`);
                        try {
                            const listRes = await callExternal(software.clientsGetApi, "GET");
                            const list = Array.isArray(listRes.data)
                              ? listRes.data
                              : (listRes.data?.clients || listRes.data?.data || listRes.data?.admins || []);
                            
                            const match = list.find(c => (c.email || c.ownerEmail || "").toLowerCase() === email.toLowerCase());
                            if (match) {
                              externalClientId = String(match._id || match.id);
                              console.log(`[ResellerAction] Linked existing externalClientId: ${externalClientId}`);
                            } else {
                              return res.status(400).json({ success: false, message: errMsg, externalError: externalRes.data });
                            }
                        } catch (syncErr) {
                            return res.status(400).json({ success: false, message: errMsg, externalError: externalRes.data });
                        }
                    } else {
                        return res.status(400).json({ success: false, message: errMsg, externalError: externalRes.data });
                    }
                } else {
                    externalClientId = externalRes.data?.client?._id || externalRes.data?.data?._id || null;
                }

                // Deactivate on external software initially until payment is completed
                if (externalClientId && software.clientToggleStatusApi) {
                    const toggleUrl = software.clientToggleStatusApi.replace(":id", externalClientId);
                    console.log(`[ResellerAction] Deactivating external client ${externalClientId} until payment is completed...`);
                    await callExternal(toggleUrl, "PATCH", { status: "inactive" });
                }
            }
        }

        // 2. Local Creation with Ownership tracking
        const client = await SoftwareClient.create({
            businessName, ownerName, email, phone,
            softwareId: software ? software._id : null,
            softwareName: software ? software.name : null,
            externalClientId,
            packageId: packageId || null,
            packageName: packageName || null,
            packagePrice: packagePrice || null,
            selectedServices: selectedServices || [],
            signupFieldValues: signupFieldValues || {},
            appliedCoupon: appliedCoupon || null,
            discountAmount: discountAmount || 0,
            createdByReseller: req.user.role === 'RESELLER' ? req.user.id : req.user.resellerId,
            createdByResellerEmployee: req.user.role === 'RESELLER_EMPLOYEE' ? req.user.id : null,
            isActive: false,
            paymentStatus: 'pending'
        });

        emitEvent("software_client_change", { action: "create", id: client._id });

        // 3. Send Payment Email (Non-blocking)
        sendPaymentEmail(client).catch(err => console.error("[Reseller] Email error:", err.message));

        return res.status(201).json({ 
            success: true, 
            message: "Client onboarded and payment link shared", 
            data: client 
        });
    } catch (error) {
        console.error("[Reseller] Create Client Error:", error.message);
        return res.status(500).json({ success: false, message: "Error onboarding client" });
    }
};

export const getAnalytics = async (req, res) => {
    try {
        const isEmployee = req.user.role === "RESELLER_EMPLOYEE";
        const resellerId = isEmployee ? req.user.resellerId : req.user.id;
        
        let query = { createdByReseller: resellerId };
        
        // If employee, force filter to self. 
        // If owner, check for optional target employeeId query param.
        if (isEmployee) {
            query.createdByResellerEmployee = req.user.id;
        } else if (req.query.employeeId) {
            query.createdByResellerEmployee = req.query.employeeId;
        }

        const clients = await SoftwareClient.find(query);

        // 1. Client Growth (Last 6 Months)
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthName = d.toLocaleString('default', { month: 'short' });
            last6Months.push({ month: monthName, year: d.getFullYear(), count: 0, revenue: 0 });
        }

        // 2. Status Distribution
        let active = 0, inactive = 0;
        
        // 3. Software Distribution
        const swMap = {};

        // 4. Revenue Calculation
        let totalRevenue = 0;

        clients.forEach(c => {
            if (c.isActive) active++; else inactive++;
            
            const swName = c.softwareName || "Services Only";
            swMap[swName] = (swMap[swName] || 0) + 1;

            if (c.paymentStatus === 'completed') {
                totalRevenue += (c.paymentAmount || 0);
            }

            const cDate = new Date(c.createdAt);
            const monthIdx = last6Months.findIndex(m => m.month === cDate.toLocaleString('default', { month: 'short' }) && m.year === cDate.getFullYear());
            if (monthIdx !== -1) {
                last6Months[monthIdx].count += 1;
                if (c.paymentStatus === 'completed') {
                    last6Months[monthIdx].revenue += (c.paymentAmount || 0);
                }
            }
        });

        const softwareDistribution = Object.keys(swMap).map(name => ({ name, value: swMap[name] }));

        return res.status(200).json({
            success: true,
            data: {
                totalClients: clients.length,
                totalRevenue,
                statusDistribution: [
                    { name: 'Active', value: active },
                    { name: 'Inactive', value: inactive }
                ],
                clientGrowth: last6Months.map(m => ({ name: m.month, clients: m.count, revenue: m.revenue })),
                softwareDistribution
            }
        });
    } catch (error) {
        console.error("[Reseller] Analytics Error:", error.message);
        return res.status(500).json({ success: false, message: "Error fetching analytics" });
    }
};

export const getRevenue = async (req, res) => {
    try {
        const isEmployee = req.user.role === "RESELLER_EMPLOYEE";
        const resellerIdStr = isEmployee ? req.user.resellerId : req.user.id;
        const { month, year, employeeId: employeeIdStr } = req.query;

        // Convert strings to ObjectIds for aggregation
        const resellerId = new mongoose.Types.ObjectId(resellerIdStr);

        let query = { 
            createdByReseller: resellerId,
            paymentStatus: 'completed' 
        };

        // If employee, only show their own revenue
        if (isEmployee) {
            query.createdByResellerEmployee = new mongoose.Types.ObjectId(req.user.id);
        } else if (employeeIdStr) {
            query.createdByResellerEmployee = new mongoose.Types.ObjectId(employeeIdStr);
        }

        // Date Filter (for finding list)
        let listQuery = { ...query };
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            listQuery.createdAt = { $gte: startDate, $lte: endDate };
        }

        const revenueData = await SoftwareClient.find(listQuery)
            .populate("softwareId")
            .populate("createdByResellerEmployee", "name email")
            .sort({ createdAt: -1 });

        // Calculate All-Time stats
        const baseQueryForAllTime = { ...query };
        const allTimeStats = await SoftwareClient.aggregate([
            { $match: baseQueryForAllTime },
            { $group: { _id: null, totalRev: { $sum: "$paymentAmount" }, totalCount: { $sum: 1 } } }
        ]);

        // 6-Month Trend Data for Chart
        const trendData = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mName = d.toLocaleString('default', { month: 'short' });
            
            const tStart = new Date(d.getFullYear(), d.getMonth(), 1);
            const tEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
            
            const trendQuery = { 
                ...baseQueryForAllTime,
                createdAt: { $gte: tStart, $lte: tEnd }
            };

            const monthRev = await SoftwareClient.aggregate([
                { $match: trendQuery },
                { $group: { _id: null, total: { $sum: "$paymentAmount" } } }
            ]);

            trendData.push({
                name: mName,
                revenue: monthRev.length > 0 ? monthRev[0].total : 0
            });
        }

        return res.status(200).json({ 
            success: true, 
            data: revenueData,
            trend: trendData,
            allTimeRevenue: allTimeStats.length > 0 ? allTimeStats[0].totalRev : 0,
            allTimeConversions: allTimeStats.length > 0 ? allTimeStats[0].totalCount : 0
        });
    } catch (error) {
        console.error("[Reseller] Revenue Error:", error.message);
        return res.status(500).json({ success: false, message: "Error fetching revenue data" });
    }
};
export const toggleClientStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const isEmployee = req.user.role === "RESELLER_EMPLOYEE";
        const resellerId = isEmployee ? req.user.resellerId : req.user.id;

        const client = await SoftwareClient.findOne({ _id: id, createdByReseller: resellerId });
        if (!client) return res.status(404).json({ success: false, message: "Client not found or not authorized" });

        const newStatus = !client.isActive;
        const software = await Software.findById(client.softwareId);

        // 1. External Toggle
        if (software?.clientToggleStatusApi && client.externalClientId) {
            const toggleUrl = software.clientToggleStatusApi.replace(":id", client.externalClientId);
            const extRes = await callExternal(toggleUrl, "PATCH", { status: newStatus ? "active" : "inactive" });

            if (!extRes.data?.success) {
                const msg = extRes.data?.message || `External software responded with ${extRes.status}`;
                return res.status(400).json({ success: false, message: msg });
            }
        }

        // 2. Local Update
        client.isActive = newStatus;
        await client.save();

        emitEvent("software_client_change", { action: "toggle_status", id: client._id });

        return res.status(200).json({ 
            success: true, 
            message: `Client ${newStatus ? 'activated' : 'deactivated'} successfully`,
            isActive: client.isActive 
        });
    } catch (error) {
        console.error("[Reseller] Toggle Status Error:", error.message);
        return res.status(500).json({ success: false, message: "Error updating client status" });
    }
};
