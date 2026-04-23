import { Router } from "express";
import { OtpRouter } from "../modules/otp/otp.route.js";
import { AdminAuthRouter } from "../modules/admin/auth/auth.route.js";
import { AdminUserRouter } from "../modules/admin/user/user.route.js";
import { AdminUsageBillingRouter } from "../modules/admin/usage_billing/usage_billing.route.js";
import { AdminApiConfigRouter } from "../modules/admin/api_configuration/api_config.route.js";
import { AdminProfileRouter } from "../modules/admin/profile/profile.route.js";
import { AdminDashboardRouter } from "../modules/admin/dashboard/dashboard.route.js";
import { AdminNotificationRouter } from "../modules/admin/notification/notification.route.js";
import { UserAuthRouter } from "../modules/user/auth/auth.route.js";
import { UserProfileRouter } from "../modules/user/profile/profile.route.js";
import { NewTaskRouter } from "../modules/user/new_task/new_task.route.js";
import { ProjectRouter } from "../modules/user/project/project.route.js";
import { LibraryRouter } from "../modules/user/library/library.route.js";
import { UserPaymentRouter } from "../modules/user/payment/payment.route.js";

export const router = Router();
const moduleRoutes = [
  {
    path: "/otp",
    route: OtpRouter,
  },

  // Admin Route Start From Here
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
  {
    path: "/admin/dashboard",
    route: AdminDashboardRouter,
  },
  {
    path: "/admin/notification",
    route: AdminNotificationRouter,
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
  {
    path: "/user/project",
    route: ProjectRouter,
  },
  {
    path: "/user/library",
    route: LibraryRouter,
  },
  {
    path: "/user/payment",
    route: UserPaymentRouter,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});
