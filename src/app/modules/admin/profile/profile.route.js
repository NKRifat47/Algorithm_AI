import { Router } from "express";
import { AdminProfileController } from "./profile.controller.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { uploadAvatar } from "../../../utils/fileUpload.js";

const router = Router();

router.get(
  "/",
  checkAuthMiddleware("ADMIN"),
  AdminProfileController.getProfile,
);
router.put(
  "/",
  checkAuthMiddleware("ADMIN"),
  uploadAvatar.single("avatar"),
  AdminProfileController.updateProfile,
);

export const AdminProfileRouter = router;
