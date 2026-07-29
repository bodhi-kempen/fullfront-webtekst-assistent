-- Budget resets: admin-initiated window resets per user.
-- When a reset row exists, the rolling-window cap counts usage only from
-- the latest reset_at forward (GREATEST(now()-30d, last reset_at)).

create table if not exists budget_resets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  reset_at   timestamptz not null default now(),
  reason     text,
  created_by text not null default 'admin'
);

create index budget_resets_user_id_reset_at_idx
  on budget_resets (user_id, reset_at desc);

-- RLS: users never need to read this table; only service role writes.
alter table budget_resets enable row level security;

-- No SELECT policy for authenticated role — service role bypasses RLS.
