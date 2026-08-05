import express from "express";
import { 
    createTask, 
    getTasks, 
    updateTask, 
    deleteTask, 
    updateTaskStatusEmployee, 
    reviewTask,
    getTaskStats,
    getTaskPerformance
} from "../controllers/task.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { employeeAuthMiddleware } from "../middleware/employee.middleware.js";
import { uploadTaskFiles } from "../middleware/upload.middleware.js";

const router = express.Router();

// Admin Routes (Protected by authMiddleware)
router.post("/create", authMiddleware, uploadTaskFiles.array('attachments'), createTask);
router.get("/all", authMiddleware, getTasks);
router.patch("/update/:id", authMiddleware, updateTask);
router.delete("/delete/:id", authMiddleware, deleteTask);
router.patch("/review/:id", authMiddleware, reviewTask);
router.get("/stats-admin", authMiddleware, getTaskStats);

// Employee Routes (Protected by employeeAuthMiddleware)
router.get("/my-tasks", employeeAuthMiddleware, getTasks);
router.patch("/submit/:id", employeeAuthMiddleware, uploadTaskFiles.array('attachments'), updateTaskStatusEmployee);
router.get("/stats-employee", employeeAuthMiddleware, getTaskStats);
router.get("/performance-employee", employeeAuthMiddleware, getTaskPerformance);

export default router;
