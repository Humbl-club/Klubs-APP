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
  const headers = corsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response(null, { headers });

  try {
    console.log('[DELETE-ACCOUNT] request received');
    const supabaseAnon = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'));
    const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));

    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: auth } = await supabaseAnon.auth.getUser(token);
    const user = auth.user;
    if (!user?.id) return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers, status: 401 });
    console.log('[DELETE-ACCOUNT] user', user.id);

    // Best-effort cleanup in application tables (add or remove tables as your schema evolves)
    // Ignore errors to proceed with account deletion.
    try { await supabase.from('event_registrations').delete().eq('user_id', user.id); } catch (_) {}
    try { await supabase.from('organization_members').delete().eq('user_id', user.id); } catch (_) {}
    try { await supabase.from('user_entitlements').delete().eq('user_id', user.id); } catch (_) {}
    try { await supabase.from('messages').delete().or(`user_id.eq.${user.id},sender_id.eq.${user.id}`); } catch (_) {}
    try { await supabase.from('posts').delete().or(`user_id.eq.${user.id},author_id.eq.${user.id}`); } catch (_) {}
    try { await supabase.from('comments').delete().or(`user_id.eq.${user.id},author_id.eq.${user.id}`); } catch (_) {}
    try { await supabase.from('reactions').delete().eq('user_id', user.id); } catch (_) {}
    try { await supabase.from('activity').delete().eq('user_id', user.id); } catch (_) {}
    try { await supabase.from('notifications').delete().eq('user_id', user.id); } catch (_) {}
    try { await supabase.from('push_subscriptions').delete().eq('user_id', user.id); } catch (_) {}
    try { await supabase.from('device_tokens').delete().eq('user_id', user.id); } catch (_) {}
    try { await supabase.from('profiles').delete().eq('id', user.id); } catch (_) {}

    // Delete auth user (final step)
    // @ts-ignore - admin typed at runtime in Deno env
    const { error: delErr } = await (supabase as any).auth.admin.deleteUser(user.id);
    if (delErr) throw delErr;

    console.log('[DELETE-ACCOUNT] success for', user.id);
    return new Response(JSON.stringify({ success: true }), { headers, status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[DELETE-ACCOUNT] error', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), { headers, status: 500 });
  }
});
