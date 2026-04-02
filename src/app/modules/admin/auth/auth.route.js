import { Router } from "express";
import { AdminAuthController } from "./auth.controller.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";

const router = Router();

router.post("/login", AdminAuthController.adminLogin);
router.post("/forgot-password", AdminAuthController.adminForgotPassword);
router.post("/verify", AdminAuthController.adminForgotPasswordVerify);
router.post("/reset", AdminAuthController.adminForgotPasswordReset);
router.post(
  "/change-password",
  checkAuthMiddleware("ADMIN"),
  AdminAuthController.adminChangePassword,
);

export const AdminAuthRouter = router;
