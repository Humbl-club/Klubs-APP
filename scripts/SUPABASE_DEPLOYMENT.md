Supabase Deployment Cheatsheet

Prereqs
- Supabase CLI installed: https://supabase.com/docs/guides/cli
- Logged in: `supabase login`
- Linked to your project: `supabase link --project-ref <REF>`

Deploy Edge Functions
```
# Payments + Connect (if not already deployed)
supabase functions deploy stripe-connect
supabase functions deploy stripe-sync-status
supabase functions deploy create-payment
supabase functions deploy verify-payment
supabase functions deploy create-mobile-payment-intent

# Organization lifecycle (if used)
supabase functions deploy create-org-free
supabase functions deploy create-org-subscription
supabase functions deploy verify-org-subscription
supabase functions deploy grant-free-account
supabase functions deploy grant-super-admin

# New in this repo
supabase functions deploy export-user-data
supabase functions deploy delete-account
supabase functions deploy purge-organization
```

Recommended Env Vars (Project Settings → Functions)
- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY, STRIPE_CONNECT_WEBHOOK_SECRET (as needed)
- ALLOWED_ORIGINS: `https://your-app.example.com,http://localhost:3000,http://localhost:5000`
- EXPORT_BUCKET: `exports`
- RESEND_API_KEY, RESEND_FROM, RESEND_SUBJECT (optional for export emails)

Apply Migrations
- Using SQL editor: open each new SQL in `supabase/migrations` and run
- Or CLI (local DB only): `supabase db reset` then `supabase db diff`
- This repo includes: `supabase/migrations/1001_add_unregister_for_event.sql`

Readiness Check
```
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
  npx tsx scripts/check-supabase.ts
```

