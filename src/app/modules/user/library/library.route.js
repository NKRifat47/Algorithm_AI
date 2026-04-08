import { Router } from "express";
import validateRequest from "../../../middleware/validateRequest.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { LibraryController } from "./library.controller.js";
import { LibraryValidation } from "./library.validation.js";

const router = Router();

// Library list + search + filters
router.get(
  "/templates",
  checkAuthMiddleware("USER"),
  validateRequest(LibraryValidation.listTemplatesSchema),
  LibraryController.listTemplates,
);

// Favourite templates of logged-in user
router.get(
  "/favorites",
  checkAuthMiddleware("USER"),
  validateRequest(LibraryValidation.listFavoritesSchema),
  LibraryController.listFavorites,
);

// Toggle favourite (heart icon)
router.post(
  "/templates/:templateId/favorite",
  checkAuthMiddleware("USER"),
  validateRequest(LibraryValidation.toggleFavoriteSchema),
  LibraryController.toggleFavorite,
);

export const LibraryRouter = router;
