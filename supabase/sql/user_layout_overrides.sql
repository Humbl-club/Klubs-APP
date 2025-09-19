-- Per-user layout overrides
create table if not exists public.user_layout_overrides (
  user_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  layout_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, organization_id)
);

alter table public.user_layout_overrides enable row level security;

drop policy if exists user_overrides_select on public.user_layout_overrides;
create policy user_overrides_select on public.user_layout_overrides
for select to authenticated
using (
  user_id = auth.uid() and exists (
    select 1 from public.organization_members m
    where m.organization_id = user_layout_overrides.organization_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists user_overrides_upsert on public.user_layout_overrides;
create policy user_overrides_upsert on public.user_layout_overrides
for all to authenticated
using (
  user_id = auth.uid() and exists (
    select 1 from public.organization_members m
    where m.organization_id = user_layout_overrides.organization_id
      and m.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid() and exists (
    select 1 from public.organization_members m
    where m.organization_id = user_layout_overrides.organization_id
      and m.user_id = auth.uid()
  )
);

