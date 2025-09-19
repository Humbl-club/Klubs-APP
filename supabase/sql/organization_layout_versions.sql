-- Version history for organization layouts
create table if not exists public.organization_layout_versions (
  id bigserial primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  status text not null default 'draft',
  layout_json jsonb not null default '{}'::jsonb,
  created_by uuid null,
  created_at timestamptz not null default now()
);

alter table public.organization_layout_versions enable row level security;

drop policy if exists org_layout_versions_select on public.organization_layout_versions;
create policy org_layout_versions_select on public.organization_layout_versions
for select
using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_layout_versions.organization_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists org_layout_versions_insert on public.organization_layout_versions;
create policy org_layout_versions_insert on public.organization_layout_versions
for insert to authenticated
with check (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_layout_versions.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  )
);

