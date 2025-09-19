-- Organization layouts (per-org dashboard composition)
create table if not exists public.organization_layouts (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  layout_json jsonb not null default '{}'::jsonb,
  status text not null default 'published',
  updated_at timestamptz not null default now()
);

-- update timestamp trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

drop trigger if exists trg_set_updated_at_org_layouts on public.organization_layouts;
create trigger trg_set_updated_at_org_layouts
before update on public.organization_layouts
for each row execute procedure public.set_updated_at();

-- RLS: members read; owners/admins write
alter table public.organization_layouts enable row level security;

drop policy if exists org_layouts_select on public.organization_layouts;
create policy org_layouts_select on public.organization_layouts
for select
using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_layouts.organization_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists org_layouts_upsert on public.organization_layouts;
create policy org_layouts_upsert on public.organization_layouts
for insert to authenticated
with check (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_layouts.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  )
);

drop policy if exists org_layouts_update on public.organization_layouts;
create policy org_layouts_update on public.organization_layouts
for update to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_layouts.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_layouts.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  )
);

-- service role (Edge Functions) bypass RLS; no explicit grants needed beyond default anon/authenticated

