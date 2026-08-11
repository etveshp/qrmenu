-- QR Menu for Cafe — initial schema
-- Single-cafe model: anon (guests) can read the menu and create orders;
-- authenticated (the cafe owner) manages everything.

-- Order status enum
create type public.order_status as enum ('new', 'preparing', 'delivered', 'completed', 'cancelled');

-- Categories (menu sections)
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name_ua text not null,
  name_en text not null,
  name_hu text not null,
  icon text not null default '🍽️',
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Menu items (trilingual, prices in whole UAH)
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name_ua text not null,
  name_en text not null,
  name_hu text not null,
  description_ua text not null default '',
  description_en text not null default '',
  description_hu text not null default '',
  ingredients_ua text not null default '',
  ingredients_en text not null default '',
  ingredients_hu text not null default '',
  price int not null check (price >= 0),
  image text not null default '',
  is_available boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Tables in the cafe (label is what guests see, e.g. '3' or 'VIP-1')
create table public.tables (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  created_at timestamptz not null default now()
);

-- Orders (guests create them anonymously)
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  table_id uuid references public.tables(id) on delete set null,
  status public.order_status not null default 'new',
  notes text,
  total_price int not null check (total_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Line items of an order (denormalized name/price snapshot so history
-- survives menu edits; menu_item_id kept as a soft reference)
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name_ua text not null,
  name_en text not null,
  name_hu text not null,
  price int not null check (price >= 0),
  quantity int not null check (quantity > 0)
);

-- Indexes for the query patterns the app uses
create index menu_items_category_id_idx on public.menu_items (category_id);
create index orders_status_idx on public.orders (status);
create index orders_created_at_idx on public.orders (created_at desc);
create index order_items_order_id_idx on public.order_items (order_id);

-- Keep updated_at fresh on status changes
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Menu data: readable by everyone, writable by the owner
create policy "categories_readable_by_all" on public.categories
  for select to anon, authenticated using (true);

create policy "categories_writable_by_owner" on public.categories
  for all to authenticated using (true) with check (true);

create policy "menu_items_readable_by_all" on public.menu_items
  for select to anon, authenticated using (true);

create policy "menu_items_writable_by_owner" on public.menu_items
  for all to authenticated using (true) with check (true);

create policy "tables_readable_by_all" on public.tables
  for select to anon, authenticated using (true);

create policy "tables_writable_by_owner" on public.tables
  for all to authenticated using (true) with check (true);

-- Orders: guests create them (client generates the order uuid);
-- only the owner can read or change them.
-- Note: single-owner app, so `to authenticated` alone is the access model;
-- re-evaluate with a per-user predicate if the app ever becomes multi-tenant.
create policy "orders_created_by_guests" on public.orders
  for insert to anon, authenticated with check (true);

create policy "orders_managed_by_owner" on public.orders
  for all to authenticated using (true) with check (true);

create policy "order_items_created_by_guests" on public.order_items
  for insert to anon, authenticated with check (true);

create policy "order_items_managed_by_owner" on public.order_items
  for all to authenticated using (true) with check (true);

-- ============================================================
-- Data API exposure (required since 2026-04-28: new tables are
-- NOT exposed to the Data API automatically)
-- ============================================================

grant select on public.categories, public.menu_items, public.tables to anon, authenticated;
grant insert on public.orders, public.order_items to anon;
grant select, insert, update, delete on public.categories, public.menu_items, public.tables, public.orders, public.order_items to authenticated;
