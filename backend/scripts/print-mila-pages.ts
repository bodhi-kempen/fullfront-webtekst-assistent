import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const PID = '166a472d-cdb7-448a-bbeb-983014100bcb';
const USER_ID = 'd190d2dd-7430-4301-af6e-9e2d09f4850d';
const TEST_PASSWORD = 'TestRun-Pa55word!ABC';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const pub = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: u } = await admin.auth.admin.getUserById(USER_ID);
  const { data: signed } = await pub.auth.signInWithPassword({
    email: u!.user!.email!,
    password: TEST_PASSWORD,
  });
  const token = signed.session!.access_token;

  const r = await fetch(`${API_URL}/api/projects/${PID}/pages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = (await r.json()) as {
    status: string;
    pages: Array<{
      id: string;
      title: string;
      slug: string;
      page_type: string;
      sections: Array<{
        section_type: string;
        fields: Array<{ field_name: string; field_value: string }>;
      }>;
    }>;
  };

  console.log(`\n═══ ${j.pages.length} PAGES (status=${j.status}) ════════════════════\n`);
  for (const p of j.pages) {
    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║ ${p.title}  (/${p.slug}) — ${p.page_type}`);
    console.log(`╚══════════════════════════════════════════════════════════════╝`);
    for (const s of p.sections) {
      console.log(`\n  ┌── section: ${s.section_type} ──`);
      for (const f of s.fields) {
        const v = f.field_value ?? '';
        if (!v) continue;
        const lines = v.split('\n');
        if (lines.length === 1 && v.length < 100) {
          console.log(`  │ ${f.field_name}: ${v}`);
        } else {
          console.log(`  │ ${f.field_name}:`);
          for (const ln of lines) console.log(`  │   ${ln}`);
        }
      }
    }
  }
  console.log('\n');
}
void main();
