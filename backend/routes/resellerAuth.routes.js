import express from "express";
const router = express.Router();
import { resellerLogin, resellerEmployeeLogin, logout } from "../controllers/resellerAuth.controller.js";

router.post("/login", resellerLogin);
router.post("/employee/login", resellerEmployeeLogin);
router.post("/logout", logout);

export default router;
