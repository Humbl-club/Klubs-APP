// Push delta points to external provider (Option A)
import { serve } from 'https://deno.land/std@0.223.0/http/server.ts'

type Body = { organizationId: string; userId: string; delta: number; reason?: string }

serve(async (req) => {
  try {
    const { organizationId, userId, delta, reason } = await req.json() as Body
    if (!organizationId || !userId || !Number.isFinite(delta)) return json({ error: 'organizationId, userId, and numeric delta required' }, 400)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const orgRes = await fetch(`${supabaseUrl}/rest/v1/organization_loyalty_integrations?organization_id=eq.${organizationId}&select=*`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    })
    const ints = await orgRes.json()
    const integ = ints?.[0]
    if (!integ?.enabled) return json({ error: 'integration disabled' }, 400)

    const { resolveAdapter } = await import('../_shared/loyalty/adapters/index.ts')
    const adapter = resolveAdapter((integ.provider || 'custom') as any)
    // Fetch link for user
    const linkRes = await fetch(`${supabaseUrl}/rest/v1/user_loyalty_links?organization_id=eq.${organizationId}&user_id=eq.${userId}&select=*`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    })
    const links = await linkRes.json()
    const link = links?.[0]
    await adapter.addPoints(integ.settings || {}, { email: link?.email || undefined, provider_customer_id: link?.provider_customer_id || undefined }, delta, reason)
    return json({ ok: true })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown error' }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}
