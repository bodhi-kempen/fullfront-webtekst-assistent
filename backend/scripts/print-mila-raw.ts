import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const pub = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const PID = '166a472d-cdb7-448a-bbeb-983014100bcb';
const USER_ID = 'd190d2dd-7430-4301-af6e-9e2d09f4850d';
const TEST_PASSWORD = 'TestRun-Pa55word!ABC';

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
  const j = await r.json();
  console.log(JSON.stringify(j, null, 2));
}
void main();
