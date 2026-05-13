import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PROJECT_ID = 'f5c64665-1545-4b62-a966-f8bd0ad20646';

async function main() {
  const { data: pages } = await admin
    .from('pages')
    .select('id, page_type, title, slug, sort_order')
    .eq('project_id', PROJECT_ID)
    .order('sort_order');

  for (const p of pages ?? []) {
    console.log(`\n◆ ${p.title} (${p.page_type}, /${p.slug})`);
    const { data: sections } = await admin
      .from('sections')
      .select('id, section_type, sort_order')
      .eq('page_id', p.id)
      .order('sort_order');
    for (const s of sections ?? []) {
      console.log(`  └─ section: ${s.section_type}`);
      const { data: fields } = await admin
        .from('section_content')
        .select('field_name, field_value, is_current')
        .eq('section_id', s.id)
        .eq('is_current', true)
        .order('sort_order');
      for (const f of fields ?? []) {
        const v = (f.field_value ?? '').slice(0, 120).replace(/\n/g, ' ');
        const len = (f.field_value ?? '').length;
        console.log(`       ${f.field_name.padEnd(20)} [${len}]  ${v}${len > 120 ? '…' : ''}`);
      }
    }
  }
}
void main();
