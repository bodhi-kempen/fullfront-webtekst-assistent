-- Interview framework v2 — supports 10 parts and persistent state for the
-- service loop and blog opt-in.

-- 1. Allow phase values 1-10 (was 1-3).
alter table public.interview_answers
  drop constraint if exists interview_answers_phase_check;

alter table public.interview_answers
  add constraint interview_answers_phase_check
  check (phase between 1 and 10);

-- 2. Persistent interview state for the v2 state machine.
alter table public.projects
  add column if not exists interview_meta jsonb;
