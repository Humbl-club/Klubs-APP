import { createClient } from '@supabase/supabase-js'
const url = process.env.SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
if (!url || !key) { console.error('Missing env'); process.exit(1) }
const supabase = createClient(url, key)
;(async()=>{
  const email = process.argv[2];
  if (!email) { console.error('Usage: tsx scripts/create-admin-user.ts <email>'); process.exit(1) }
  const { data, error } = await (supabase as any).auth.admin.createUser({ email, password: 'TestUser123!', email_confirm: true })
  if (error) { console.error('ERR', error.message); process.exit(1) }
  console.log('Created user', data.user?.id, data.user?.email)
})()

