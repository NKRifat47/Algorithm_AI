import { Router } from "express";
import { AdminAuthController } from "./auth.controller.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { rateLimit } from "../../../middleware/rateLimit.js";

const router = Router();

<<<<<<< HEAD
router.post("/login", AdminAuthController.adminLogin);
router.post("/refresh-token", AdminAuthController.adminRefreshToken);
router.post("/logout", AdminAuthController.adminLogout);
router.post("/forgot-password", AdminAuthController.adminForgotPassword);
router.post("/verify", AdminAuthController.adminForgotPasswordVerify);
=======
router.post(
  "/login",
  rateLimit({
    keyPrefix: "rl:admin:login",
    windowSeconds: 60,
    max: 10,
    message: "Too many login attempts. Please wait and try again.",
    getKeySuffix: (req) => req.body?.email || req.ip,
  }),
  AdminAuthController.adminLogin,
);
router.post("/refresh-token", AdminAuthController.adminRefreshToken);
router.post("/logout", AdminAuthController.adminLogout);
router.post(
  "/forgot-password",
  rateLimit({
    keyPrefix: "rl:admin:forgot-password",
    windowSeconds: 60,
    max: 5,
    message: "Too many requests. Please wait and try again.",
    getKeySuffix: (req) => req.body?.email || req.ip,
  }),
  AdminAuthController.adminForgotPassword,
);
router.post(
  "/verify",
  rateLimit({
    keyPrefix: "rl:admin:verify-forgot-password",
    windowSeconds: 60,
    max: 12,
    message: "Too many attempts. Please wait and try again.",
    getKeySuffix: (req) => req.body?.email || req.ip,
  }),
  AdminAuthController.adminForgotPasswordVerify,
);
>>>>>>> 9689a90408c2e614802d1d05f162fb58eeb576a7
router.post("/reset", AdminAuthController.adminForgotPasswordReset);
router.post(
  "/change-password",
  checkAuthMiddleware("ADMIN"),
  AdminAuthController.adminChangePassword,
);

export const AdminAuthRouter = router;
