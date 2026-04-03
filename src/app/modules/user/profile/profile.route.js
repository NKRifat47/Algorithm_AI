import { Router } from "express";
import { UserProfileController } from "./profile.controller.js";
import { UserProfileValidation } from "./profile.validation.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { uploadAvatar } from "../../../utils/fileUpload.js";

const router = Router();

router.get("/", checkAuthMiddleware("USER"), UserProfileController.getProfile);

router.patch(
  "/",
  checkAuthMiddleware("USER"),
  uploadAvatar.single("avatar"),
  validateRequest(UserProfileValidation.updateProfileSchema),
  UserProfileController.updateProfile,
);

export const UserProfileRouter = router;
