import { Router } from "express";
import { AdminDashboardController } from "./dashboard.controller.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";

const router = Router();

router.get(
  "/",
  checkAuthMiddleware("ADMIN"),
  AdminDashboardController.getDashboardStats,
);

export const AdminDashboardRouter = router;

