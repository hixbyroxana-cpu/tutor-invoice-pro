import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Settings = {
  stripe_account_id: string | null;
  email: string | null;
  tutor_name: string | null;
  business_name: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: `Expected POST method. Got ${req.method}` }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.action !== "connect") {
      return json({ error: "Invalid action" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !supabaseKey || !stripeKey) {
      return json({ error: "Server not configured" }, 500);
    }
    if (!authHeader) {
      return json({ error: "Not signed in" }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: "Not signed in" }, 401);
    }

    const { data: settings, error } = await supabase
      .from("business_settings")
      .select("stripe_account_id, email, tutor_name, business_name")
      .eq("user_id", userData.user.id)
      .maybeSingle<Settings>();
    if (error) return json({ error: error.message }, 400);

    let accountId = settings?.stripe_account_id ?? null;
    if (!accountId) {
      const account = await stripeRequest<{ id: string }>(stripeKey, "/v1/accounts", {
        type: "express",
        email: settings?.email || undefined,
        "business_profile[name]": settings?.business_name || settings?.tutor_name || "Tutor",
        "business_profile[product_description]": "Private tutoring services",
        "capabilities[card_payments][requested]": "true",
        "capabilities[transfers][requested]": "true",
        "metadata[user_id]": userData.user.id,
      });
      accountId = account.id;

      const { error: updateError } = await supabase
        .from("business_settings")
        .upsert({ user_id: userData.user.id, stripe_account_id: accountId }, { onConflict: "user_id" });
      if (updateError) return json({ error: updateError.message }, 400);
    }

    const origin = req.headers.get("origin") || "https://tutor-invoice-pro.lovable.app";
    const link = await stripeRequest<{ url: string }>(stripeKey, "/v1/account_links", {
      account: accountId,
      refresh_url: `${origin}/settings?stripe=refresh`,
      return_url: `${origin}/settings?stripe=return`,
      type: "account_onboarding",
    });

    return json({ url: link.url }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to create Stripe onboarding link";
    return json({ error: message }, 500);
  }
});

async function stripeRequest<T>(secretKey: string, path: string, params: Record<string, string | undefined>): Promise<T> {
  const form = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") form.append(key, value);
  });

  const response = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Stripe rejected the request");
  }
  return data as T;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}