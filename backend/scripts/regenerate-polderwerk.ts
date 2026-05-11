/**
 * Re-trigger content generation for the Polderwerk Studio project.
 *
 * Bypasses the HTTP admin endpoint and calls startContentGeneration() directly
 * via the service-role-keyed Supabase client. That's the same function the
 * /api/admin/projects/:id/regenerate-content endpoint runs, just without
 * needing an admin bearer token in this shell context.
 *
 * The worker wipes existing pages before regenerating (deleteExistingPages
 * inside generateAllContent), so this is idempotent — even though Home is
 * already in the DB, the run will wipe + rebuild the full set.
 *
 * Run from backend/:
 *   API_URL=https://webtekst.fullfront.nl npx tsx scripts/regenerate-polderwerk.ts
 *
 * (API_URL is only used for the optional status-poll at the end. The actual
 *  regeneration runs against the same Supabase project regardless of
 *  API_URL, because content.ts uses supabaseAdmin from this script's
 *  environment — point your backend/.env at production Supabase.)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { startContentGeneration } from '../src/services/content.js';
import { withUsageContext } from '../src/lib/usage.js';

const PROJECT_ID = 'f5c64665-1545-4b62-a966-f8bd0ad20646';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Regenerate content — Polderwerk Studio');
  console.log(`  Project: ${PROJECT_ID}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { data: before } = await admin
    .from('projects')
    .select('user_id, name, status, archetype')
    .eq('id', PROJECT_ID)
    .maybeSingle();

  if (!before) {
    console.error('Project niet gevonden.');
    process.exit(1);
  }

  console.log(`Naam:      ${before.name}`);
  console.log(`Archetype: ${before.archetype ?? '—'}`);
  console.log(`Status:    ${before.status}`);
  console.log(`Owner:     ${before.user_id}`);

  const { count: pagesBefore } = await admin
    .from('pages')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', PROJECT_ID);
  console.log(`Pagina's vóór regeneratie: ${pagesBefore ?? 0}`);

  console.log('\nKick startContentGeneration() (fire-and-forget; worker draait in achtergrond)…');
  // Wrap in usage context so claude_usage gets owner_id + project_id rows
  // for this regeneration too. bypassBudget=true because this is admin
  // recovery — the user's lifetime cap is meant for runaway-cost
  // protection, not to block a re-run we're explicitly authorizing.
  await withUsageContext(
    { userId: before.user_id, projectId: PROJECT_ID, bypassBudget: true },
    async () => {
      startContentGeneration(PROJECT_ID);
    }
  );

  // Poll status every 5s up to 10 min.
  console.log('\nPollen op status — kan 1-3 min duren…');
  const t0 = Date.now();
  let lastStatus = '';
  for (let i = 0; i < 120; i++) {
    await sleep(5000);
    const { data: cur } = await admin
      .from('projects')
      .select('status')
      .eq('id', PROJECT_ID)
      .maybeSingle();
    const status = cur?.status ?? 'unknown';
    if (status !== lastStatus) {
      const sec = Math.round((Date.now() - t0) / 1000);
      console.log(`  [+${sec}s] status=${status}`);
      lastStatus = status;
    }
    if (status === 'review' || status === 'completed') {
      console.log(`\n✓ Klaar (status=${status}).`);
      break;
    }
    if (status === 'strategy' && i > 1) {
      console.error(`\n✗ Worker is gevallen naar 'strategy' — generatie mislukte. Check Railway logs.`);
      process.exit(1);
    }
  }

  const { data: pages } = await admin
    .from('pages')
    .select('id, page_type, slug, title')
    .eq('project_id', PROJECT_ID)
    .order('sort_order');
  console.log(`\nPagina's na regeneratie: ${pages?.length ?? 0}`);
  for (const p of pages ?? []) {
    console.log(`  ${p.page_type.padEnd(12)} /${p.slug} — ${p.title}`);
  }

  const { data: usage } = await admin
    .from('claude_usage')
    .select('cost_usd')
    .eq('project_id', PROJECT_ID);
  const totalCost = (usage ?? []).reduce((s, u) => s + Number(u.cost_usd ?? 0), 0);
  console.log(`\nLifetime Claude-kosten op dit project: $${totalCost.toFixed(4)}`);
}

void main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
