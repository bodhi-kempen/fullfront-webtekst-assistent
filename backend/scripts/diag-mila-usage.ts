import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const PROJECT_ID = '166a472d-cdb7-448a-bbeb-983014100bcb';

async function main() {
  const { data: usage } = await admin
    .from('claude_usage')
    .select('purpose, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, cost_usd, created_at')
    .eq('project_id', PROJECT_ID)
    .order('created_at', { ascending: true });

  console.log(`Total calls logged: ${usage?.length ?? 0}`);
  let totalCost = 0;
  const byPurpose = new Map<string, { calls: number; cost: number; tokIn: number; tokOut: number }>();
  for (const u of usage ?? []) {
    const c = Number(u.cost_usd ?? 0);
    totalCost += c;
    const cur = byPurpose.get(u.purpose) ?? { calls: 0, cost: 0, tokIn: 0, tokOut: 0 };
    cur.calls += 1;
    cur.cost += c;
    cur.tokIn += u.input_tokens ?? 0;
    cur.tokOut += u.output_tokens ?? 0;
    byPurpose.set(u.purpose, cur);
  }
  console.log(`Total cost: $${totalCost.toFixed(4)}\n`);
  console.log('By purpose:');
  for (const [p, a] of [...byPurpose.entries()].sort((a, b) => b[1].cost - a[1].cost)) {
    console.log(`  ${p.padEnd(28)} ${String(a.calls).padStart(3)}x   in=${a.tokIn}  out=${a.tokOut}   $${a.cost.toFixed(4)}`);
  }

  // Check pages and sections in DB
  const { data: pages } = await admin
    .from('pages')
    .select('id, page_type, slug, title')
    .eq('project_id', PROJECT_ID)
    .order('sort_order');
  console.log(`\nPages: ${pages?.length ?? 0}`);
  for (const p of pages ?? []) console.log(`  ${p.page_type.padEnd(12)} /${p.slug} — ${p.title}`);

  const { data: project } = await admin
    .from('projects')
    .select('status, error_message, archetype, sub_archetype')
    .eq('id', PROJECT_ID)
    .maybeSingle();
  console.log('\nProject:', project);
}

void main();
