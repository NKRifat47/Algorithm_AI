import { Router } from "express";
import { OtpRouter } from "../modules/otp/otp.route.js";
import { AdminAuthRouter } from "../modules/admin/auth/auth.route.js";
import { AdminUserRouter } from "../modules/admin/user/user.route.js";
import { AdminUsageBillingRouter } from "../modules/admin/usage_billing/usage_billing.route.js";
import { AdminApiConfigRouter } from "../modules/admin/api_configuration/api_config.route.js";
import { AdminProfileRouter } from "../modules/admin/profile/profile.route.js";
import { UserAuthRouter } from "../modules/user/auth/auth.route.js";
import { UserProfileRouter } from "../modules/user/profile/profile.route.js";
import { NewTaskRouter } from "../modules/user/new_task/new_task.route.js";

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
  {
    path: "/admin/api-configuration",
    route: AdminApiConfigRouter,
  },

  {
    path: "/admin/profile",
    route: AdminProfileRouter,
  },

  // User Route Start From Here

  {
    path: "/user/auth",
    route: UserAuthRouter,
  },
  {
    path: "/user/profile",
    route: UserProfileRouter,
  },

  {
    path: "/user/new-task",
    route: NewTaskRouter,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});
