-- Persist the most recent content-generation failure on the project itself.
-- Without this the user just sees status='strategy' with no idea why their
-- project halted; the failure detail lived only in Railway logs.
--
-- Cleared on successful regeneration. Surfaced by the Review page's retry
-- card and the admin project detail.

alter table projects
  add column if not exists last_content_error text;
