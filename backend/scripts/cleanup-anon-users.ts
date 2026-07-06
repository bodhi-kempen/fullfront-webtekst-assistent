/**
 * Cleanup anonymous accounts + their (empty) projects.
 *
 * Anonymous users are created client-side by the frontend when a visitor
 * lands without a session. Their email pattern is:
 *   anon-<uuid>@webtekst-anon.fullfront.nl
 *
 * If no one converts them, they sit forever in auth.users and (worse) in
 * projects with lingering empty rows. This script cleans up both.
 *
 * Deletion rules
 * --------------
 *   A. Anonymous user with ZERO projects, older than 7 days
 *      → delete the auth user.
 *   B. Anonymous user with only EMPTY projects (0 interview_answers),
 *      older than 30 days
 *      → delete the auth user (cascades to projects via FK ON DELETE CASCADE).
 *   C. Anonymous user with at least one project that has interview_answers
 *      → keep. The visitor invested time; we'll let them come back.
 *
 * Run
 * ---
 *   # Report what would be deleted, no changes:
 *   DRY_RUN=1 npx tsx scripts/cleanup-anon-users.ts
 *
 *   # Actually delete:
 *   npx tsx scripts/cleanup-anon-users.ts
 *
 * Periodic execution
 * ------------------
 * Run this weekly via Railway's cron job feature (Settings → Cron Jobs)
 * or via GitHub Actions on a schedule. Example Railway cron:
 *   0 3 * * 1  cd backend && npx tsx scripts/cleanup-anon-users.ts
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (loaded from backend/.env).
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Run from backend/.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ANON_EMAIL_SUFFIX = '@webtekst-anon.fullfront.nl';
const RULE_A_MIN_AGE_DAYS = 7;
const RULE_B_MIN_AGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

interface AnonUser {
  id: string;
  email: string;
  createdAt: Date;
}

async function listAllAnonymousUsers(): Promise<AnonUser[]> {
  const out: AnonUser[] = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email?.endsWith(ANON_EMAIL_SUFFIX)) {
        out.push({ id: u.id, email: u.email, createdAt: new Date(u.created_at) });
      }
    }
    if (data.users.length < perPage) break;
    page += 1;
    if (page > 100) {
      console.warn('listUsers pagination halted after 100 pages as a safety valve');
      break;
    }
  }
  return out;
}

async function countProjectsAndAnswers(
  userId: string
): Promise<{ projectCount: number; nonEmptyProjectCount: number }> {
  const { data: projects, error: pErr } = await admin
    .from('projects')
    .select('id')
    .eq('user_id', userId);
  if (pErr) throw pErr;

  const projectCount = projects?.length ?? 0;
  if (projectCount === 0) return { projectCount: 0, nonEmptyProjectCount: 0 };

  // For each project, check whether it has any interview_answers rows.
  const projectIds = projects!.map((p) => p.id as string);
  const { data: answers, error: aErr } = await admin
    .from('interview_answers')
    .select('project_id')
    .in('project_id', projectIds);
  if (aErr) throw aErr;

  const projectsWithAnswers = new Set((answers ?? []).map((r) => r.project_id));
  return {
    projectCount,
    nonEmptyProjectCount: projectsWithAnswers.size,
  };
}

async function deleteUser(userId: string): Promise<void> {
  // Deleting the auth user cascades to `projects` because the FK is
  // ON DELETE CASCADE (see the projects schema). Related tables
  // (interview_answers, pages, sections, section_content, etc.) cascade
  // from projects.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const now = new Date();
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Anonymous user cleanup — ${now.toISOString()}`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no deletes)' : 'LIVE (deleting)'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const anons = await listAllAnonymousUsers();
  console.log(`Found ${anons.length} anonymous users total.\n`);

  const buckets = {
    ruleA_toDelete: [] as AnonUser[], // 0 projects, >7 days
    ruleB_toDelete: [] as AnonUser[], // only empty projects, >30 days
    keep_hasAnswers: [] as AnonUser[], // at least one project with answers
    keep_tooYoung: [] as AnonUser[],
  };

  for (const u of anons) {
    const ageDays = (now.getTime() - u.createdAt.getTime()) / DAY_MS;
    const { projectCount, nonEmptyProjectCount } = await countProjectsAndAnswers(u.id);

    if (nonEmptyProjectCount > 0) {
      buckets.keep_hasAnswers.push(u);
      continue;
    }
    // No project has any answers.
    if (projectCount === 0) {
      if (ageDays >= RULE_A_MIN_AGE_DAYS) buckets.ruleA_toDelete.push(u);
      else buckets.keep_tooYoung.push(u);
    } else {
      // Only empty projects.
      if (ageDays >= RULE_B_MIN_AGE_DAYS) buckets.ruleB_toDelete.push(u);
      else buckets.keep_tooYoung.push(u);
    }
  }

  console.log(`Bucket breakdown:`);
  console.log(`  ✗ Rule A (0 projects, ≥${RULE_A_MIN_AGE_DAYS}d old, delete):     ${buckets.ruleA_toDelete.length}`);
  console.log(`  ✗ Rule B (only empty projects, ≥${RULE_B_MIN_AGE_DAYS}d old, delete): ${buckets.ruleB_toDelete.length}`);
  console.log(`  ✓ Keep (has answered projects):                        ${buckets.keep_hasAnswers.length}`);
  console.log(`  ✓ Keep (too young to purge):                           ${buckets.keep_tooYoung.length}`);
  console.log('');

  const toDelete = [...buckets.ruleA_toDelete, ...buckets.ruleB_toDelete];
  if (toDelete.length === 0) {
    console.log('Nothing to delete.');
    console.log(`\n✓ Done in ${Math.round((Date.now() - startedAt) / 1000)}s.`);
    return;
  }

  console.log(`Deletion candidates:`);
  for (const u of toDelete) {
    const ageDays = Math.floor(
      (now.getTime() - u.createdAt.getTime()) / DAY_MS
    );
    console.log(`  · ${u.id}  (${u.email})  age=${ageDays}d`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log('DRY_RUN=1 — no deletions performed.');
    console.log(`\n✓ Done in ${Math.round((Date.now() - startedAt) / 1000)}s.`);
    return;
  }

  console.log(`Deleting ${toDelete.length} users…`);
  let ok = 0;
  let failed = 0;
  for (const u of toDelete) {
    try {
      await deleteUser(u.id);
      ok += 1;
    } catch (err) {
      failed += 1;
      console.error(
        `  ✗ failed to delete ${u.id}:`,
        err instanceof Error ? err.message : err
      );
    }
  }
  console.log(`\nDeleted: ${ok}, failed: ${failed}.`);
  console.log(`\n✓ Done in ${Math.round((Date.now() - startedAt) / 1000)}s.`);
}

void main().catch((err) => {
  console.error('\n✗ Cleanup FAILED:', err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
