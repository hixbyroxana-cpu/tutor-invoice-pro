import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        const apiKey = process.env.STRIPE_SECRET_KEY;
        if (!secret || !apiKey) {
          return new Response("Server not configured", { status: 500 });
        }

        const sig = request.headers.get("stripe-signature");
        if (!sig) return new Response("Missing signature", { status: 400 });
        const rawBody = await request.text();

        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(apiKey, {
          apiVersion: "2025-09-30.clover" as unknown as Stripe.LatestApiVersion,
        });

        let event: import("stripe").Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(rawBody, sig, secret);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Invalid payload";
          return new Response(`Webhook Error: ${msg}`, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        try {
          switch (event.type) {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded": {
              const session = event.data.object as import("stripe").Stripe.Checkout.Session;
              const invoiceId = session.metadata?.invoice_id;
              if (invoiceId && session.payment_status === "paid") {
                await supabaseAdmin
                  .from("invoices")
                  .update({ status: "paid", paid_at: new Date().toISOString() })
                  .eq("id", invoiceId);
              }
              break;
            }
            case "account.updated": {
              const account = event.data.object as import("stripe").Stripe.Account;
              const userId = account.metadata?.user_id;
              if (userId) {
                await supabaseAdmin
                  .from("business_settings")
                  .update({
                    stripe_charges_enabled: Boolean(account.charges_enabled),
                    stripe_onboarded_at: account.charges_enabled ? new Date().toISOString() : null,
                  })
                  .eq("user_id", userId);
              }
              break;
            }
            default:
              break;
          }
        } catch (err) {
          console.error("Stripe webhook handler error", err);
          return new Response("Handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
