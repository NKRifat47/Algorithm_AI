import { z } from "zod";

const createStripeCheckoutSessionSchema = z.object({
  body: z.object({
    planId: z.string({ required_error: "planId is required" }),
    interval: z.enum(["monthly", "yearly"], {
      required_error: "interval is required",
    }),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
  }),
});

export const UserPaymentValidation = {
  createStripeCheckoutSessionSchema,
};
