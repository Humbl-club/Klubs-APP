import type { LoyaltyAdapter, ProviderSettings } from './index.ts'

function authHeaders(settings: ProviderSettings) {
  const key = settings.api_key || ''
  const secret = settings.api_secret || ''
  // LoyaltyLion supports Basic auth (key:secret). Some accounts expose PAT tokens.
  if (secret) {
    const token = typeof btoa !== 'undefined' ? btoa(`${key}:${secret}`) : ''
    return { 'Authorization': `Basic ${token}`, 'Content-Type': 'application/json' }
  }
  if (key && key.startsWith('pat_')) {
    return { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }
  }
  // Fallback to Basic with empty secret (may be rejected by API)
  const token = typeof btoa !== 'undefined' ? btoa(`${key}:`) : ''
  return { 'Authorization': `Basic ${token}`, 'Content-Type': 'application/json' }
}

function baseUrl(settings: ProviderSettings) {
  return (settings.base_url || 'https://api.loyaltylion.com/v2').replace(/\/$/, '')
}

async function fetchJson(url: string, init: RequestInit) {
  const res = await fetch(url, init)
  if (!res.ok) {
    const txt = await res.text().catch(()=> '')
    throw new Error(`LoyaltyLion API ${res.status}: ${txt}`)
  }
  return res.json().catch(()=> ({}))
}

async function resolveCustomerId(settings: ProviderSettings, link: { email?: string; provider_customer_id?: string }): Promise<string | null> {
  const headers = authHeaders(settings)
  const root = baseUrl(settings)
  if (link.provider_customer_id) {
    // Try by id first
    try {
      const data = await fetchJson(`${root}/customers/${encodeURIComponent(link.provider_customer_id)}`, { headers })
      if (data?.customer?.id) return String(data.customer.id)
    } catch (_) { /* fall through to email */ }
  }
  if (link.email) {
    const data = await fetchJson(`${root}/customers?email=${encodeURIComponent(link.email)}`, { headers })
    // API commonly returns { customers: [ { id, points_balance, ... } ] }
    const id = data?.customers?.[0]?.id
    return id ? String(id) : null
  }
  return null
}

export const loyaltyLionAdapter: LoyaltyAdapter = {
  async getPoints(settings: ProviderSettings, link: { email?: string; provider_customer_id?: string }): Promise<number> {
  const headers = authHeaders(settings)
    const root = baseUrl(settings)
    // Resolve a customer either by id or email
    const cid = await resolveCustomerId(settings, link)
    if (!cid) return 0
    const data = await fetchJson(`${root}/customers/${encodeURIComponent(cid)}`, { headers })
    // Expected shape: { customer: { points_balance: number } }
    const pts = Number(data?.customer?.points_balance ?? 0)
    return Number.isFinite(pts) ? pts : 0
  },

  async addPoints(settings: ProviderSettings, link: { email?: string; provider_customer_id?: string }, delta: number, reason?: string) {
    if (!delta) return
    const headers = basicHeaders(settings)
    const root = baseUrl(settings)
    const cid = await resolveCustomerId(settings, link)
    if (!cid) throw new Error('LoyaltyLion: customer not found for addPoints')
    // Common pattern: POST /customers/{id}/adjust_points with body { points, reason }
    const body = JSON.stringify({ points: Math.trunc(delta), reason: reason || 'App sync' })
    await fetchJson(`${root}/customers/${encodeURIComponent(cid)}/adjust_points`, { method: 'POST', headers, body })
  }
}
