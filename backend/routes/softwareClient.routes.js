import express from "express";
import {
  createSoftwareClient,
  completePayment,
  getAllSoftwareClients,
  getMyClients,
  getSoftwareClientById,
  toggleSoftwareClientStatus,
  toggleExternalOnlyClientStatus,
  syncClientsFromExternal,
  syncOneClient,
  deleteSoftwareClient,
  deleteExternalOnlyClient
} from "../controllers/softwareClient.controller.js";
import {
  getPaymentPageData,
  createOnlineOrder,
  verifyOnlinePayment,
  submitChequePayment
} from "../controllers/softwareClientPayment.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { employeeAuthMiddleware } from "../middleware/employee.middleware.js";
import { uploadCheque } from "../middleware/chequeUpload.middleware.js";

const router = express.Router();

// Protected — specific routes MUST come before /:id wildcards
router.post("/create",                    authMiddleware, createSoftwareClient);
router.get("/all",                        authMiddleware, getAllSoftwareClients);
router.get("/my-clients",                 employeeAuthMiddleware, getMyClients);
router.patch("/toggle-status/:id",        authMiddleware, toggleSoftwareClientStatus);
router.patch("/external/:softwareId/:externalId/toggle-status", authMiddleware, toggleExternalOnlyClientStatus);
router.post("/sync/:softwareId",          authMiddleware, syncClientsFromExternal);
router.post("/sync-one/:id",              authMiddleware, syncOneClient);
router.delete("/external/:softwareId/:externalId", authMiddleware, deleteExternalOnlyClient);

// Public — payment page (uses /:id wildcard, must come after specific routes)
router.get("/pay/:id",                    getPaymentPageData);
router.post("/:id/pay-online",            createOnlineOrder);
router.post("/:id/verify-online",         verifyOnlinePayment);
router.post("/:id/pay-cheque",            uploadCheque.single("chequePhoto"), submitChequePayment);

// Protected — /:id wildcards last
router.post("/:id/complete-payment",      authMiddleware, completePayment);
router.get("/:id",                        authMiddleware, getSoftwareClientById);
router.delete("/:id",                     authMiddleware, deleteSoftwareClient);

export default router;
