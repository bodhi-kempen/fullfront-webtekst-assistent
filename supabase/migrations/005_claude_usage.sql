-- Track every Claude API call so we can see real per-project / per-user
-- spend instead of relying on estimates, and enforce a per-user cap.

create table if not exists claude_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  purpose text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_creation_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists claude_usage_user_id_idx on claude_usage (user_id);
create index if not exists claude_usage_project_id_idx on claude_usage (project_id);
create index if not exists claude_usage_created_at_idx on claude_usage (created_at desc);

alter table claude_usage enable row level security;

-- Users can read their own usage; backend (service role) does all writes.
create policy "claude_usage select own"
  on claude_usage for select
  using (auth.uid() = user_id);
