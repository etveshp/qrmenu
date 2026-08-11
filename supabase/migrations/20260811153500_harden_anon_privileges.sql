-- Least-privilege hardening.
-- Supabase's default privileges grant ALL (incl. TRUNCATE/DELETE/UPDATE) to
-- `anon` on every new table. RLS gates rows, but TRUNCATE bypasses RLS —
-- so explicitly strip anon down to exactly what guests need.

revoke all on public.categories, public.menu_items, public.tables, public.orders, public.order_items from anon;

-- Guests: read the menu, create orders. Nothing else.
grant select on public.categories, public.menu_items, public.tables to anon;
grant insert on public.orders, public.order_items to anon;

-- Owner (authenticated) keeps full control — single trusted account.
