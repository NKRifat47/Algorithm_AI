import { Router } from "express";
import { AdminDashboardController } from "./dashboard.controller.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";

const router = Router();

router.get(
  "/",
  checkAuthMiddleware("ADMIN"),
  AdminDashboardController.getDashboardStats,
);

router.get(
  "/sales-track",
  checkAuthMiddleware("ADMIN"),
  AdminDashboardController.getSalesTrack,
);

export const AdminDashboardRouter = router;

