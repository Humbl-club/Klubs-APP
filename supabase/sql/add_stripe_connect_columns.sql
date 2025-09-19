-- Add Stripe Connect fields to organizations (idempotent)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS charges_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payouts_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_fee_bps INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_organizations_stripe ON public.organizations(stripe_account_id);

COMMENT ON COLUMN public.organizations.stripe_account_id IS 'Stripe Connect account id for destination charges';
COMMENT ON COLUMN public.organizations.charges_enabled IS 'Stripe charges enabled flag (synced)';
COMMENT ON COLUMN public.organizations.payouts_enabled IS 'Stripe payouts enabled flag (synced)';
COMMENT ON COLUMN public.organizations.default_fee_bps IS 'Platform fee in basis points for Connect';

