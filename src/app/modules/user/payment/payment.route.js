import { Router } from "express";
import { UserPaymentController } from "./payment.controller.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { UserPaymentValidation } from "./payment.validation.js";

const router = Router();

router.get("/plans", checkAuthMiddleware("USER"), UserPaymentController.getPlans);

router.post(
  "/stripe/checkout-session",
  checkAuthMiddleware("USER"),
  validateRequest(UserPaymentValidation.createStripeCheckoutSessionSchema),
  UserPaymentController.createStripeCheckoutSession,
);

router.post("/stripe/webhook", UserPaymentController.stripeWebhook);

export const UserPaymentRouter = router;
