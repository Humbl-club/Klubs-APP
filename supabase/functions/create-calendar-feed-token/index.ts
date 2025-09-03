import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const env = (k: string, required = true) => {
  const v = Deno.env.get(k);
  if (required && (!v || v.length === 0)) throw new Error(`${k} not set`);
  return v || '';
};

const allowed = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);
const defaults = ['http://localhost:3000', 'http://localhost:5000'];
const origins = allowed.length ? allowed : defaults;
const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && origins.includes(origin) ? origin : origins[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(origin) });
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' };

  try {
    const supabaseAnon = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'));
    const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));

    const tokenHeader = req.headers.get('Authorization') || '';
    const jwt = tokenHeader.replace('Bearer ', '');
    const { data: auth } = await supabaseAnon.auth.getUser(jwt);
    const user = auth.user;
    if (!user?.id) return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers, status: 401 });

    const { data: prof } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .maybeSingle();

    const orgId = (prof?.current_organization_id as string | null) || null;
    const { data: row, error } = await supabase
      .from('calendar_feed_tokens')
      .insert({ user_id: user.id, organization_id: orgId })
      .select('token')
      .maybeSingle();
    if (error) throw error;

    const baseUrl = new URL(env('SUPABASE_URL')).host.replace(/\.supabase\.co$/, '.functions.supabase.co');
    const scheme = 'https';
    const fn = 'calendar-ics';
    const icsUrl = `${scheme}://${baseUrl}/${fn}?token=${row!.token}`;

    return new Response(JSON.stringify({ token: row!.token, ics_url: icsUrl }), { headers, status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { headers, status: 500 });
  }
});
