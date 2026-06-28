import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  _stripe = new Stripe(key, { apiVersion: "2025-09-30.clover" as Stripe.LatestApiVersion });
  return _stripe;
}

export const PLATFORM_FEE_BPS = 100; // 1.00%

export function applicationFeeAmountFor(totalPence: number): number {
  return Math.round((totalPence * PLATFORM_FEE_BPS) / 10_000);
}
