/**
 * Quick readiness check for Supabase tables and RPCs.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... tsx scripts/check-supabase.ts
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function checkTable(name: string) {
  try {
    const { error } = await supabase.from(name as any).select('*', { count: 'exact', head: true }).limit(1)
    return { name, ok: !error, error: error?.message }
  } catch (e: any) {
    return { name, ok: false, error: e?.message || String(e) }
  }
}

async function checkRpc(name: string, payload: Record<string, any>) {
  try {
    const { data, error } = await supabase.rpc(name as any, payload)
    // Existence check: if the function exists, PostgREST returns 200/400 depending on args; 404 means not found
    return { name, ok: !error || !/not exist|undefined function|42883/i.test(error.message), error: error?.message }
  } catch (e: any) {
    return { name, ok: false, error: e?.message || String(e) }
  }
}

async function main() {
  const tables = ['events', 'event_registrations', 'organizations', 'profiles']
  const rpcs: Array<[string, Record<string, any>]> = [
    ['register_for_event', { event_id_param: '00000000-0000-0000-0000-000000000000', user_id_param: '00000000-0000-0000-0000-000000000000', payment_method_param: null, loyalty_points_used_param: 0 }],
    ['unregister_from_event', { event_id_param: '00000000-0000-0000-0000-000000000000', user_id_param: '00000000-0000-0000-0000-000000000000' }],
    ['is_platform_admin', { user_id: '00000000-0000-0000-0000-000000000000' }],
    ['is_organization_admin', { user_id: '00000000-0000-0000-0000-000000000000' }],
    ['mark_event_attendance', { event_qr_token: 'test', scanning_user_id: '00000000-0000-0000-0000-000000000000' }],
  ]

  const tableResults = await Promise.all(tables.map(checkTable))
  const rpcResults = await Promise.all(rpcs.map(([n, p]) => checkRpc(n, p)))

  const okTables = tableResults.filter(r => r.ok).map(r => r.name)
  const badTables = tableResults.filter(r => !r.ok)
  const okRpcs = rpcResults.filter(r => r.ok).map(r => r.name)
  const badRpcs = rpcResults.filter(r => !r.ok)

  console.log('Tables OK:', okTables)
  if (badTables.length) console.log('Tables Missing/Broken:', badTables)
  console.log('RPCs OK:', okRpcs)
  if (badRpcs.length) console.log('RPCs Missing/Broken:', badRpcs)

  if (badTables.length || badRpcs.length) process.exit(2)
}

main().catch(err => { console.error(err); process.exit(1) })

