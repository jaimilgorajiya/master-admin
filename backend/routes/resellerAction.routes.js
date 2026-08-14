import express from "express";
const router = express.Router();
import { 
    addTeamMember, getTeam, deleteTeamMember, 
    getMyPermissions, resellerCreateClient, getMyClients,
    getAnalytics, getRevenue, toggleClientStatus 
} from "../controllers/resellerAction.controller.js";
import { resellerAuthMiddleware, onlyResellerAdmin } from "../middleware/resellerAuth.middleware.js";

router.use(resellerAuthMiddleware);

// Team Management
router.get("/team", onlyResellerAdmin, getTeam);
router.post("/team", onlyResellerAdmin, addTeamMember);
router.delete("/team/:id", onlyResellerAdmin, deleteTeamMember);

// Client Management
router.get("/clients", getMyClients);
router.post("/clients", resellerCreateClient);
router.patch("/clients/toggle-status/:id", toggleClientStatus);

// Analytics
router.get("/performance-overview", getAnalytics);
router.get("/revenue", getRevenue);

// Permissions
router.get("/my-permissions", getMyPermissions);

export default router;
