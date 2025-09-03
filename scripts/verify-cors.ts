/**
 * Verify CORS headers for Supabase Edge Functions.
 * - Discovers function names under supabase/functions (or use FUNCTIONS env as comma list)
 * - Sends OPTIONS preflight with different Origin values
 * - Prints Access-Control-Allow-Origin and related headers
 *
 * Usage:
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   CORS_TEST_ORIGINS="https://your-app.example.com,http://localhost:3000" \
 *   npx tsx scripts/verify-cors.ts
 */

import fs from 'node:fs'
import path from 'node:path'

const supabaseUrl = process.env.SUPABASE_URL || ''
if (!supabaseUrl) {
  console.error('Missing SUPABASE_URL (e.g., https://<ref>.supabase.co)')
  process.exit(1)
}

function functionsBase(urlStr: string): string {
  const u = new URL(urlStr)
  const host = u.host.replace(/\.supabase\.co$/, '.functions.supabase.co')
  return `${u.protocol}//${host}`
}

function discoverFunctions(): string[] {
  const envList = (process.env.FUNCTIONS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  if (envList.length) return envList

  const dir = path.join(process.cwd(), 'supabase', 'functions')
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(name => fs.statSync(path.join(dir, name)).isDirectory())
}

function originsToTest(): string[] {
  const env = (process.env.CORS_TEST_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  if (env.length) return env
  const app = process.env.APP_URL?.trim()
  const base = ['http://localhost:3000', 'http://localhost:5000']
  return app ? [app, ...base] : base
}

async function preflight(url: string, origin: string) {
  const res = await fetch(url, {
    method: 'OPTIONS',
    headers: {
      'Origin': origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  })
  return {
    status: res.status,
    allowOrigin: res.headers.get('access-control-allow-origin') || '',
    allowHeaders: res.headers.get('access-control-allow-headers') || '',
    allowMethods: res.headers.get('access-control-allow-methods') || '',
  }
}

async function main() {
  const base = functionsBase(supabaseUrl)
  const fns = discoverFunctions()
  const origins = originsToTest()

  if (!fns.length) {
    console.warn('No functions discovered. Set FUNCTIONS env or ensure supabase/functions exists.')
    process.exit(2)
  }

  console.log(`Functions base: ${base}`)
  console.log(`Testing functions: ${fns.join(', ')}`)
  console.log(`Origins: ${origins.join(', ')}`)

  for (const fn of fns) {
    const url = `${base}/${fn}`
    console.log(`\n== ${fn} ==`)
    for (const origin of origins) {
      try {
        const r = await preflight(url, origin)
        const ok = r.allowOrigin === origin || r.allowOrigin === '*'
        console.log(`- Origin: ${origin}`)
        console.log(`  Status: ${r.status} | Allow-Origin: ${r.allowOrigin} | ${ok ? 'OK' : 'BLOCKED'}`)
      } catch (e: any) {
        console.log(`- Origin: ${origin}`)
        console.log(`  ERROR: ${e?.message || String(e)}`)
      }
    }
  }
}

main().catch(err => { console.error(err); process.exit(1) })

