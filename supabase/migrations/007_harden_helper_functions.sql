-- Security hardening for helper functions.
--
-- Applied against production on 2026-07-06 via Supabase MCP as
-- migration timestamp 20260706134110. This file mirrors that so a
-- fresh checkout of the repo can reproduce the same schema.
--
-- 1. user_owns_project(uuid) was SECURITY DEFINER and callable by anon +
--    authenticated via /rest/v1/rpc, which the Supabase advisor flagged as
--    "public can execute security definer function" (advisors 0028 + 0029).
--
--    Switching to SECURITY INVOKER preserves behavior because projects
--    already has RLS `user_id = auth.uid()`: the function's inner
--    `select ... where id=p_id and user_id=auth.uid()` returns the same
--    result whether it runs as owner (definer) or as caller (invoker),
--    because RLS restricts to the caller's own rows either way.
--
--    A full `REVOKE EXECUTE FROM authenticated` was tested first and
--    rejected: it breaks every RLS policy that calls this function
--    from an authenticated query (permission denied for function
--    user_owns_project).
--
-- 2. set_updated_at() had no explicit search_path — advisor 0011
--    "function_search_path_mutable". Pinning to `public, pg_temp`
--    matches the pattern already used by user_owns_project.

alter function public.user_owns_project(uuid) security invoker;

alter function public.set_updated_at() set search_path = public, pg_temp;
