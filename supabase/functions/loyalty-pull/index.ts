// Pull points from external provider (Option A) and mirror to app ledger
import { serve } from 'https://deno.land/std@0.223.0/http/server.ts'

type Body = { organizationId: string; userId: string }

serve(async (req) => {
  try {
    const { organizationId, userId } = await req.json() as Body
    if (!organizationId || !userId) return json({ error: 'organizationId and userId required' }, 400)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Fetch link
    const linkRes = await fetch(`${supabaseUrl}/rest/v1/user_loyalty_links?organization_id=eq.${organizationId}&user_id=eq.${userId}&select=*`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    })
    const links = await linkRes.json()
    const link = links?.[0]
    if (!link) return json({ error: 'link not found' }, 404)

    // Fetch provider integration
    const orgRes = await fetch(`${supabaseUrl}/rest/v1/organization_loyalty_integrations?organization_id=eq.${organizationId}&select=*`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    })
    const ints = await orgRes.json()
    const integ = ints?.[0]
    if (!integ?.enabled) return json({ error: 'integration disabled' }, 400)

    // Call provider adapter
    const { resolveAdapter } = await import('../_shared/loyalty/adapters/index.ts')
    const adapter = resolveAdapter((integ.provider || 'custom') as any)
    const providerPoints = await adapter.getPoints(integ.settings || {}, { email: link.email || undefined, provider_customer_id: link.provider_customer_id || undefined })

    // Optionally: read current app points and compute delta
    // Insert a no-op sync marker for audit
    await fetch(`${supabaseUrl}/rest/v1/user_loyalty_links`, {
      method: 'PATCH',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ last_synced_at: new Date().toISOString() }),
    })

    return json({ ok: true, providerPoints })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown error' }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}
