import { supabaseAdmin } from '../src/lib/supabase.js';

const pid = 'ebb42ae1-a244-41c4-a44c-911896ab56d0';

const { data: strat } = await supabaseAdmin
  .from('website_strategy')
  .select('suggested_pages')
  .eq('project_id', pid)
  .maybeSingle();

console.log('SUGGESTED_PAGES (from strategy AI):');
for (const p of (strat?.suggested_pages ?? []) as Array<Record<string, unknown>>) {
  console.log(`  include=${p.include} type=${p.page_type} slug="${p.slug}" title="${p.title}"`);
}

const { data: pages } = await supabaseAdmin
  .from('pages')
  .select('id, page_type, slug, title, sort_order')
  .eq('project_id', pid)
  .order('sort_order');

console.log('\nPERSISTED PAGES (after run):');
for (const p of pages ?? []) {
  console.log(`  ${p.sort_order}: ${p.page_type} slug="${p.slug}" title="${p.title}"`);
}
