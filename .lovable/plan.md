Plan:

1. **Make Stripe POST calls unambiguous**
   - Change the Settings-only Stripe POST server functions (`createConnectOnboardingLink`, `refreshStripeStatus`, `testStripeConnection`) so their validators require a small explicit payload instead of accepting an empty object.
   - Example payload shape: `{ action: "connect" }`, `{ action: "refresh" }`, `{ action: "test" }`.

2. **Update every Settings button/call site**
   - Connect Stripe / Continue onboarding / Manage on Stripe sends `{ data: { action: "connect" } }`.
   - Refresh status, including the auto-refresh after returning from Stripe, sends `{ data: { action: "refresh" } }`.
   - Test Stripe connection sends `{ data: { action: "test" } }`.
   - Keep `getStripeMode` as GET because it is read-only.

3. **Verify in the running app**
   - Use the browser network tools/Playwright to click the Stripe actions from Settings.
   - Confirm the Stripe mutation requests are POST, not GET.
   - Confirm the user no longer sees `expected POST method. Got GET`.