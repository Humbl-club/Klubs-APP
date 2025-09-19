-- User ↔ external loyalty mapping per org (Option A)
create table if not exists public.user_loyalty_links (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  provider_customer_id text null,
  email text null,
  last_synced_at timestamptz null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table public.user_loyalty_links enable row level security;

drop policy if exists user_loyalty_links_select on public.user_loyalty_links;
create policy user_loyalty_links_select on public.user_loyalty_links
for select using (
  -- user can read their row; admins can read all rows within org
  user_id = auth.uid() or exists (
    select 1 from public.organization_members m
    where m.organization_id = user_loyalty_links.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  )
);

drop policy if exists user_loyalty_links_upsert on public.user_loyalty_links;
create policy user_loyalty_links_upsert on public.user_loyalty_links
for all to authenticated
using (
  -- user can upsert their own link; admins can upsert any link in org
  user_id = auth.uid() or exists (
    select 1 from public.organization_members m
    where m.organization_id = user_loyalty_links.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  )
)
with check (
  user_id = auth.uid() or exists (
    select 1 from public.organization_members m
    where m.organization_id = user_loyalty_links.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  )
);

