import { createClient } from '@supabase/supabase-js'
const url = process.env.SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(url, key)
;(async()=>{
  const { data, error } = await supabase
    .from('organizations')
    .select('id,name,slug,stripe_account_id,charges_enabled,payouts_enabled,default_fee_bps,subscription_tier,subscription_status')
    .order('created_at', { ascending: false })
  if (error) { console.error('Error:', error.message); process.exit(2) }
  console.log(JSON.stringify(data||[], null, 2))
})()
