import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const envAllowed = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);
const defaultAllowed = ['http://localhost:5000', 'http://localhost:3000'];
const allowedOrigins = envAllowed.length ? envAllowed : defaultAllowed;
const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const headers = corsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { sessionId } = await req.json();
    logStep("Verifying session", { sessionId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { status: session.payment_status, metadata: session.metadata });

    if (session.payment_status === "paid") {
      const eventId = session.metadata?.event_id;
      const userId = session.metadata?.user_id;

      if (!eventId || !userId) {
        throw new Error("Missing metadata in session");
      }

      // Check if registration already exists
      const { data: existingReg } = await supabaseClient
        .from("event_registrations")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .eq("stripe_session_id", sessionId)
        .single();

      if (!existingReg) {
        // Fetch event to determine organization context
        const { data: evt } = await supabaseClient
          .from("events")
          .select("id, organization_id, title")
          .eq("id", eventId)
          .maybeSingle();

        // Create event registration
        const { error: regError } = await supabaseClient
          .from("event_registrations")
          .insert({
            event_id: eventId,
            user_id: userId,
            organization_id: (evt as any)?.organization_id || null,
            payment_method: "stripe",
            stripe_session_id: sessionId,
            payment_status: "completed"
          });

        if (regError) {
          logStep("Registration error", { error: regError });
          throw regError;
        }

        // Update event capacity
        await supabaseClient.rpc("increment_event_capacity", { event_id: eventId });

        // Award loyalty points (5% of price in points)
        const pointsEarned = Math.floor((session.amount_total || 0) * 0.05);
        if (pointsEarned > 0) {
          await supabaseClient
            .from("loyalty_transactions")
            .insert({
              user_id: userId,
              type: "earned",
              points: pointsEarned,
              description: "Event registration bonus",
              reference_type: "event_registration",
              reference_id: eventId,
              organization_id: (evt as any)?.organization_id || null
            });
        }

        logStep("Registration completed", { eventId, userId, pointsEarned });
      }

      return new Response(JSON.stringify({ success: true, status: 'completed' }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ success: false, status: session.payment_status }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
