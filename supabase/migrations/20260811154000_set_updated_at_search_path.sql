-- Fix advisor WARN "function_search_path_mutable": pin an empty search_path
-- so the trigger function cannot be hijacked via search_path injection.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
