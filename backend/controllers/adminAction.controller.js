import mongoose from "mongoose";
import SoftwareClient from "../models/softwareClient.model.js";
import Reseller from "../models/reseller.model.js";

export const getRevenue = async (req, res) => {
    try {
        const { month, year, resellerId: resellerIdStr, employeeId: employeeIdStr } = req.query;

        let query = { paymentStatus: 'completed' };

        if (resellerIdStr) query.createdByReseller = new mongoose.Types.ObjectId(resellerIdStr);
        if (employeeIdStr) query.createdByAdminEmployee = new mongoose.Types.ObjectId(employeeIdStr);

        let listQuery = { ...query };
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            listQuery.createdAt = { $gte: startDate, $lte: endDate };
        }

        const revenueData = await SoftwareClient.find(listQuery)
            .populate("softwareId")
            .populate("createdByReseller", "companyName ownerName")
            .populate("createdByResellerEmployee", "name")
            .populate("createdByAdminEmployee", "name email")
            .sort({ createdAt: -1 });

        const baseQueryForAllTime = { ...query };
        const allTimeStats = await SoftwareClient.aggregate([
            { $match: baseQueryForAllTime },
            { $group: { _id: null, totalRev: { $sum: "$paymentAmount" }, totalCount: { $sum: 1 } } }
        ]);

        const trendData = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const tStart = new Date(d.getFullYear(), d.getMonth(), 1);
            const tEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
            const monthRev = await SoftwareClient.aggregate([
                { $match: { ...baseQueryForAllTime, createdAt: { $gte: tStart, $lte: tEnd } } },
                { $group: { _id: null, total: { $sum: "$paymentAmount" } } }
            ]);
            trendData.push({ name: d.toLocaleString('default', { month: 'short' }), revenue: monthRev[0]?.total || 0 });
        }

        const resellerBreakdown = await SoftwareClient.aggregate([
            { $match: { paymentStatus: 'completed', ...(employeeIdStr ? { createdByAdminEmployee: new mongoose.Types.ObjectId(employeeIdStr) } : {}) } },
            { $group: { _id: "$createdByReseller", amount: { $sum: "$paymentAmount" }, count: { $sum: 1 } } },
            { $lookup: { from: 'resellers', localField: '_id', foreignField: '_id', as: 'resellerInfo' } },
            { $unwind: "$resellerInfo" },
            { $project: { name: "$resellerInfo.companyName", amount: 1, count: 1 } },
            { $sort: { amount: -1 } }
        ]);

        // Employee breakdown — revenue per staff member
        const employeeBreakdown = await SoftwareClient.aggregate([
            { $match: { paymentStatus: 'completed', createdByAdminEmployee: { $ne: null, $exists: true } } },
            { $group: { _id: "$createdByAdminEmployee", amount: { $sum: "$paymentAmount" }, count: { $sum: 1 } } },
            { $lookup: { from: 'staffs', localField: '_id', foreignField: '_id', as: 'empInfo' } },
            { $unwind: { path: "$empInfo", preserveNullAndEmptyArrays: true } },
            { $project: { name: { $ifNull: ["$empInfo.name", "Unknown Employee"] }, email: "$empInfo.email", amount: 1, count: 1 } },
            { $sort: { amount: -1 } }
        ]);

        const softwareBreakdown = await SoftwareClient.aggregate([
            { $match: { paymentStatus: 'completed', ...(employeeIdStr ? { createdByAdminEmployee: new mongoose.Types.ObjectId(employeeIdStr) } : {}) } },
            { $group: { _id: "$softwareId", amount: { $sum: "$paymentAmount" }, count: { $sum: 1 } } },
            { $lookup: { from: 'softwares', localField: '_id', foreignField: '_id', as: 'softwareInfo' } },
            { $unwind: { path: "$softwareInfo", preserveNullAndEmptyArrays: true } },
            { $project: { name: { $ifNull: ["$softwareInfo.name", "Service / Custom"] }, amount: 1, count: 1 } },
            { $sort: { amount: -1 } }
        ]);

        return res.status(200).json({
            success: true,
            data: revenueData,
            trend: trendData,
            breakdown: resellerBreakdown,
            employeeBreakdown,
            softwareBreakdown,
            allTimeRevenue: allTimeStats[0]?.totalRev || 0,
            allTimeConversions: allTimeStats[0]?.totalCount || 0
        });
    } catch (error) {
        console.error("[Admin] Revenue Error:", error.message);
        return res.status(500).json({ success: false, message: "Error fetching revenue data" });
    }
};

// ─── GET /api/admin-actions/employee-revenue ─────────────────────────────────
export const getEmployeeRevenue = async (req, res) => {
    try {
        const employeeId = new mongoose.Types.ObjectId(req.user.id || req.user.userId || req.user._id);
        const { month, year, softwareId } = req.query;

        const baseQuery = {
            paymentStatus: 'completed',
            createdByAdminEmployee: employeeId
        };

        // Also include service clients created by this employee (from Details model)
        // We'll pull from SoftwareClient only (software clients) + Transaction model (service clients)
        let listQuery = { ...baseQuery };
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            listQuery.paymentDate = { $gte: startDate, $lte: endDate };
        }
        if (softwareId) {
            listQuery.softwareId = new mongoose.Types.ObjectId(softwareId);
        }

        const swClients = await SoftwareClient.find(listQuery)
            .populate("softwareId", "name")
            .sort({ paymentDate: -1 });

        // All-time stats for this employee
        const allTimeStats = await SoftwareClient.aggregate([
            { $match: baseQuery },
            { $group: { _id: null, totalRev: { $sum: "$paymentAmount" }, totalCount: { $sum: 1 } } }
        ]);

        // 6-month trend
        const trendData = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const tStart = new Date(d.getFullYear(), d.getMonth(), 1);
            const tEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
            const monthRev = await SoftwareClient.aggregate([
                { $match: { ...baseQuery, paymentDate: { $gte: tStart, $lte: tEnd } } },
                { $group: { _id: null, total: { $sum: "$paymentAmount" } } }
            ]);
            trendData.push({
                name: d.toLocaleString('default', { month: 'short' }),
                revenue: monthRev.length > 0 ? monthRev[0].total : 0
            });
        }

        // Breakdown by software
        const softwareBreakdown = await SoftwareClient.aggregate([
            { $match: baseQuery },
            { $group: { _id: "$softwareId", amount: { $sum: "$paymentAmount" }, count: { $sum: 1 } } },
            { $lookup: { from: 'softwares', localField: '_id', foreignField: '_id', as: 'sw' } },
            { $unwind: { path: "$sw", preserveNullAndEmptyArrays: true } },
            { $project: { name: { $ifNull: ["$sw.name", "Service"] }, amount: 1, count: 1 } },
            { $sort: { amount: -1 } }
        ]);

        return res.status(200).json({
            success: true,
            data: swClients,
            trend: trendData,
            breakdown: softwareBreakdown,
            allTimeRevenue: allTimeStats[0]?.totalRev || 0,
            allTimeConversions: allTimeStats[0]?.totalCount || 0
        });
    } catch (error) {
        console.error("[Employee] Revenue Error:", error.message);
        return res.status(500).json({ success: false, message: "Error fetching revenue data" });
    }
};
