import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { getPagesWithContent } from '../src/services/content.js';

const _admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PROJECT_ID = 'f5c64665-1545-4b62-a966-f8bd0ad20646';

async function main() {
  const pages = await getPagesWithContent(PROJECT_ID);
  for (const p of pages) {
    if (p.page_type !== 'custom' && p.page_type !== 'over') continue;
    console.log(`\n◆ ${p.title} (${p.page_type})`);
    for (const s of p.sections) {
      if (s.section_type !== 'content') continue;
      console.log(`  section.${s.section_type} (id=${s.id}, sort=${s.sort_order})`);
      console.log(`  fields count: ${s.fields.length}`);
      for (const f of s.fields) {
        console.log(
          `    field_name=${f.field_name} type=${f.field_type} sort=${f.sort_order} len=${f.field_value.length}`
        );
        if (f.field_value.length > 0) {
          console.log(`      preview: ${f.field_value.slice(0, 100).replace(/\n/g, ' ')}`);
        }
      }
    }
  }
}
void main();
