import { Router } from "express";
import { UserAuthController } from "./auth.controller.js";
import { UserAuthValidation } from "./auth.validation.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";

const router = Router();

router.post(
  "/register",
  validateRequest(UserAuthValidation.registerSchema),
  UserAuthController.register,
);

router.post(
  "/send-otp",
  validateRequest(UserAuthValidation.sendOtpSchema),
  UserAuthController.sendOtp,
);

router.post(
  "/verify-otp",
  validateRequest(UserAuthValidation.verifyOtpSchema),
  UserAuthController.verifyOtp,
);

router.post(
  "/login",
  validateRequest(UserAuthValidation.loginSchema),
  UserAuthController.login,
);

router.post(
  "/forgot-password",
  validateRequest(UserAuthValidation.forgotPasswordSchema),
  UserAuthController.forgotPassword,
);

router.post(
  "/verify-forgot-password",
  validateRequest(UserAuthValidation.verifyForgotPasswordSchema),
  UserAuthController.verifyForgotPassword,
);

router.post(
  "/reset-password",
  validateRequest(UserAuthValidation.resetPasswordSchema),
  UserAuthController.resetPassword,
);

router.patch(
  "/change-password",
  checkAuthMiddleware("USER"),
  validateRequest(UserAuthValidation.changePasswordSchema),
  UserAuthController.changePassword,
);

export const UserAuthRouter = router;
