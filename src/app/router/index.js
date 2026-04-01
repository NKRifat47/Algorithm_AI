import { Router } from "express";
import { OtpRouter } from "../modules/otp/otp.route.js";
import { AdminAuthRouter } from "../modules/admin/auth/auth.route.js";

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
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});
