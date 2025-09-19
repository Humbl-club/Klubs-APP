Loyalty (Option A: External Provider)

Tables
- public.organization_loyalty_integrations
  - organization_id (PK, FK organizations)
  - provider: 'smile' | 'yotpo' | 'loyaltylion' | 'custom'
  - settings: JSON (api keys / base url)
  - enabled: boolean
  - RLS: members read; owners/admins write

- public.user_loyalty_links
  - organization_id + user_id (PK)
  - provider
  - provider_customer_id (nullable)
  - email (nullable)
  - last_synced_at
  - RLS: user reads/writes own; owners/admins manage all in org

Edge Functions (to deploy)
- loyalty-link: upsert link (email/customer id)
- loyalty-pull: pull points from provider and mirror into app ledger (loyalty_transactions)
- loyalty-push: push delta to provider when app awards/spends points

Secrets (Functions)
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
- PROVIDER_* as needed per provider (or stored per-org in settings)

