-- Fullfront Website Teksten App — initial schema
-- Source: docs/ontwerp.md §6 "Database Schema"

set check_function_bodies = off;

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  business_name text,
  archetype     text,
  sub_archetype text,
  language      text not null default 'nl' check (language in ('nl','en')),
  status        text not null default 'interview'
                check (status in ('interview','strategy','generating','review','completed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index projects_user_id_idx on public.projects (user_id);
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- interview_answers
-- ---------------------------------------------------------------------------
create table public.interview_answers (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects(id) on delete cascade,
  question_id         text not null,
  question_text       text not null,
  answer_text         text not null,
  answer_source       text not null check (answer_source in ('voice','typed')),
  phase               int  not null check (phase in (1,2,3)),
  sequence_order      int  not null,
  is_followup         boolean not null default false,
  parent_question_id  text,
  created_at          timestamptz not null default now()
);
create index interview_answers_project_idx
  on public.interview_answers (project_id, sequence_order);

-- ---------------------------------------------------------------------------
-- website_strategy
-- ---------------------------------------------------------------------------
create table public.website_strategy (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null unique references public.projects(id) on delete cascade,
  website_type      text check (website_type in ('lead_generation','authority','sales','booking')),
  tone_of_voice     text,
  addressing        text check (addressing in ('je','u','mix')),
  primary_cta       text,
  suggested_pages   jsonb,
  archetype_config  jsonb,
  approved          boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger website_strategy_set_updated_at
  before update on public.website_strategy
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- pages
-- ---------------------------------------------------------------------------
create table public.pages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  page_type   text not null check (page_type in ('home','over','diensten','ervaringen','contact','blog','custom')),
  title       text not null,
  slug        text not null,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index pages_project_idx on public.pages (project_id, sort_order);
create unique index pages_project_slug_idx on public.pages (project_id, slug);
create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- sections
-- ---------------------------------------------------------------------------
create table public.sections (
  id            uuid primary key default gen_random_uuid(),
  page_id       uuid not null references public.pages(id) on delete cascade,
  section_type  text not null check (section_type in (
                  'header','hero','over_mij','diensten','ervaringen',
                  'opt_in','cta','footer','contact_form','titel','content'
                )),
  sort_order    int  not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index sections_page_idx on public.sections (page_id, sort_order);
create trigger sections_set_updated_at
  before update on public.sections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- section_content (versioned per field)
-- ---------------------------------------------------------------------------
create table public.section_content (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid not null references public.sections(id) on delete cascade,
  field_name  text not null,
  field_value text,
  field_type  text not null default 'text'
              check (field_type in ('text','textarea','url','phone','email')),
  sort_order  int  not null default 0,
  version     int  not null default 1,
  is_current  boolean not null default true,
  source      text not null default 'ai_generated'
              check (source in ('ai_generated','user_edited','interview_direct')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index section_content_section_idx
  on public.section_content (section_id, field_name, is_current);
create trigger section_content_set_updated_at
  before update on public.section_content
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- business_info (1-1 with project)
-- ---------------------------------------------------------------------------
create table public.business_info (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null unique references public.projects(id) on delete cascade,
  business_name     text,
  owner_name        text,
  phone             text,
  email             text,
  address           text,
  postal_code       text,
  city              text,
  website_url       text,
  kvk_number        text,
  service_area      text[],
  social_facebook   text,
  social_instagram  text,
  social_linkedin   text,
  social_twitter    text,
  social_youtube    text,
  logo_url          text,
  brand_colors      jsonb,
  certifications    text[],
  opening_hours     jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger business_info_set_updated_at
  before update on public.business_info
  for each row execute function public.set_updated_at();
