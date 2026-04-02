import { Router } from "express";
import { AdminProfileController } from "./profile.controller.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";

const router = Router();

router.get("/", checkAuthMiddleware("ADMIN"), AdminProfileController.getProfile);
router.put("/", checkAuthMiddleware("ADMIN"), AdminProfileController.updateProfile);

export const AdminProfileRouter = router;
