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
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
});

function icsEscape(text: string) {
  return text.replace(/\/g, '\\').replace(/
/g, '\n').replace(/[,;]/g, (m) => `\${m}`);
}

function fmt(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(origin) });

  const headers = { ...corsHeaders(origin), 'Content-Type': 'text/calendar; charset=utf-8' };

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const orgId = url.searchParams.get('orgId') || undefined;

    const supabaseAnon = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'));
    const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));

    let userId: string | null = null;

    if (token) {
      // Feed token path
      const { data: t } = await supabase
        .from('calendar_feed_tokens')
        .select('user_id, organization_id')
        .eq('token', token)
        .maybeSingle();
      if (!t) return new Response('Invalid token', { headers, status: 400 });
      userId = t.user_id as string;
    } else {
      // Auth header path
      const authHeader = req.headers.get('Authorization') || '';
      const jwt = authHeader.replace('Bearer ', '');
      const { data: auth } = await supabaseAnon.auth.getUser(jwt);
      userId = auth.user?.id || null;
      if (!userId) return new Response('Unauthorized', { headers, status: 401 });
    }

    // Determine organization context
    let organizationId = orgId || undefined;
    if (!organizationId) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', userId!)
        .maybeSingle();
      organizationId = (prof?.current_organization_id as string | null) || undefined;
    }
    if (!organizationId) return new Response('No organization context', { headers, status: 400 });

    // Fetch events for organization
    const { data: events } = await supabase
      .from('events')
      .select('id,title,description,start_time,end_time,location')
      .eq('organization_id', organizationId)
      .order('start_time', { ascending: true })
      .limit(500);

    const lines: string[] = [];
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//GirlsClub//Org Calendar//EN');
    lines.push('CALSCALE:GREGORIAN');
    const now = new Date().toISOString();
    for (const e of (events || [])) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${e.id}@girlsclub`);
      lines.push(`DTSTAMP:${fmt(now)}`);
      lines.push(`DTSTART:${fmt(e.start_time)}`);
      lines.push(`DTEND:${fmt(e.end_time || e.start_time)}`);
      lines.push(`SUMMARY:${icsEscape(e.title || '')}`);
      if ((e as any).description) lines.push(`DESCRIPTION:${icsEscape((e as any).description)}`);
      if ((e as any).location) lines.push(`LOCATION:${icsEscape((e as any).location)}`);
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');

    return new Response(lines.join('
'), { headers, status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(`ERROR: ${msg}`, { headers, status: 500 });
  }
});
