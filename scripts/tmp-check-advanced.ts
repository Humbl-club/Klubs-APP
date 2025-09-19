import { createClient } from '@supabase/supabase-js'
const url = 'https://ynqdddwponrqwhtqfepi.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(url, key)
const tables = [
  'organization_features','organization_themes','organization_typography','organization_branding','organization_layouts',
  'feature_catalog','invite_codes','club_signup_pages','dashboard_widgets','navigation_items',
  'direct_messages','message_threads','notifications','platform_admins','platform_settings','platform_billing','calendar_feed_tokens',
  'loyalty_transactions','event_attendance'
]
const rpcs = [
  'get_events_optimized','get_organization_admin_data','get_organization_members_for_admin'
]
;(async()=>{
  const present: string[]=[]; const missing: string[]=[]
  for(const t of tables){ const { error } = await supabase.from(t as any).select('*',{ head:true,count:'exact'}).limit(1); (!error?present:missing).push(t) }
  console.log('Tables present:', present)
  console.log('Tables missing:', missing)
  for(const f of rpcs){
    const { error } = await supabase.rpc(f as any, {})
    const exists = !error || !/not exist|undefined function|42883/i.test(error.message)
    console.log(`RPC ${f}:`, exists? 'exists' : 'missing')
  }
})()
