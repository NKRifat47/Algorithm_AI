import { Router } from "express";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { AdminNotificationController } from "./notification.controller.js";

const router = Router();

router.get("/", checkAuthMiddleware("ADMIN"), AdminNotificationController.list);

router.patch(
  "/:id/read",
  checkAuthMiddleware("ADMIN"),
  AdminNotificationController.markRead,
);

router.patch(
  "/read-all",
  checkAuthMiddleware("ADMIN"),
  AdminNotificationController.markAllRead,
);

export const AdminNotificationRouter = router;

