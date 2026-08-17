-- Optional admin comment/description for a table (e.g. 'by the window'),
-- shown under the table number in the orders section.
-- Safe to run multiple times (idempotent).
alter table public.tables
  add column if not exists comment text;
