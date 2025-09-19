-- Organization commerce configuration (Shopify Storefront)
create table if not exists public.organization_commerce (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  shop_domain text not null,
  storefront_access_token text not null,
  default_collection_handle text null,
  currency text default 'USD',
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.organization_commerce enable row level security;

-- RLS: org members can read; owners/admins can write
drop policy if exists org_commerce_select on public.organization_commerce;
create policy org_commerce_select on public.organization_commerce
for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_commerce.organization_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists org_commerce_upsert on public.organization_commerce;
create policy org_commerce_upsert on public.organization_commerce
for all to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_commerce.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_commerce.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  )
);

