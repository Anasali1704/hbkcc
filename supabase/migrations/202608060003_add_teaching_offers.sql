create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.offers (id, slug, name, description, active)
values (
  '00000000-0000-0000-0000-000000000001',
  'pre-mahaad',
  'Pre Mahaad',
  'Lektionsplan, materialer og fravær for Pre Mahaad.',
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  active = excluded.active;

create table if not exists public.user_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, offer_id)
);

alter table public.classes
  add column if not exists offer_id uuid references public.offers(id);

update public.classes
set offer_id = '00000000-0000-0000-0000-000000000001'
where offer_id is null;

alter table public.classes alter column offer_id set not null;

insert into public.user_offers (user_id, offer_id)
select id, '00000000-0000-0000-0000-000000000001'
from public.profiles
on conflict (user_id, offer_id) do nothing;

create index if not exists user_offers_user_id_idx on public.user_offers(user_id);
create index if not exists user_offers_offer_id_idx on public.user_offers(offer_id);
create index if not exists classes_offer_id_idx on public.classes(offer_id);

alter table public.offers enable row level security;
alter table public.user_offers enable row level security;

drop policy if exists "offers_select_assigned" on public.offers;
drop policy if exists "offers_admin_insert" on public.offers;
drop policy if exists "offers_admin_update" on public.offers;
drop policy if exists "offers_admin_delete" on public.offers;
drop policy if exists "user_offers_select_authorized" on public.user_offers;
drop policy if exists "user_offers_admin_insert" on public.user_offers;
drop policy if exists "user_offers_admin_delete" on public.user_offers;

create policy "offers_select_assigned"
on public.offers for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.user_offers
    where offer_id = offers.id and user_id = auth.uid()
  )
);

create policy "offers_admin_insert"
on public.offers for insert to authenticated
with check (public.is_admin());

create policy "offers_admin_update"
on public.offers for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "offers_admin_delete"
on public.offers for delete to authenticated
using (public.is_admin());

create policy "user_offers_select_authorized"
on public.user_offers for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "user_offers_admin_insert"
on public.user_offers for insert to authenticated
with check (public.is_admin());

create policy "user_offers_admin_delete"
on public.user_offers for delete to authenticated
using (public.is_admin());
