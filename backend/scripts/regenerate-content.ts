/**
 * Re-trigger content generation for a stuck project.
 *
 * Bypasses the HTTP admin endpoint and calls startContentGeneration() directly
 * via the service-role-keyed Supabase client. Same flow as
 * /api/admin/projects/:id/regenerate-content but doesn't require an admin
 * bearer token in this shell context.
 *
 * The worker wipes existing pages before regenerating (deleteExistingPages
 * inside generateAllContent), so this is idempotent — half-finished projects
 * end up with a complete, coherent set.
 *
 * Run from backend/, pass the project id as the first arg:
 *   npx tsx scripts/regenerate-content.ts <project_id>
 *
 * Falls back to Polderwerk's id when no arg is given (kept for backwards
 * compat with the original use case).
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { startContentGeneration } from '../src/services/content.js';
import { generateStrategy } from '../src/services/strategy.js';
import { withUsageContext } from '../src/lib/usage.js';

const POLDERWERK_ID = 'f5c64665-1545-4b62-a966-f8bd0ad20646';
const PROJECT_ID = process.argv[2] ?? POLDERWERK_ID;

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
  console.log('  Regenerate content');
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

  // Some projects sit at status='strategy' because the strategy row was
  // never created (strategy generation never started, or crashed). Check
  // and generate it first if missing, so the content worker has something
  // to read.
  const { data: existingStrategy } = await admin
    .from('website_strategy')
    .select('id, approved')
    .eq('project_id', PROJECT_ID)
    .maybeSingle();

  await withUsageContext(
    { userId: before.user_id, projectId: PROJECT_ID, bypassBudget: true },
    async () => {
      if (!existingStrategy) {
        console.log('\nNo strategy row found — generating strategy first…');
        await generateStrategy(PROJECT_ID);
        console.log('✓ Strategy generated.');
      } else {
        console.log(
          `\nStrategy exists (approved=${existingStrategy.approved}). Skipping strategy generation.`
        );
      }

      console.log('\nKick startContentGeneration() (fire-and-forget)…');
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
