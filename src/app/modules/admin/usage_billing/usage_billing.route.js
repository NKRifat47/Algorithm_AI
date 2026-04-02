import { Router } from "express";
import { AdminUsageBillingController } from "./usage_billing.controller.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";

const router = Router();

router.get("/", checkAuthMiddleware("ADMIN"), AdminUsageBillingController.getUsageAndBilling);
router.get("/plans", checkAuthMiddleware("ADMIN"), AdminUsageBillingController.getPlans);

export const AdminUsageBillingRouter = router;
