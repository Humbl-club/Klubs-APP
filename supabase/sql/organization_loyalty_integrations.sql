-- Organization loyalty integration (Option A: external provider like Smile/Yotpo/LoyaltyLion)
create table if not exists public.organization_loyalty_integrations (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('smile','yotpo','loyaltylion','custom')),
  settings jsonb not null default '{}'::jsonb, -- e.g., { api_key, api_secret, base_url }
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.organization_loyalty_integrations enable row level security;

drop policy if exists org_loyalty_select on public.organization_loyalty_integrations;
create policy org_loyalty_select on public.organization_loyalty_integrations
for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_loyalty_integrations.organization_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists org_loyalty_upsert on public.organization_loyalty_integrations;
create policy org_loyalty_upsert on public.organization_loyalty_integrations
for all to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_loyalty_integrations.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_loyalty_integrations.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  )
);

