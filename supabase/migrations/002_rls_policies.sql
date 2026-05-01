-- Row-Level Security policies
-- Backend uses the service role key (bypasses RLS). These policies apply
-- when the frontend talks to Supabase directly with the user's JWT and act
-- as defense-in-depth even when the backend is the primary access path.

alter table public.projects           enable row level security;
alter table public.interview_answers  enable row level security;
alter table public.website_strategy   enable row level security;
alter table public.pages              enable row level security;
alter table public.sections           enable row level security;
alter table public.section_content    enable row level security;
alter table public.business_info      enable row level security;

-- ---------------------------------------------------------------------------
-- projects: owner-only
-- ---------------------------------------------------------------------------
create policy projects_select on public.projects
  for select using (user_id = auth.uid());
create policy projects_insert on public.projects
  for insert with check (user_id = auth.uid());
create policy projects_update on public.projects
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy projects_delete on public.projects
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Helper: rows scoped to a project the user owns
-- ---------------------------------------------------------------------------
create or replace function public.user_owns_project(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects
    where id = p_id and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- interview_answers / website_strategy / pages / business_info — by project_id
-- ---------------------------------------------------------------------------
create policy interview_answers_owner on public.interview_answers
  for all
  using (public.user_owns_project(project_id))
  with check (public.user_owns_project(project_id));

create policy website_strategy_owner on public.website_strategy
  for all
  using (public.user_owns_project(project_id))
  with check (public.user_owns_project(project_id));

create policy pages_owner on public.pages
  for all
  using (public.user_owns_project(project_id))
  with check (public.user_owns_project(project_id));

create policy business_info_owner on public.business_info
  for all
  using (public.user_owns_project(project_id))
  with check (public.user_owns_project(project_id));

-- ---------------------------------------------------------------------------
-- sections — through pages
-- ---------------------------------------------------------------------------
create policy sections_owner on public.sections
  for all
  using (
    exists (
      select 1 from public.pages p
      where p.id = sections.page_id
        and public.user_owns_project(p.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.pages p
      where p.id = sections.page_id
        and public.user_owns_project(p.project_id)
    )
  );

-- ---------------------------------------------------------------------------
-- section_content — through sections → pages
-- ---------------------------------------------------------------------------
create policy section_content_owner on public.section_content
  for all
  using (
    exists (
      select 1
      from public.sections s
      join public.pages p on p.id = s.page_id
      where s.id = section_content.section_id
        and public.user_owns_project(p.project_id)
    )
  )
  with check (
    exists (
      select 1
      from public.sections s
      join public.pages p on p.id = s.page_id
      where s.id = section_content.section_id
        and public.user_owns_project(p.project_id)
    )
  );
