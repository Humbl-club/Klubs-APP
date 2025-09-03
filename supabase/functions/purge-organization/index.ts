import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const env = (k: string, required = true) => {
  const v = Deno.env.get(k);
  if (required && (!v || v.length === 0)) throw new Error(`${k} not set`);
  return v || '';
};

type Body = {
  organizationId?: string;
  confirm?: string;
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
    console.log('[PURGE-ORG] request received');
    const supabaseAnon = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'));
    const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));

    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: auth } = await supabaseAnon.auth.getUser(token);
    const user = auth.user;
    if (!user?.id) return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers, status: 401 });

    const { organizationId, confirm } = (await req.json().catch(() => ({}))) as Body;
    if (!organizationId) return new Response(JSON.stringify({ error: 'organizationId required' }), { headers, status: 400 });
    if (confirm !== 'PURGE') return new Response(JSON.stringify({ error: 'Confirmation string mismatch' }), { headers, status: 400 });
    console.log('[PURGE-ORG] user', user.id, 'org', organizationId);

    // Admin guard via RPC
    const { data: isAdmin, error: adminErr } = await supabase.rpc('is_platform_admin', { user_id: user.id as any });
    if (adminErr || !isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { headers, status: 403 });

    // Validate organization exists
    const { data: org } = await supabase.from('organizations').select('id, name, slug').eq('id', organizationId).maybeSingle();
    if (!org) return new Response(JSON.stringify({ error: 'Organization not found' }), { headers, status: 404 });

    // Attempt cascade delete across org-scoped tables. Ignore per-table errors to proceed.
    const tryDel = async (table: string, filter: Record<string, any>) => {
      try { await supabase.from(table).delete().match(filter); } catch (_) {}
    };

    // Direct org_id deletes
    await tryDel('event_registrations', { organization_id: organizationId });
    await tryDel('events', { organization_id: organizationId });
    await tryDel('organization_membership_grants', { organization_id: organizationId });
    await tryDel('organization_members', { organization_id: organizationId });
    await tryDel('platform_billing', { organization_id: organizationId });
    await tryDel('invitations', { organization_id: organizationId });

    // Finally delete the organization
    await tryDel('organizations', { id: organizationId });

    console.log('[PURGE-ORG] purged', organizationId);
    return new Response(JSON.stringify({ success: true, organizationId }), { headers, status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[PURGE-ORG] error', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), { headers, status: 500 });
  }
});
