import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PROJECT_ID = 'f5c64665-1545-4b62-a966-f8bd0ad20646';

async function main() {
  // Pull all content rows (current AND historic) for the over-style pages
  const { data: pages } = await admin
    .from('pages')
    .select('id, page_type, title')
    .eq('project_id', PROJECT_ID)
    .in('page_type', ['custom', 'over']);

  for (const p of pages ?? []) {
    console.log(`\n◆ ${p.title} (${p.page_type})`);
    const { data: sections } = await admin
      .from('sections')
      .select('id, section_type')
      .eq('page_id', p.id);
    for (const s of sections ?? []) {
      console.log(`  section ${s.section_type} id=${s.id}`);
      const { data: rows } = await admin
        .from('section_content')
        .select('id, field_name, field_value, version, is_current, sort_order, created_at')
        .eq('section_id', s.id)
        .order('created_at', { ascending: true });
      for (const r of rows ?? []) {
        const len = (r.field_value ?? '').length;
        const flag = r.is_current ? '★' : ' ';
        console.log(
          `    ${flag} v${r.version} ${r.field_name.padEnd(15)} sort=${r.sort_order} len=${len}`
        );
      }
    }
  }
}
void main();
