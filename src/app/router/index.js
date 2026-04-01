import { Router } from "express";
import { OtpRouter } from "../modules/otp/otp.route.js";
import { AdminAuthRouter } from "../modules/admin/auth/auth.route.js";
import { AdminUserRouter } from "../modules/admin/user/user.route.js";

export const router = Router();
const moduleRoutes = [
  {
    path: "/otp",
    route: OtpRouter,
  },
  {
    path: "/admin/auth",
    route: AdminAuthRouter,
  },
  {
    path: "/admin/user",
    route: AdminUserRouter,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});
