## What I'll build

**1. Stripe Connect (Express) onboarding**
- New "Payments" card in Settings with a "Connect Stripe" button.
- Server fn creates a Connect Express account + onboarding link, redirects tutor to Stripe.
- Stores `stripe_account_id` + `stripe_charges_enabled` on `business_settings`.
- "Manage Stripe" + status badge after onboarding.

**2. Pay Now link on invoices**
- Server fn creates a Stripe Checkout Session as a destination charge: `payment_intent_data.application_fee_amount = 1% of total`, `transfer_data.destination = tutor's connected account`.
- Invoice gets `stripe_checkout_url`, `stripe_session_id`, `paid_at`.
- Public route `/pay/$invoiceId` redirects parents to the Checkout URL (so the link is stable and re-clickable).
- Stripe webhook `/api/public/webhooks/stripe` (signature-verified) marks invoice `paid` on `checkout.session.completed` and `account.updated` syncs charges_enabled.

**3. Email to parent**
- Set up Lovable Emails infrastructure + an `invoice-to-parent` template (branded, with the PDF link and Pay Now button).
- "Send to Parent" button on invoice page → server fn enqueues email, updates status → `sent`.
- Disabled if no client email, no Stripe connection, or charges not enabled (clear inline messages).

## Technical details

**DB migration** (`business_settings`): `stripe_account_id text`, `stripe_charges_enabled boolean default false`, `stripe_onboarded_at timestamptz`.
**DB migration** (`invoices`): `stripe_checkout_url text`, `stripe_session_id text`, `paid_at timestamptz`, `sent_to_parent_at timestamptz`.

**Server fns** (under `src/lib/stripe.functions.ts`, all `requireSupabaseAuth`):
- `createConnectOnboardingLink()` — creates/reuses Express account, returns AccountLink URL.
- `refreshStripeStatus()` — calls `stripe.accounts.retrieve`, syncs flags.
- `createInvoiceCheckout({ invoiceId })` — creates Session, persists URL/session id.

**Public routes**:
- `/api/public/webhooks/stripe` — verifies signature with `STRIPE_WEBHOOK_SECRET`, handles `checkout.session.completed` + `account.updated`.
- `/pay/$invoiceId` — public loader fetches invoice via narrow `TO anon` SELECT (only `id, stripe_checkout_url, status, total, client_name, invoice_number`); redirects to Stripe.

**Email**: `email_domain--setup_email_infra` + `scaffold_transactional_email`, then `invoice-to-parent.tsx` template + `sendInvoiceEmail` server fn.

**Secrets needed from you**: `STRIPE_SECRET_KEY` (your platform live or test sk_), `STRIPE_WEBHOOK_SECRET` (after I scaffold the webhook URL I'll give you the value to paste into Stripe Dashboard → Webhooks, then you save it).

**Note on fees**: 1% application fee is on the gross. Stripe's own processing fee (~1.5%+20p UK cards) comes out of the tutor's share — standard for Connect destination charges.

## Build order
1. DB migration
2. Add `STRIPE_SECRET_KEY` secret + install `stripe` package
3. Connect onboarding (Settings UI + server fns)
4. Checkout + webhook + `/pay/$invoiceId`
5. Email infra + template + Send to Parent
6. Test end-to-end