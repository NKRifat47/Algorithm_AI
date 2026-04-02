import { Router } from "express";
import { OtpRouter } from "../modules/otp/otp.route.js";
import { AdminAuthRouter } from "../modules/admin/auth/auth.route.js";
import { AdminUserRouter } from "../modules/admin/user/user.route.js";
import { AdminUsageBillingRouter } from "../modules/admin/usage_billing/usage_billing.route.js";

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
  {
    path: "/admin/usage-billing",
    route: AdminUsageBillingRouter,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});
