import { stripe } from "./stripe.client.js";
import { AppError } from "../../../errorHelper/appError.js";
import { AdminNotificationService } from "../../admin/notification/notification.service.js";

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const addYears = (date, years) => {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
};

export const UserPaymentService = {
  createStripeCheckoutSession: async (
    prisma,
    { userId, planId, interval, successUrl, cancelUrl, frontendUrl },
  ) => {
    const [user, plan] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.plan.findUnique({ where: { id: planId } }),
    ]);

    if (!user) throw new AppError(404, "User not found");
    if (!plan) throw new AppError(404, "Plan not found");

    const priceId =
      interval === "monthly"
        ? plan.stripeMonthlyPriceId
        : plan.stripeYearlyPriceId;

    if (!priceId) {
      throw new AppError(
        400,
        `Stripe price id missing for ${interval} on this plan`,
      );
    }

    const finalSuccessUrl =
      successUrl ||
      `${frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancelUrl || `${frontendUrl}/billing/cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      customer_email: user.email,
      metadata: {
        userId,
        planId,
        interval,
      },
      line_items: [{ price: priceId, quantity: 1 }],
    });

    return {
      id: session.id,
      url: session.url,
    };
  },

  handleStripeWebhook: async (prisma, event) => {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        const userId = session?.metadata?.userId;
        const planId = session?.metadata?.planId;
        const interval = session?.metadata?.interval;

        if (!userId || !planId || !interval) {
          throw new AppError(
            400,
            "Missing required metadata on Stripe session",
          );
        }

        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!plan) throw new AppError(404, "Plan not found");

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        // Minimal dedupe: if user already has an active subscription, do nothing.
        const existingActive = await prisma.subscription.findFirst({
          where: {
            userId,
            status: "ACTIVE",
            endDate: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        });
        if (existingActive) return { handled: true, skipped: true };

        const startDate = new Date();
        const endDate =
          interval === "yearly"
            ? addYears(startDate, 1)
            : addMonths(startDate, 1);

        const price =
          interval === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;

        await prisma.payment.create({
          data: {
            userId,
            provider: "STRIPE",
            amount: price,
            status: "PAID",
          },
        });

        await prisma.subscription.create({
          data: {
            userId,
            planId,
            price,
            status: "ACTIVE",
            startDate,
            endDate,
          },
        });

        await prisma.user.update({
          where: { id: userId },
          data: { planId },
        });

        await prisma.activityLog.create({
          data: {
            type: "PLAN_PURCHASED",
            message: `Plan purchased (${plan.name})`,
            userEmail: user?.email || "Unknown User",
            meta: {
              userId,
              planId,
              planName: plan.name,
              interval,
              price,
            },
          },
        });

        await AdminNotificationService.notifyAdmins(prisma, {
          type: "PLAN_PURCHASED",
          message: `${user?.email || "Unknown User"} purchased ${plan.name} plan`,
          meta: { userId, planId, planName: plan.name, interval, price },
        });

        return { handled: true };
      }

      default:
        return { handled: false };
    }
  },
};
