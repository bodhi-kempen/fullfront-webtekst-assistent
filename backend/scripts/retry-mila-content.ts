/**
 * Retry content generation for the Mila project against production and
 * surface whatever error killed the previous run.
 */
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // Look up test user email
  const { data: u } = await admin.auth.admin.getUserById(USER_ID);
  if (!u?.user?.email) throw new Error('User not found');
  console.log(`Signing in as ${u.user.email}…`);
  const { data: signed, error: signErr } = await pub.auth.signInWithPassword({
    email: u.user.email,
    password: TEST_PASSWORD,
  });
  if (signErr || !signed.session?.access_token) throw new Error(`signIn: ${signErr?.message}`);
  const token = signed.session.access_token;

  // Reset status to "strategy" so /generate is allowed (it should already be)
  console.log(`\nKicking content generation…`);
  const res = await fetch(`${API_URL}/api/projects/${PID}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  console.log(`POST /generate → ${res.status}`, await res.text());

  // Poll
  console.log(`\nPolling status every 5s for up to 5 min…`);
  let lastStatus = '';
  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const r = await fetch(`${API_URL}/api/projects/${PID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = (await r.json()) as { project?: { status: string } };
    const s = j.project?.status ?? 'unknown';
    if (s !== lastStatus) {
      console.log(`  [${i + 1}] status=${s}`);
      lastStatus = s;
    }
    if (s === 'review' || s === 'completed' || s === 'strategy') {
      console.log(`  → terminal status reached: ${s}`);
      break;
    }
  }

  // Print final usage delta
  const { data: usage } = await admin
    .from('claude_usage')
    .select('purpose, cost_usd, created_at')
    .eq('project_id', PID)
    .order('created_at', { ascending: true });
  console.log(`\nTotal usage rows for project: ${usage?.length}`);
  let cost = 0;
  const purposes = new Map<string, number>();
  for (const u of usage ?? []) {
    cost += Number(u.cost_usd ?? 0);
    purposes.set(u.purpose, (purposes.get(u.purpose) ?? 0) + 1);
  }
  console.log(`Total cost: $${cost.toFixed(4)}`);
  console.log('By purpose:');
  for (const [p, c] of [...purposes.entries()].sort()) console.log(`  ${p.padEnd(28)} ${c}x`);

  // Pages?
  const { data: pages } = await admin
    .from('pages')
    .select('id, page_type, slug, title')
    .eq('project_id', PID)
    .order('sort_order');
  console.log(`\nPages persisted: ${pages?.length ?? 0}`);
  for (const p of pages ?? []) console.log(`  ${p.page_type.padEnd(12)} /${p.slug} — ${p.title}`);
}

void main().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
