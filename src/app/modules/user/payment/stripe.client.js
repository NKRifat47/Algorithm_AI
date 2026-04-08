import Stripe from "stripe";
import { envVars } from "../../../config/env.js";

export const stripe = new Stripe(envVars.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});
