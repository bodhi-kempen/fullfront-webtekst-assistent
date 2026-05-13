/**
 * Hit the actual /api/projects/:id/pages HTTP endpoint and inspect what the
 * wire sends back. Bypasses the local function call so we see exactly what
 * the React app would receive over fetch.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const API_URL = process.env.API_URL ?? 'https://webtekst.fullfront.nl';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const pub = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PROJECT_ID = 'f5c64665-1545-4b62-a966-f8bd0ad20646';

async function main() {
  // Create a throw-away admin user just to get a bearer token. Easier than
  // remembering the real admin password. We mark them admin via the email
  // pattern matching ADMIN_EMAILS — won't work in prod unless that exact
  // email is in the list, so instead we just check the project owner.
  // Actually simpler: hit Railway with the project owner's token.
  const { data: project } = await admin
    .from('projects')
    .select('user_id')
    .eq('id', PROJECT_ID)
    .maybeSingle();

  if (!project) {
    console.error('Project niet gevonden');
    process.exit(1);
  }

  const { data: owner } = await admin.auth.admin.getUserById(project.user_id);
  console.log(`Project owner email: ${owner?.user?.email}`);

  // Generate a magic-link / one-time-token for the owner so we can sign in.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: owner!.user!.email!,
  });
  if (linkErr) throw linkErr;
  const otp = link.properties.hashed_token;
  // Use the OTP to verify and get a session.
  const { data: session, error: vErr } = await pub.auth.verifyOtp({
    type: 'magiclink',
    token_hash: otp,
  });
  if (vErr) throw vErr;

  const token = session.session!.access_token;
  console.log(`Signed in, token len=${token.length}`);

  // Hit the API as the owner.
  const res = await fetch(`${API_URL}/api/projects/${PROJECT_ID}/pages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`HTTP ${res.status}`);
  const json = (await res.json()) as {
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
      console.log(`  section ${s.section_type} — ${s.fields.length} fields`);
      for (const f of s.fields) {
        console.log(
          `    ${f.field_name.padEnd(15)} len=${f.field_value?.length ?? 0}` +
            (f.field_value ? ` "${f.field_value.slice(0, 60).replace(/\n/g, ' ')}…"` : '')
        );
      }
    }
  }
}
void main();
