import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function originFromRequest(): Promise<string> {
  // Build a return URL from the incoming request headers.
  // Falls back to the published URL when not in a request.
  try {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const proto = getRequestHeader("x-forwarded-proto") || "https";
    const host = getRequestHeader("x-forwarded-host") || getRequestHeader("host");
    if (host) return `${proto}://${host}`;
  } catch {
    /* ignore */
  }
  return "https://tutor-invoice-pro.lovable.app";
}


/**
 * Create (or reuse) a Stripe Connect Express account for the tutor and return an onboarding link.
 */
export const createConnectOnboardingLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({}).passthrough().parse(d ?? {}))
  .handler(async ({ context }) => {
    const { getStripe } = await import("./stripe.server");
    const stripe = getStripe();
    const { supabase, userId } = context;

    const { data: settings, error } = await supabase
      .from("business_settings")
      .select("stripe_account_id, email, tutor_name, business_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    let accountId = settings?.stripe_account_id as string | null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: settings?.email || undefined,
        business_profile: {
          name: settings?.business_name || settings?.tutor_name || "Tutor",
          product_description: "Private tutoring services",
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { user_id: userId },
      });
      accountId = account.id;
      const { error: uErr } = await supabase
        .from("business_settings")
        .upsert(
          { user_id: userId, stripe_account_id: accountId },
          { onConflict: "user_id" },
        );
      if (uErr) throw new Error(uErr.message);
    }

    const origin = await originFromRequest();
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/settings?stripe=refresh`,
      return_url: `${origin}/settings?stripe=return`,
      type: "account_onboarding",
    });

    return { url: link.url };
  });

/**
 * Refresh the tutor's Stripe account status (charges_enabled flag).
 */
export const refreshStripeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({}).passthrough().parse(d ?? {}))
  .handler(async ({ context }) => {
    const { getStripe } = await import("./stripe.server");
    const stripe = getStripe();
    const { supabase, userId } = context;

    const { data: settings } = await supabase
      .from("business_settings")
      .select("stripe_account_id")
      .eq("user_id", userId)
      .maybeSingle();

    const accountId = settings?.stripe_account_id as string | null;
    if (!accountId) {
      return { connected: false, charges_enabled: false, details_submitted: false };
    }
    const account = await stripe.accounts.retrieve(accountId);
    const charges_enabled = Boolean(account.charges_enabled);
    const details_submitted = Boolean(account.details_submitted);

    await supabase
      .from("business_settings")
      .update({
        stripe_charges_enabled: charges_enabled,
        stripe_onboarded_at: charges_enabled ? new Date().toISOString() : null,
      })
      .eq("user_id", userId);

    return { connected: true, charges_enabled, details_submitted };
  });

/**
 * Create a Stripe Checkout Session for an invoice, with a 1% application fee
 * routed to the platform and the rest going to the tutor's connected account.
 */
export const createInvoiceCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ invoiceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { getStripe, applicationFeeAmountFor } = await import("./stripe.server");
    const stripe = getStripe();
    const { supabase, userId } = context;

    const [invRes, settingsRes] = await Promise.all([
      supabase
        .from("invoices")
        .select("id, invoice_number, invoice_title, total, client_name, client_email, status")
        .eq("id", data.invoiceId)
        .single(),
      supabase
        .from("business_settings")
        .select("stripe_account_id, stripe_charges_enabled")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    if (invRes.error) throw new Error(invRes.error.message);
    const invoice = invRes.data;
    const settings = settingsRes.data;

    const accountId = settings?.stripe_account_id as string | null;
    if (!accountId) throw new Error("Connect your Stripe account in Settings first.");
    if (!settings?.stripe_charges_enabled) {
      throw new Error("Your Stripe account is not ready to accept payments yet. Complete Stripe onboarding.");
    }

    const totalPence = Math.round(Number(invoice.total) * 100);
    if (totalPence <= 0) throw new Error("Invoice total must be greater than zero.");

    const origin = await originFromRequest();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: totalPence,
            product_data: {
              name: `Invoice ${invoice.invoice_number} — ${invoice.invoice_title}`,
              description: `Tutoring for ${invoice.client_name}`,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmountFor(totalPence),
        transfer_data: { destination: accountId },
        description: `Invoice ${invoice.invoice_number}`,
        metadata: { invoice_id: invoice.id, tutor_user_id: userId },
      },
      customer_email: invoice.client_email || undefined,
      success_url: `${origin}/pay/${invoice.id}?paid=1`,
      cancel_url: `${origin}/pay/${invoice.id}?cancelled=1`,
      metadata: { invoice_id: invoice.id, tutor_user_id: userId },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");

    const { error: uErr } = await supabase
      .from("invoices")
      .update({
        stripe_checkout_url: session.url,
        stripe_session_id: session.id,
      })
      .eq("id", invoice.id);
    if (uErr) throw new Error(uErr.message);

    return { url: session.url, sessionId: session.id };
  });

/**
 * Expose the configured Stripe environment so the UI can show Test/Live mode.
 * Does not reveal the secret key.
 */
export const getStripeMode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const key = process.env.STRIPE_SECRET_KEY;
    const webhook = process.env.STRIPE_WEBHOOK_SECRET;
    let mode: "test" | "live" | "unset" = "unset";
    if (key) {
      if (key.startsWith("sk_test_")) mode = "test";
      else if (key.startsWith("sk_live_")) mode = "live";
    }
    return { mode, webhookConfigured: Boolean(webhook) };
  });

/**
 * Verify the configured Stripe secret key with a lightweight authenticated
 * API call. Returns a clear success/error result for display in Settings.
 */
export const testStripeConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({}).passthrough().parse(d ?? {}))
  .handler(async () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return { ok: false as const, message: "No Stripe secret key is configured." };
    }
    const mode: "test" | "live" | "unknown" = key.startsWith("sk_test_")
      ? "test"
      : key.startsWith("sk_live_")
        ? "live"
        : "unknown";
    try {
      const { getStripe } = await import("./stripe.server");
      const stripe = getStripe();
      // Lightweight authenticated call — succeeds only with a valid secret key.
      const balance = await stripe.balance.retrieve();
      return {
        ok: true as const,
        mode,
        livemode: balance.livemode,
        message: `Stripe key works (${mode} mode).`,
      };
    } catch (e) {
      const err = e as { message?: string; code?: string; type?: string };
      return {
        ok: false as const,
        mode,
        message:
          err?.message || err?.code || err?.type || "Stripe rejected the configured API key.",
      };
    }
  });
