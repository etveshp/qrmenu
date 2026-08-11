-- Enable Realtime for orders so the owner cabinet gets live updates
-- (new orders appear instantly + sound chime).

alter publication supabase_realtime add table public.orders;
