// Link user to external loyalty provider (Option A)
import { serve } from 'https://deno.land/std@0.223.0/http/server.ts'

type Body = {
  organizationId: string
  userId?: string
  email?: string
  provider?: 'smile' | 'yotpo' | 'loyaltylion' | 'custom'
  providerCustomerId?: string
}

serve(async (req) => {
  try {
    const body = await req.json() as Body
    const { organizationId, userId, email, provider = 'smile', providerCustomerId } = body
    if (!organizationId || (!email && !providerCustomerId)) {
      return json({ error: 'organizationId and email or providerCustomerId are required' }, 400)
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const up = await fetch(`${supabaseUrl}/rest/v1/user_loyalty_links`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        organization_id: organizationId,
        user_id: userId ?? null,
        provider,
        email: email ?? null,
        provider_customer_id: providerCustomerId ?? null,
        last_synced_at: new Date().toISOString()
      })
    })
    if (!up.ok) return json({ error: await up.text() }, 500)
    return json({ ok: true })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown error' }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

