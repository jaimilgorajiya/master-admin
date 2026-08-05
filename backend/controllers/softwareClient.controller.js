import axios from "axios";
import SoftwareClient from "../models/softwareClient.model.js";
import Software from "../models/software.model.js";
import Transaction from "../models/transaction.model.js";
import CommissionService from "../services/commission.service.js";
import LedgerService from "../services/ledger.service.js";
import { emitEvent } from "../socket/socketHandler.js";
import { sendPaymentEmail } from "./softwareClientPayment.controller.js";
import { validateCouponLogic } from "../utils/couponHelper.js";

// Helper: call external API via internal proxy logic (direct axios, no HTTP round-trip)
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

// ─── GET /api/software-clients/my-clients ────────────────────────────────────
export const getMyClients = async (req, res) => {
  try {
    const employeeId = req.user.id || req.user.userId || req.user._id;
    const clients = await SoftwareClient.find({ createdByAdminEmployee: employeeId })
      .populate("softwareId", "name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, clients });
  } catch (err) {
    console.error("[SoftwareClient] getMyClients error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /api/software-clients/create ───────────────────────────────────────
export const createSoftwareClient = async (req, res) => {
  try {
    const {
      businessName, ownerName, email, phone,
      softwareId, signupFieldValues = {}, packageId, packageName, packagePrice,
      selectedServices = [],
      appliedCoupon, discountAmount
    } = req.body;

    if (!businessName || !ownerName || !email || !phone || !softwareId) {
      return res.status(400).json({ success: false, message: "All required fields must be filled" });
    }

    const software = await Software.findById(softwareId);
    if (!software) return res.status(404).json({ success: false, message: "Software not found" });

    // ── External Signup ──────────────────────────────────────────────────────
    let externalClientId = null;

    if (software.clientSignupApi) {
      const externalPayload = {
        ...signupFieldValues,
        ownerName,
        businessName,
        email,
        phone,
        phoneNumber: signupFieldValues.phoneNumber || signupFieldValues.phone || phone,
      };
      if (packageId) {
        externalPayload.package = packageId;
        externalPayload.packageId = packageId;
      }

      const extRes = await callExternal(software.clientSignupApi, "POST", externalPayload);

      if (!extRes.data?.success) {
        const errMsg = extRes.data?.message || `External registration failed (${extRes.status})`;
        console.error("[SoftwareClient] External signup error:", extRes.data);

        // If email is already registered on the external software, discover and link existing external ID
        const isAlreadyRegistered = errMsg.toLowerCase().includes("already registered") || errMsg.toLowerCase().includes("already exists");
        if (isAlreadyRegistered && software.clientsGetApi) {
          console.log(`[SoftwareClient] ${email} already registered on ${software.name}. Attempting to link existing ID...`);
          try {
            const listRes = await callExternal(software.clientsGetApi, "GET");
            const list = Array.isArray(listRes.data)
              ? listRes.data
              : (listRes.data?.clients || listRes.data?.data || listRes.data?.admins || []);
            
            const match = list.find(c => (c.email || c.ownerEmail || "").toLowerCase() === email.toLowerCase());
            if (match) {
              externalClientId = String(match._id || match.id);
              console.log(`[SoftwareClient] Linked existing externalClientId: ${externalClientId}`);
            } else {
              return res.status(400).json({ success: false, message: errMsg, externalError: extRes.data });
            }
          } catch (syncErr) {
            console.error(`[SoftwareClient] Failed to fetch external clients for fallback:`, syncErr.message);
            return res.status(400).json({ success: false, message: errMsg, externalError: extRes.data });
          }
        } else {
          return res.status(400).json({ success: false, message: errMsg, externalError: extRes.data });
        }
      } else {
        externalClientId = extRes.data?.client?._id || extRes.data?.data?._id || extRes.data?._id || null;
      }

      // Deactivate on external software initially until payment is completed
      if (externalClientId && software.clientToggleStatusApi) {
        const toggleUrl = software.clientToggleStatusApi.replace(":id", externalClientId);
        console.log(`[SoftwareClient] Deactivating external client ${externalClientId} until payment is completed...`);
        await callExternal(toggleUrl, "PATCH", { status: "inactive" });
      }
    }

    // Calculate Total Amount before discount
    let totalAmountForCoupon = (packagePrice || 0) + selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
    
    // Apply Coupon if provided
    let finalDiscountAmount = 0;
    let appliedCouponId = null;
    let finalCouponCode = null;

    if (appliedCoupon) {
        // Find valid service IDs for coupon validation
        const serviceIds = selectedServices.map(s => s.serviceId || s._id).filter(Boolean);
        
        const couponResult = await validateCouponLogic(
            appliedCoupon, 
            softwareId, 
            serviceIds, 
            totalAmountForCoupon
        );
        
        if (couponResult.success) {
            finalDiscountAmount = couponResult.discount;
            finalCouponCode = couponResult.coupon.code;
            appliedCouponId = couponResult.coupon._id;
        } else {
            return res.status(400).json({ success: false, message: couponResult.message });
        }
    } else if (discountAmount && !isNaN(discountAmount)) {
        finalDiscountAmount = parseFloat(discountAmount);
    }

    const client = await SoftwareClient.create({
      businessName, ownerName, email, phone,
      softwareId: software._id,
      softwareName: software.name,
      externalClientId: externalClientId || null,
      packageId: packageId || null,
      packageName: packageName || null,
      packagePrice: packagePrice || null,
      selectedServices: selectedServices || [],
      signupFieldValues: signupFieldValues || {},
      appliedCoupon: appliedCouponId,
      couponCode: finalCouponCode,
      discountAmount: finalDiscountAmount,
      createdByAdmin: req.user.role === 'MASTER_ADMIN',
      createdByAdminEmployee: req.user.role === 'EMPLOYEE' ? req.user.id : null,
      isActive: false,
      paymentStatus: 'pending'
    });

    emitEvent("software_client_change", { action: "create", id: client._id });

    // Send payment email to client (non-blocking)
    sendPaymentEmail(client).catch(err => console.error("[SoftwareClient] Email error:", err.message));

    return res.status(201).json({ success: true, message: "Client registered successfully", clientId: client._id, client });
  } catch (err) {
    console.error("[SoftwareClient] createSoftwareClient error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /api/software-clients/:id/complete-payment ─────────────────────────
export const completePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { packageId, packageName, packagePrice, packageEndDate, paymentMethod, paymentAmount, transactionId, paymentDate, paymentNotes } = req.body;

    const client = await SoftwareClient.findById(id);
    if (!client) return res.status(404).json({ success: false, message: "Client not found" });

    const software = await Software.findById(client.softwareId);
    if (!software) return res.status(404).json({ success: false, message: "Software not found" });

    // Assign package on external software if endpoint is configured
    if (software.clientPackageAssignApi && client.externalClientId) {
      const assignUrl = software.clientPackageAssignApi.replace(":id", client.externalClientId);
      const assignRes = await callExternal(assignUrl, "POST", { packageId });
      if (!assignRes.data?.success) {
        console.warn("[SoftwareClient] Package assign warning:", assignRes.data?.message);
      }
    }

    // Activate on external software if toggle API is configured
    if (software.clientToggleStatusApi && client.externalClientId) {
      const toggleUrl = software.clientToggleStatusApi.replace(":id", client.externalClientId);
      await callExternal(toggleUrl, "PATCH", { status: "active" });
    }

    const now = new Date();
    client.packageId        = packageId;
    client.packageName      = packageName;
    client.packagePrice     = packagePrice;
    client.packageStartDate = now;
    client.packageEndDate   = packageEndDate ? new Date(packageEndDate) : null;
    client.paymentStatus    = 'completed';
    client.paymentMethod    = paymentMethod;
    client.paymentAmount    = paymentAmount;
    client.paymentDate      = paymentDate ? new Date(paymentDate) : now;
    client.transactionId    = transactionId;
    client.paymentNotes     = paymentNotes;
    client.isActive         = true;

    await client.save();

    // ─── Commission & Ledger Integration for Reseller Clients ───
    if (client.createdByReseller) {
      try {
        const commission = await CommissionService.calculateCommission(
          client.createdByReseller,
          paymentAmount,
          client.softwareId,
          client.selectedServices || []
        );

        const transaction = await Transaction.create({
          clientId: client._id,
          packageId: client.packageId,
          resellerId: client.createdByReseller,
          softwareId: client.softwareId,
          amount: paymentAmount,
          resellerCommission: commission,
          adminRevenue: paymentAmount - commission,
          paymentId: transactionId || `MANUAL_${Date.now()}`,
          status: "success",
          paymentDate: client.paymentDate
        });

        await LedgerService.updateLedger(transaction);
      } catch (err) {
        console.error("[SoftwareClient] Ledger/Commission error:", err.message);
      }
    }

    emitEvent("software_client_change", { action: "payment_complete", id: client._id });

    return res.status(200).json({ success: true, message: "Payment completed and client activated", client });
  } catch (err) {
    console.error("[SoftwareClient] completePayment error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── GET /api/software-clients/all ───────────────────────────────────────────
export const getAllSoftwareClients = async (req, res) => {
  try {
    // Admin sees everything: software clients and service-only clients
    const clients = await SoftwareClient.find({})
      .populate("softwareId", "name")
      .populate("createdByReseller", "name")
      .populate("createdByResellerEmployee", "name")
      .populate("createdByAdminEmployee", "name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, clients });
  } catch (err) {
    console.error("[SoftwareClient] getAllSoftwareClients error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── GET /api/software-clients/:id ───────────────────────────────────────────
export const getSoftwareClientById = async (req, res) => {
  try {
    const client = await SoftwareClient.findById(req.params.id).populate("softwareId", "name");
    if (!client) return res.status(404).json({ success: false, message: "Client not found" });
    return res.status(200).json({ success: true, client });
  } catch (err) {
    console.error("[SoftwareClient] getSoftwareClientById error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── PATCH /api/software-clients/toggle-status/:id ───────────────────────────
export const toggleSoftwareClientStatus = async (req, res) => {
  try {
    const client = await SoftwareClient.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: "Client not found" });

    const newStatus = !client.isActive;
    const software = await Software.findById(client.softwareId);
    const softwareName = software?.name || "external software";

    // If the software has a toggle-status endpoint, call it
    if (software?.clientToggleStatusApi) {
      // If we don't have an externalClientId, try to find it first via sync logic
      if (!client.externalClientId && software.clientsGetApi) {
        console.log(`[SoftwareClient] Missing externalClientId for ${client.email}. Attempting to find via sync...`);
        try {
          const externalRes = await callExternal(software.clientsGetApi, "GET");
          const externalClients = Array.isArray(externalRes.data)
            ? externalRes.data
            : (externalRes.data.clients || externalRes.data.data || externalRes.data.admins || []);
          
          const matched = externalClients.find(ec => 
            (ec.email || ec.ownerEmail || "").toLowerCase() === client.email.toLowerCase()
          );

          if (matched) {
            client.externalClientId = String(matched._id || matched.id);
            console.log(`[SoftwareClient] Found missing externalClientId: ${client.externalClientId}`);
            // We'll save the client later at the end of the function
          }
        } catch (syncErr) {
          console.warn(`[SoftwareClient] ID discovery failed for ${client.email}:`, syncErr.message);
        }
      }

      if (client.externalClientId) {
        const toggleUrl = software.clientToggleStatusApi.replace(":id", client.externalClientId);
        console.log(`[SoftwareClient] Calling External Toggle: ${toggleUrl}`);
        const externalRes = await callExternal(toggleUrl, "PATCH", { status: newStatus ? "active" : "inactive" });

        if (!externalRes.data?.success) {
          const errMsg = externalRes.data?.message || `External API responded with status ${externalRes.status}`;
          // If we just activated a cheque client, we don't want to block the local activation 
          // even if the external toggle fails (though we should log it).
          // But for a normal toggle, we usually return an error.
          if (client.paymentStatus !== 'cheque_pending') {
            return res.status(400).json({ success: false, message: errMsg, externalError: externalRes.data });
          }
          console.error(`[SoftwareClient] External toggle failed but proceeding with local activation:`, errMsg);
        }
      } else {
        console.warn(`[SoftwareClient] Skipping external toggle for ${client.email} — no externalClientId found even after sync attempt.`);
      }
    }

    client.isActive = newStatus;

    // ─── Auto-Complete Payment for Cheques on Activation ───
    if (newStatus && client.paymentStatus === 'cheque_pending') {
      client.paymentStatus = 'completed';
      
      if (client.createdByReseller) {
        try {
          const commission = await CommissionService.calculateCommission(
            client.createdByReseller,
            client.paymentAmount || 0,
            client.softwareId,
            client.selectedServices || []
          );

          const transaction = await Transaction.create({
            clientId: client._id,
            packageId: client.packageId,
            resellerId: client.createdByReseller,
            softwareId: client.softwareId,
            amount: client.paymentAmount || 0,
            resellerCommission: commission,
            adminRevenue: (client.paymentAmount || 0) - commission,
            status: 'success',
            paymentId: client.transactionId || `MANUAL-${Date.now()}`
          });

          await LedgerService.updateLedger(transaction);
          console.log(`[ToggleStatus] Commission processed for client ${client.email}`);
        } catch (commErr) {
          console.error("[ToggleStatus] Commission Error:", commErr.message);
        }
      }
    }

    await client.save();

    emitEvent("software_client_change", { action: "toggle_status", id: client._id });

    const action = newStatus ? "activated" : "deactivated";
    return res.status(200).json({
      success: true,
      message: `Client ${action} on ${softwareName}`,
      isActive: client.isActive
    });
  } catch (err) {
    console.error("[SoftwareClient] toggleStatus error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /api/software-clients/sync/:softwareId ─────────────────────────────
// Fetches all clients from the external software's clientsGetApi,
// matches them to our local records by email, and syncs isActive + paymentStatus.
export const syncClientsFromExternal = async (req, res) => {
  try {
    const { softwareId } = req.params;

    const software = await Software.findById(softwareId);
    if (!software) return res.status(404).json({ success: false, message: "Software not found" });
    if (!software.clientsGetApi) return res.status(400).json({ success: false, message: "No clientsGetApi configured for this software" });

    // Fetch all clients from external software
    const externalRes = await callExternal(software.clientsGetApi, "GET");
    if (!externalRes.data) return res.status(502).json({ success: false, message: "No response from external software" });

    // Support common response shapes
    const externalClients = Array.isArray(externalRes.data)
      ? externalRes.data
      : (externalRes.data.clients || externalRes.data.data || externalRes.data.admins || []);

    if (!externalClients.length) {
      return res.status(200).json({ success: true, message: "No clients found on external software", synced: 0 });
    }

    // Build a lookup map by email (lowercase) from external clients
    const externalMap = {};
    for (const ec of externalClients) {
      const emailKey = (ec.email || ec.ownerEmail || "").toLowerCase();
      if (emailKey) externalMap[emailKey] = ec;
    }

    // Find all our local clients for this software that are still pending
    const localClients = await SoftwareClient.find({ softwareId, paymentStatus: 'pending' });

    let synced = 0;
    for (const local of localClients) {
      const ext = externalMap[local.email.toLowerCase()];
      if (!ext) continue;

      // Determine if the external client is active/paid
      // Event Setu: active = status 'active' + has a paymentId in packageHistory
      const extIsActive = ext.status === 'active' &&
        Array.isArray(ext.packageHistory) &&
        ext.packageHistory.some(h => h.paymentId);

      if (extIsActive && !local.isActive) {
        local.isActive = true;
        local.paymentStatus = 'completed';
        if (!local.externalClientId && (ext._id || ext.id)) {
          local.externalClientId = String(ext._id || ext.id);
        }
        if (ext.package) {
          local.packageName = ext.package.name || local.packageName;
          local.packagePrice = ext.package.price || local.packagePrice;
        }
        if (ext.packageStartDate) local.packageStartDate = new Date(ext.packageStartDate);
        if (ext.packageEndDate) local.packageEndDate = new Date(ext.packageEndDate);
        await local.save();
        synced++;
      } else if (!extIsActive && local.isActive) {
        local.isActive = false;
        local.paymentStatus = 'pending';
        await local.save();
      }
    }

    emitEvent("software_client_change", { action: "sync", softwareId });

    return res.status(200).json({
      success: true,
      message: `Sync complete. ${synced} client(s) activated.`,
      synced
    });
  } catch (err) {
    console.error("[SoftwareClient] syncClientsFromExternal error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /api/software-clients/sync-one/:id ─────────────────────────────────
// Syncs a single local client by fetching the external client list and matching by email.
export const syncOneClient = async (req, res) => {
  try {
    const local = await SoftwareClient.findById(req.params.id);
    if (!local) return res.status(404).json({ success: false, message: "Client not found" });

    const software = await Software.findById(local.softwareId);
    if (!software?.clientsGetApi) return res.status(400).json({ success: false, message: "No clientsGetApi configured" });

    const externalRes = await callExternal(software.clientsGetApi, "GET");
    const externalClients = Array.isArray(externalRes.data)
      ? externalRes.data
      : (externalRes.data.clients || externalRes.data.data || externalRes.data.admins || []);

    const ext = externalClients.find(ec =>
      (ec.email || ec.ownerEmail || "").toLowerCase() === local.email.toLowerCase()
    );

    if (!ext) {
      return res.status(200).json({ success: true, message: "Client not found on external software yet", activated: false });
    }

    const extIsActive = ext.status === 'active' &&
      Array.isArray(ext.packageHistory) &&
      ext.packageHistory.some(h => h.paymentId);

    if (extIsActive && !local.isActive) {
      local.isActive = true;
      local.paymentStatus = 'completed';
      if (!local.externalClientId && (ext._id || ext.id)) {
        local.externalClientId = String(ext._id || ext.id);
      }
      if (ext.package) {
        local.packageName = ext.package.name || local.packageName;
        local.packagePrice = ext.package.price || local.packagePrice;
      }
      if (ext.packageStartDate) local.packageStartDate = new Date(ext.packageStartDate);
      if (ext.packageEndDate) local.packageEndDate = new Date(ext.packageEndDate);
      await local.save();
      emitEvent("software_client_change", { action: "sync_one", id: local._id });
      return res.status(200).json({ success: true, message: "Client activated", activated: true, client: local });
    }

    return res.status(200).json({ success: true, message: "Payment not completed yet", activated: false, externalStatus: ext.status });
  } catch (err) {
    console.error("[SoftwareClient] syncOneClient error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── DELETE /api/software-clients/:id ────────────────────────────────────────
export const deleteSoftwareClient = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await SoftwareClient.findById(id);
    if (!client) return res.status(404).json({ success: false, message: "Client not found" });

    const software = await Software.findById(client.softwareId);

    // Call external delete API if configured and we have an ID
    if (software?.clientDeleteApi && client.externalClientId) {
      const deleteUrl = software.clientDeleteApi.replace(":id", client.externalClientId);
      console.log(`[SoftwareClient] Calling External Delete: ${deleteUrl}`);
      const externalRes = await callExternal(deleteUrl, "DELETE");
      
      if (!externalRes.data?.success) {
        const errMsg = externalRes.data?.message || `External API delete failed (Status: ${externalRes.status})`;
        console.error(`[SoftwareClient] External Delete Failed for client ${id}:`, externalRes.data);
        
        // Even if external delete fails, we want to allow local deletion 
        // so the Admin isn't stuck. We'll just log it.
        if (!errMsg.toLowerCase().includes("not found")) {
          console.warn(`[SoftwareClient] Proceeding with local removal despite external error.`);
        }
      } else {
        console.log(`[SoftwareClient] External Delete Success for client ${id}`);
      }
    } else {
      console.log(`[SoftwareClient] Skipping External Delete — API not configured or externalClientId missing.`);
    }

    await SoftwareClient.findByIdAndDelete(id);
    emitEvent("software_client_change", { action: "delete", id });

    return res.status(200).json({ success: true, message: "Client deleted successfully" });
  } catch (err) {
    console.error("[SoftwareClient] deleteSoftwareClient error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── DELETE /api/software-clients/external/:softwareId/:externalId ───────────
export const deleteExternalOnlyClient = async (req, res) => {
  try {
    const { softwareId, externalId } = req.params;
    const software = await Software.findById(softwareId);
    if (!software) return res.status(404).json({ success: false, message: "Software not found" });

    if (software.clientDeleteApi) {
      const deleteUrl = software.clientDeleteApi.replace(":id", externalId);
      console.log(`[SoftwareClient] External-Only Delete: ${deleteUrl}`);
      const externalRes = await callExternal(deleteUrl, "DELETE");

      if (!externalRes.data?.success) {
        const errMsg = externalRes.data?.message || `External API delete failed`;
        if (!errMsg.toLowerCase().includes("not found")) {
          return res.status(400).json({ success: false, message: errMsg });
        }
      }
    }

    emitEvent("software_client_change", { action: "delete_external", softwareId, externalId });
    return res.status(200).json({ success: true, message: "External client removed" });
  } catch (err) {
    console.error("[SoftwareClient] deleteExternalOnlyClient error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── PATCH /api/software-clients/external/:softwareId/:externalId/toggle-status ───
export const toggleExternalOnlyClientStatus = async (req, res) => {
  try {
    const { softwareId, externalId } = req.params;
    const { status } = req.body; // expected "active" or "inactive"

    const software = await Software.findById(softwareId);
    if (!software || !software.clientToggleStatusApi) {
      return res.status(400).json({ success: false, message: "Software or toggle API not configured" });
    }

    const toggleUrl = software.clientToggleStatusApi.replace(":id", externalId);
    console.log(`[SoftwareClient] External-Only Toggle: ${toggleUrl} -> ${status}`);
    const externalRes = await callExternal(toggleUrl, "PATCH", { status: status || "active" });

    if (!externalRes.data?.success) {
      const errMsg = externalRes.data?.message || `External API responded with status ${externalRes.status}`;
      return res.status(400).json({ success: false, message: errMsg });
    }

    emitEvent("software_client_change", { action: "toggle_external", softwareId, externalId });
    return res.status(200).json({ success: true, message: "External status updated" });
  } catch (err) {
    console.error("[SoftwareClient] toggleExternalOnlyClientStatus error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
