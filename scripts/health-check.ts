/**
 * Health checklist for environment and Supabase Storage.
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... EXPORT_BUCKET=exports \
 *   npx tsx scripts/health-check.ts
 */
import { createClient } from '@supabase/supabase-js'

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]

const recommendedEnv = [
  'STRIPE_SECRET_KEY',
  'ALLOWED_ORIGINS',
  'EXPORT_BUCKET',
  // optional email for export
  'RESEND_API_KEY',
  'RESEND_FROM',
]

function checkEnv() {
  const missing = requiredEnv.filter(k => !process.env[k])
  const missingRecommended = recommendedEnv.filter(k => !process.env[k])
  return { missing, missingRecommended }
}

async function checkStorage() {
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const bucket = process.env.EXPORT_BUCKET || 'exports'
  const supabase = createClient(url, key)

  try {
    const { data, error } = await (supabase as any).storage.listBuckets()
    if (error) throw error
    const buckets = (data || []) as Array<{ name: string }>
    const exists = buckets.some(b => b.name === bucket)
    return { bucket, exists }
  } catch (e: any) {
    return { bucket, exists: false, error: e?.message || String(e) }
  }
}

async function main() {
  const env = checkEnv()
  console.log('Missing required env:', env.missing)
  console.log('Missing recommended env:', env.missingRecommended)
  if (env.missing.length) process.exitCode = 2

  const storage = await checkStorage()
  if (storage.exists) {
    console.log(`Storage bucket OK: ${storage.bucket}`)
  } else {
    console.log(`Storage bucket missing: ${storage.bucket}`, storage.error ? `(${storage.error})` : '')
    process.exitCode = 3
  }
}

main().catch(err => { console.error(err); process.exit(1) })

