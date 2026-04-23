import prisma from "../../../prisma/client.js";
import { envVars } from "../../../config/env.js";
import { stripe } from "./stripe.client.js";
import { UserPaymentService } from "./payment.service.js";

const createStripeCheckoutSession = async (req, res, next) => {
  try {
    const { planId, interval, successUrl, cancelUrl } = req.body;

    const data = await UserPaymentService.createStripeCheckoutSession(prisma, {
      userId: req.user.id,
      planId,
      interval,
      successUrl,
      cancelUrl,
      frontendUrl: envVars.FRONT_END_URL,
    });

    return res.json({
      success: true,
      message: "Stripe checkout session created successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

const stripeWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["stripe-signature"];
    const rawBody = req.rawBody;

    if (!signature) {
      return res.status(400).json({
        success: false,
        message: "Missing Stripe signature header",
      });
    }

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      envVars.STRIPE_WEBHOOK_SECRET,
    );

    await UserPaymentService.handleStripeWebhook(prisma, event);

    return res.json({ received: true });
  } catch (error) {
    next(error);
  }
};

const getPlans = async (req, res, next) => {
  try {
    const data = await UserPaymentService.getPlans(prisma);
    return res.json({
      success: true,
      message: "Plans retrieved successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const UserPaymentController = {
  getPlans,
  createStripeCheckoutSession,
  stripeWebhook,
};
