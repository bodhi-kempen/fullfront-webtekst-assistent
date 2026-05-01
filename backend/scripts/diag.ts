import { supabaseAdmin } from '../src/lib/supabase.js';

async function main() {
  const { data: projects, error } = await supabaseAdmin
    .from('projects')
    .select('id, name, status, archetype, sub_archetype, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);
  if (error) throw error;

  console.log('Most recent projects:');
  for (const p of projects ?? []) {
    console.log(`  ${p.id}  status=${p.status}  archetype=${p.archetype}  name="${p.name}"  ${p.updated_at}`);

    const { data: strat } = await supabaseAdmin
      .from('website_strategy')
      .select('approved, website_type, primary_cta, suggested_pages')
      .eq('project_id', p.id)
      .maybeSingle();
    if (strat) {
      const includedCount = (strat.suggested_pages as Array<{ include: boolean }> | null)?.filter((x) => x.include).length ?? 0;
      console.log(`    strategy: approved=${strat.approved}, type=${strat.website_type}, cta="${strat.primary_cta}", pages_included=${includedCount}`);
    } else {
      console.log('    strategy: (none)');
    }

    const { count: pageCount } = await supabaseAdmin
      .from('pages')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', p.id);
    const { count: sectionCount } = await supabaseAdmin
      .from('sections')
      .select('id, pages!inner(project_id)', { count: 'exact', head: true })
      .eq('pages.project_id', p.id);
    const { count: contentCount } = await supabaseAdmin
      .from('section_content')
      .select('id, sections!inner(pages!inner(project_id))', { count: 'exact', head: true })
      .eq('sections.pages.project_id', p.id);
    console.log(`    pages=${pageCount ?? 0}  sections=${sectionCount ?? 0}  content_rows=${contentCount ?? 0}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
