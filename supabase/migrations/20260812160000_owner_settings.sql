-- Owner preferences (sound toggle etc.). Single-owner app: one row per key.

create table public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

create policy "settings_owner_all" on public.settings
  for all to authenticated using (true) with check (true);

-- Guests must not touch settings. Supabase's default privileges grant ALL
-- (incl. TRUNCATE, which bypasses RLS) to `anon` on new tables — strip it.
revoke all on public.settings from anon;
grant select, insert, update, delete on public.settings to authenticated;
