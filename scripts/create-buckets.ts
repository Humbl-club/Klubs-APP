/**
 * Create standard storage buckets if missing.
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/create-buckets.ts
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)

type BucketSpec = { name: string; public: boolean }
const buckets: BucketSpec[] = [
  { name: 'avatars', public: true },
  { name: 'posts', public: true },
  { name: 'events', public: true },
  { name: 'challenges', public: true },
  { name: 'exports', public: false },
]

async function ensureBucket(spec: BucketSpec) {
  // @ts-ignore admin API
  const { data, error } = await (supabase as any).storage.listBuckets()
  if (error) throw error
  const exists = (data || []).some((b: any) => b.name === spec.name)
  if (exists) {
    console.log(`✓ Bucket exists: ${spec.name}`)
    return
  }
  // @ts-ignore admin API
  const { error: cErr } = await (supabase as any).storage.createBucket(spec.name, { public: spec.public })
  if (cErr) throw cErr
  console.log(`+ Created bucket: ${spec.name} (public=${spec.public})`)
}

;(async () => {
  for (const b of buckets) {
    try {
      await ensureBucket(b)
    } catch (e: any) {
      console.error(`Failed for ${b.name}:`, e?.message || String(e))
      process.exitCode = 2
    }
  }
})()

