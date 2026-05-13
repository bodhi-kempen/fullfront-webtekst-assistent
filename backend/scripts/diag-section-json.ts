import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const pub = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: link } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'bodhi@bodhikempen.com',
  });
  const { data: session } = await pub.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link!.properties.hashed_token,
  });
  const token = session.session!.access_token;
  const res = await fetch(
    'https://webtekst.fullfront.nl/api/projects/f5c64665-1545-4b62-a966-f8bd0ad20646/pages',
    { headers: { Authorization: 'Bearer ' + token } }
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = (await res.json()) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hwePage = json.pages.find((p: any) => p.title === 'Hoe we werken');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentSec = hwePage.sections.find((s: any) => s.section_type === 'content');
  console.log(
    JSON.stringify(
      {
        ...contentSec,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fields: contentSec.fields.map((f: any) => ({
          id: f.id,
          field_name: f.field_name,
          field_type: f.field_type,
          sort_order: f.sort_order,
          version: f.version,
          field_value_preview: f.field_value.slice(0, 80) + '...',
          field_value_length: f.field_value.length,
        })),
      },
      null,
      2
    )
  );
}
void main();
