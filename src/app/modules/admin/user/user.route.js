import { Router } from "express";
import { AdminUserController } from "./user.controller.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";

const router = Router();

router.get("/", checkAuthMiddleware("ADMIN"), AdminUserController.getAllUsers);

router.delete(
  "/:id",
  checkAuthMiddleware("ADMIN"),
  AdminUserController.deleteUser,
);

export const AdminUserRouter = router;
