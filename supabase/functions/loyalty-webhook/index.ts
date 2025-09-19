// Generic webhook receiver for loyalty providers (Option A)
import { serve } from 'https://deno.land/std@0.223.0/http/server.ts'

serve(async (req) => {
  try {
    const provider = new URL(req.url).searchParams.get('provider') || 'custom'
    const payload = await req.json().catch(() => ({}))
    // TODO: Verify provider signature based on provider (headers vary)

    // Minimal: try to match by email if present and mark last_synced_at
    const email = payload?.customer?.email || payload?.email || null
    const organizationId = payload?.organizationId || null
    if (organizationId && email) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      await fetch(`${supabaseUrl}/rest/v1/user_loyalty_links`, {
        method: 'PATCH',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_synced_at: new Date().toISOString() })
      })
    }
    return new Response(JSON.stringify({ ok: true, provider }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})

