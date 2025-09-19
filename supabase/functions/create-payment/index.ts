import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Configure CORS via env: set ALLOWED_ORIGINS as comma-separated list in Supabase function secrets
const envAllowed = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);
const defaultAllowed = [
  'http://localhost:5000',
  'http://localhost:3000'
];
const allowedOrigins = envAllowed.length ? envAllowed : defaultAllowed;

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const headers = corsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { eventId, usePoints } = await req.json();
    logStep("Request data received", { eventId, usePoints });

    // Get event details (need created_by for org resolution)
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select("*, created_by, organization_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }
    logStep("Event found", { title: event.title, price: event.price_cents });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
    logStep("Customer lookup", { customerId: customerId || "new" });

    // If using loyalty points, handle differently
    if (usePoints && event.loyalty_points_price) {
      // Get user profile for points
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("available_loyalty_points")
        .eq("id", user.id)
        .single();

      if (!profile || profile.available_loyalty_points < event.loyalty_points_price) {
        throw new Error("Insufficient loyalty points");
      }

      // Create registration directly
      const { error: regError } = await supabaseClient
        .from("event_registrations")
        .insert({
          event_id: eventId,
          user_id: user.id,
          organization_id: event.organization_id || null,
          payment_method: "loyalty_points",
          loyalty_points_used: event.loyalty_points_price,
          payment_status: "completed"
        });

      if (regError) throw regError;

      // Create loyalty transaction
      await supabaseClient
        .from("loyalty_transactions")
        .insert({
          user_id: user.id,
          type: "redeemed",
          points: event.loyalty_points_price,
          description: `Event registration: ${event.title}`,
          reference_type: "event_registration",
          reference_id: eventId,
          organization_id: event.organization_id || null
        });

      // Increment event capacity after successful points registration
      try {
        await supabaseClient.rpc("increment_event_capacity", { event_id: eventId });
      } catch (_) {}

      return new Response(JSON.stringify({ success: true, paymentMethod: "points" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Resolve destination account via organization
    let destinationAccount: string | undefined = undefined;
    let applicationFeeAmount: number | undefined = undefined;
    try {
      let organizationId = (event as any).organization_id as string | undefined;
      if (!organizationId && event.created_by) {
        const { data: prof } = await supabaseClient
          .from('profiles')
          .select('current_organization_id')
          .eq('id', event.created_by)
          .maybeSingle();
        organizationId = prof?.current_organization_id || undefined;
      }

      if (organizationId) {
        const { data: org } = await supabaseClient
          .from('organizations')
          .select('stripe_account_id, default_fee_bps, charges_enabled, payouts_enabled')
          .eq('id', organizationId)
          .maybeSingle();
        if (org?.stripe_account_id && org.charges_enabled && org.payouts_enabled) {
          destinationAccount = org.stripe_account_id as string;
          const bps = (org.default_fee_bps as number | null) ?? 0;
          if (bps > 0 && event.price_cents) {
            applicationFeeAmount = Math.floor((event.price_cents * bps) / 10000);
          }
        }
      }
    } catch {}

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { 
              name: event.title,
              description: event.description,
              images: event.image_url ? [event.image_url] : undefined
            },
            unit_amount: event.price_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/events?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/events?payment=cancelled`,
      payment_intent_data: destinationAccount ? {
        transfer_data: { destination: destinationAccount },
        application_fee_amount: applicationFeeAmount,
        on_behalf_of: destinationAccount,
      } : undefined,
      metadata: {
        event_id: eventId,
        user_id: user.id,
      },
    });

    logStep("Stripe session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...headers, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...headers, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
