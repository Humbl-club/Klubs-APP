import { createClient } from '@supabase/supabase-js'
const url = 'https://uxfsunvyccyqvfdzhnww.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(url, key)
;(async()=>{
  // @ts-ignore any
  const { data, error } = await (supabase as any).storage.listBuckets()
  if (error) console.error('Error', error.message)
  console.log('Buckets:', (data||[]).map((b:any)=>b.name))
})()
