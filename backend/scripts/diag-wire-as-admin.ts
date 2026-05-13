import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const API_URL = process.env.API_URL ?? 'https://webtekst.fullfront.nl';
const ADMIN_EMAIL = 'bodhi@bodhikempen.com';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const pub = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PROJECT_ID = 'f5c64665-1545-4b62-a966-f8bd0ad20646';

async function main() {
  // Generate a magic-link token for the admin user without sending email.
  // generateLink returns the OTP we can verify-in-place to get a session.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: ADMIN_EMAIL,
  });
  if (linkErr) throw linkErr;
  const otp = link.properties.hashed_token;
  const { data: session, error: vErr } = await pub.auth.verifyOtp({
    type: 'magiclink',
    token_hash: otp,
  });
  if (vErr) throw vErr;

  const token = session.session!.access_token;
  console.log(`Signed in as ${ADMIN_EMAIL}, token len=${token.length}`);

  // Now hit the API as the admin
  const res = await fetch(`${API_URL}/api/projects/${PROJECT_ID}/pages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`HTTP ${res.status}`);
  const rawText = await res.text();
  console.log(`Raw response length: ${rawText.length}`);

  const json = JSON.parse(rawText) as {
    status: string;
    pages: Array<{
      title: string;
      page_type: string;
      sections: Array<{
        section_type: string;
        fields: Array<{ field_name: string; field_value: string }>;
      }>;
    }>;
  };

  for (const p of json.pages) {
    if (p.page_type !== 'custom' && p.page_type !== 'over') continue;
    console.log(`\n◆ ${p.title} (${p.page_type})`);
    for (const s of p.sections) {
      console.log(`  section.${s.section_type} — ${s.fields.length} fields`);
      for (const f of s.fields) {
        const len = f.field_value?.length ?? 0;
        const flag = len > 0 ? '✓' : '∅';
        console.log(`    ${flag} ${f.field_name.padEnd(15)} len=${len}`);
      }
    }
  }
}

void main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
