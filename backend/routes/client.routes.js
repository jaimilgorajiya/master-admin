import express from "express";
import { createClient, getAllClients, updateClient, toggleClientStatus, deleteClient, checkClientStatusByEmail, getClientHistory, sendManualReminder } from "../controllers/client.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Protected routes
router.post("/create", authMiddleware, createClient);
router.get("/all", authMiddleware, getAllClients);
router.put("/update/:id", authMiddleware, updateClient);
router.patch("/toggle-status/:id", authMiddleware, toggleClientStatus);
router.delete("/delete/:id", authMiddleware, deleteClient);
router.get("/history/:id", authMiddleware, getClientHistory);
// Manual reminder route removed
// router.post("/send-reminder", authMiddleware, sendManualReminder);

// Employee Routes
import { employeeAuthMiddleware } from "../middleware/employee.middleware.js";
router.get("/my-clients", employeeAuthMiddleware, getAllClients);
router.post("/employee-create", employeeAuthMiddleware, createClient);

// Public route for verifying client status
router.get("/check-status/:email", checkClientStatusByEmail);

// --- Payment & Cheque Routes (Public) ---
import { 
    getServiceClientPaymentData, 
    createServiceClientOrder, 
    verifyServiceClientPayment, 
    submitServiceClientCheque 
} from "../controllers/serviceClientPayment.controller.js";
import { uploadCheque } from "../middleware/chequeUpload.middleware.js";

router.get("/pay-data/:id", getServiceClientPaymentData);
router.post("/:id/pay-online", createServiceClientOrder);
router.post("/:id/verify-online", verifyServiceClientPayment);
router.post("/:id/pay-cheque", uploadCheque.single("chequePhoto"), submitServiceClientCheque);

export default router;
