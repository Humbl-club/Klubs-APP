import { createClient } from '@supabase/supabase-js'
const url = 'https://uxfsunvyccyqvfdzhnww.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
if (!key) { console.error('Missing key'); process.exit(1) }
const supabase = createClient(url, key)
const tables = [
  'organization_features','organization_themes','organization_typography','organization_branding','organization_layouts',
  'feature_catalog','invite_codes','club_signup_pages','dashboard_widgets','navigation_items',
  'direct_messages','message_threads','notifications','platform_admins','platform_settings','platform_billing','calendar_feed_tokens',
  'loyalty_transactions','event_attendance'
]
;(async()=>{
  const present: string[] = []
  const missing: string[] = []
  for (const t of tables) {
    try {
      const { error } = await supabase.from(t as any).select('*', { head: true, count: 'exact' }).limit(1)
      if (!error) present.push(t); else missing.push(t)
    } catch { missing.push(t) }
  }
  console.log('Tables present:', present)
  console.log('Tables missing:', missing)
})()
