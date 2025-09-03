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
    console.log('[EXPORT-USER-DATA] request received');
    const supabaseAnon = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'));
    const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));

    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: auth } = await supabaseAnon.auth.getUser(token);
    const user = auth.user;
    if (!user?.id) return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers, status: 401 });
    console.log('[EXPORT-USER-DATA] user', user.id);

    // Fetch core user data. Extend this with more tables as needed.
    const [profileRes, regsRes, memsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('event_registrations').select('*, events:event_id(id,title,start_time,location)').eq('user_id', user.id),
      supabase.from('organization_members').select('*, organizations:organization_id(id,name,slug,created_at)').eq('user_id', user.id),
    ]);

    const exportPayload = {
      user: { id: user.id, email: user.email, created_at: user.created_at },
      profile: (profileRes as any).data ?? null,
      event_registrations: (regsRes as any).data ?? [],
      organization_memberships: (memsRes as any).data ?? [],
      generated_at: new Date().toISOString(),
      version: 1,
    };

    // Upload to storage
    const bucket = Deno.env.get('EXPORT_BUCKET') || 'exports';
    try {
      // create bucket if needed (ignore errors)
      // @ts-ignore - createBucket available at runtime
      await (supabase as any).storage.createBucket(bucket, { public: false });
    } catch (_) {}

    const filename = `users/${user.id}/export-${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    await supabase.storage.from(bucket).upload(filename, blob, { upsert: true, contentType: 'application/json' });
    console.log('[EXPORT-USER-DATA] uploaded', `${bucket}/${filename}`);
    const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(filename, 60 * 60 * 24 * 7); // 7 days
    const signedUrl = (signed as any)?.signedUrl as string | undefined;

    // Optional email via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('RESEND_FROM') || 'no-reply@girlsclub.app';
    const subject = Deno.env.get('RESEND_SUBJECT') || 'Your GirlsClub Data Export';
    let emailed = false;
    if (resendKey && user.email && signedUrl) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from,
            to: user.email,
            subject,
            html: `<p>Your data export is ready.</p><p><a href="${signedUrl}">Download export</a> (valid for 7 days)</p>`
          })
        });
        emailed = true;
      } catch (e) {
        emailed = false;
        console.error('[EXPORT-USER-DATA] email failed', e);
      }
    }

    return new Response(JSON.stringify(exportPayload, null, 2), {
      headers: {
        ...headers,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="girlsclub-export-${user.id}.json"`,
        'X-Export-Path': `${bucket}/${filename}`,
        ...(signedUrl ? { 'X-Export-Url': signedUrl } : {}),
        'X-Email-Sent': emailed ? 'true' : 'false',
      },
      status: 200
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[EXPORT-USER-DATA] error', msg);
    return new Response(JSON.stringify({ error: msg }), { headers, status: 500 });
  }
});
