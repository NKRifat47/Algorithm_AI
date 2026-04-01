import { Router } from "express";
import { AdminAuthController } from "./auth.controller.js";

const router = Router();

router.post("/login", AdminAuthController.adminLogin);
router.post("/forgot-password", AdminAuthController.adminForgotPassword);
router.post("/verify", AdminAuthController.adminForgotPasswordVerify);
router.post("/reset", AdminAuthController.adminForgotPasswordReset);

export const AdminAuthRouter = router;
