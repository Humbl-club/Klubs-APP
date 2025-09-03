-- Calendar feed tokens to allow subscribing to ICS without auth headers
CREATE TABLE IF NOT EXISTS public.calendar_feed_tokens (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_feed_tokens ENABLE ROW LEVEL SECURITY;

-- Only the owner can see their tokens; service role bypasses
CREATE POLICY "Owner can view own feed tokens"
  ON public.calendar_feed_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Optional: allow owner to delete tokens
CREATE POLICY "Owner can delete own feed tokens"
  ON public.calendar_feed_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

