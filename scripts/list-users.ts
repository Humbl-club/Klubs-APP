import { createClient } from '@supabase/supabase-js'
const url = process.env.SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
if (!url || !key) { console.error('Missing env'); process.exit(1) }
const supabase = createClient(url, key)
;(async()=>{
  const { data, error } = await (supabase as any).auth.admin.listUsers({ page: 1, perPage: 10 })
  if (error) { console.error('ERR', error.message); process.exit(1) }
  console.log('Users:', (data?.users || []).map((u:any)=>({ id:u.id,email:u.email })) )
})()

