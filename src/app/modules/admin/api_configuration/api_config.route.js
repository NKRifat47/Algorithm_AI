import { Router } from "express";
import { AdminApiConfigController } from "./api_config.controller.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";

const router = Router();

router.get("/", checkAuthMiddleware("ADMIN"), AdminApiConfigController.getApiConfig);
router.put("/:id", checkAuthMiddleware("ADMIN"), AdminApiConfigController.updateApiConfig);
router.post("/keys", checkAuthMiddleware("ADMIN"), AdminApiConfigController.createApiKey);
router.delete("/:id", checkAuthMiddleware("ADMIN"), AdminApiConfigController.deleteApiKey);

export const AdminApiConfigRouter = router;
