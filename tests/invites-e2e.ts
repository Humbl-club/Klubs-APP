/**
 * E2E test: invite code isolation across organizations
 * Requires service role credentials.
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx tests/invites-e2e.ts
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

type Created = { orgA?: string; orgB?: string; user1?: string; user2?: string }
const created: Created = {}

const supabase = createClient(url, key)

const rnd = (len = 8) => Math.random().toString(36).slice(2, 2 + len).replace(/[^a-z0-9]/gi, '').toUpperCase()

async function createUser(email: string) {
  const { data, error } = await (supabase as any).auth.admin.createUser({ email, password: 'TestUser123!', email_confirm: true })
  if (error) throw error
  return data.user!.id as string
}

async function createOrg(name: string, slug: string, ownerId: string) {
  const { data, error } = await supabase.from('organizations').insert({ name, slug, owner_id: ownerId, subscription_tier: 'free', subscription_status: 'active', max_members: 50, settings: {} }).select('id').single()
  if (error) throw error
  return data!.id as string
}

async function createInvite(orgId: string, code: string) {
  const { error } = await supabase.from('invite_codes').insert({ organization_id: orgId, code, type: 'one-time', max_uses: 1, default_role: 'member' })
  if (error) throw error
}

async function redeem(code: string, userId: string) {
  const { data, error } = await supabase.rpc('redeem_invite_code', { p_code: code, p_user_id: userId, p_ip_address: '127.0.0.1', p_user_agent: 'e2e' })
  if (error) throw error
  if (!data || !data[0] || !data[0].success) throw new Error(`Redemption failed: ${JSON.stringify(data)}`)
  return data[0]
}

async function membershipExists(orgId: string, userId: string) {
  const { count, error } = await supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('user_id', userId)
  if (error) throw error
  return (count || 0) > 0
}

async function cleanup() {
  try {
    if (created.orgA) await supabase.from('organizations').delete().eq('id', created.orgA)
  } catch {}
  try {
    if (created.orgB) await supabase.from('organizations').delete().eq('id', created.orgB)
  } catch {}
  try {
    if (created.user1) await (supabase as any).auth.admin.deleteUser(created.user1)
  } catch {}
  try {
    if (created.user2) await (supabase as any).auth.admin.deleteUser(created.user2)
  } catch {}
}

;(async () => {
  try {
    const user1Email = `e2e_invite_${Date.now()}_1@example.com`
    const user2Email = `e2e_invite_${Date.now()}_2@example.com`
    const user1 = await createUser(user1Email); created.user1 = user1
    const user2 = await createUser(user2Email); created.user2 = user2

    const slugA = `test-org-a-${rnd(6).toLowerCase()}`
    const slugB = `test-org-b-${rnd(6).toLowerCase()}`
    const orgA = await createOrg('Test Org A', slugA, user1); created.orgA = orgA
    const orgB = await createOrg('Test Org B', slugB, user2); created.orgB = orgB

    const codeA = `A${rnd(7)}`
    const codeB = `B${rnd(7)}`
    await createInvite(orgA, codeA)
    await createInvite(orgB, codeB)

    // Redeem each code with its intended user
    await redeem(codeA, user1)
    await redeem(codeB, user2)

    // Validate memberships
    const aHas1 = await membershipExists(orgA, user1)
    const aHas2 = await membershipExists(orgA, user2)
    const bHas2 = await membershipExists(orgB, user2)
    const bHas1 = await membershipExists(orgB, user1)

    if (!aHas1 || !bHas2 || aHas2 || bHas1) {
      throw new Error(`Membership isolation failed: aHas1=${aHas1} aHas2=${aHas2} bHas1=${bHas1} bHas2=${bHas2}`)
    }

    console.log('✅ Invite code isolation test passed')
  } catch (e: any) {
    console.error('❌ Test failed:', e?.message || String(e))
    process.exitCode = 2
  } finally {
    await cleanup()
  }
})()

