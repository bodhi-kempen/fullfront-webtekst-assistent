-- Add 'faq' to the pages.page_type enum so we can have a real generator
-- behind it (used for FAQ pages and Klantenservice on webshops).
-- Keeps 'custom' for backwards compatibility with existing rows, but new
-- code never produces it.

alter table public.pages
  drop constraint if exists pages_page_type_check;

alter table public.pages
  add constraint pages_page_type_check
  check (page_type in ('home','over','diensten','ervaringen','contact','blog','faq','custom'));
