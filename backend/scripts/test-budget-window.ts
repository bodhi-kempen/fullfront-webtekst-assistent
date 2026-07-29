/**
 * Unit test for the rolling-window budget logic in assertWithinBudget().
 *
 * Tests the GREATEST(now()-30d, last_reset_at) logic in isolation —
 * no network, no Supabase. Simulates what the DB query returns.
 *
 * Run:  cd backend && npx tsx scripts/test-budget-window.ts
 */

// ---------------------------------------------------------------------------
// Re-implement the window calculation (copy of the logic in usage.ts)
// ---------------------------------------------------------------------------

interface UsageRow {
  cost_usd: number;
  created_at: string; // ISO string
}

interface ResetRow {
  reset_at: string; // ISO string
}

function computeWindowSpend(
  usageRows: UsageRow[],
  latestReset: ResetRow | null,
  nowIso: string,
): number {
  const thirtyDaysAgo = new Date(
    new Date(nowIso).getTime() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const lastResetAt = latestReset?.reset_at ?? null;
  const windowStart =
    lastResetAt && lastResetAt > thirtyDaysAgo ? lastResetAt : thirtyDaysAgo;

  return usageRows
    .filter((r) => r.created_at > windowStart)
    .reduce((sum, r) => sum + r.cost_usd, 0);
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assertClose(label: string, actual: number, expected: number, tol = 0.0001) {
  const ok = Math.abs(actual - expected) < tol;
  const mark = ok ? '✓' : '✗';
  console.log(`  ${mark}  ${label}`);
  if (!ok) console.log(`       → got ${actual.toFixed(6)}, expected ${expected.toFixed(6)}`);
  ok ? passed++ : failed++;
}

const NOW = '2026-07-29T12:00:00Z';
const D = (offsetDays: number) =>
  new Date(new Date(NOW).getTime() + offsetDays * 86_400_000).toISOString();

console.log('\n── Scenario 1: usage ouder dan 30 dagen telt NIET mee ────────────────');
{
  const usage: UsageRow[] = [
    { cost_usd: 2.00, created_at: D(-35) }, // ouder dan 30 dagen → buiten venster
    { cost_usd: 1.00, created_at: D(-31) }, // net buiten 30 dagen → buiten venster
    { cost_usd: 1.65, created_at: D(-10) }, // binnen 30 dagen → telt mee
    { cost_usd: 0.27, created_at: D(-1)  }, // gisteren → telt mee
  ];
  const spend = computeWindowSpend(usage, null, NOW);
  assertClose('usage > 30 dagen geleden telt niet mee', spend, 1.65 + 0.27);
  assertClose('totaal = $1.92 (niet $4.92)', spend, 1.92);
}

console.log('\n── Scenario 2: usage voor reset telt NIET mee, erna WEL ─────────────');
{
  const resetAt = D(-5); // reset 5 dagen geleden
  const usage: UsageRow[] = [
    { cost_usd: 3.00, created_at: D(-15) }, // voor reset → buiten venster
    { cost_usd: 0.50, created_at: D(-6)  }, // net voor reset → buiten venster
    { cost_usd: 1.65, created_at: D(-4)  }, // na reset → telt mee
    { cost_usd: 0.27, created_at: D(-1)  }, // na reset → telt mee
  ];
  const spend = computeWindowSpend(usage, { reset_at: resetAt }, NOW);
  assertClose('usage voor reset telt niet mee', spend, 1.65 + 0.27);
  assertClose('totaal = $1.92 (niet $5.42)', spend, 1.92);
}

console.log('\n── Scenario 3: gebruiker zonder resets werkt via COALESCE(-infinity) ─');
{
  // No reset row → windowStart = thirtyDaysAgo (all within-30d rows count)
  const usage: UsageRow[] = [
    { cost_usd: 1.00, created_at: D(-29) }, // 29 dagen geleden → telt mee
    { cost_usd: 1.65, created_at: D(-10) }, // telt mee
    { cost_usd: 0.27, created_at: D(-1)  }, // telt mee
  ];
  const spend = computeWindowSpend(usage, null, NOW);
  assertClose('geen reset-row → COALESCE naar 30d-grens', spend, 1.00 + 1.65 + 0.27);
  assertClose('totaal = $2.92', spend, 2.92);
}

console.log('\n── Scenario 4: reset ouder dan 30d wordt genegeerd (30d wint) ────────');
{
  // Reset 45 days ago → thirtyDaysAgo is more recent → window = 30d
  const resetAt = D(-45);
  const usage: UsageRow[] = [
    { cost_usd: 2.00, created_at: D(-35) }, // buiten 30d → telt niet mee
    { cost_usd: 1.65, created_at: D(-10) }, // binnen 30d → telt mee
  ];
  const spend = computeWindowSpend(usage, { reset_at: resetAt }, NOW);
  assertClose('reset ouder dan 30d → 30d-grens geldt', spend, 1.65);
}

console.log(`\n${'─'.repeat(70)}`);
console.log(`  ${passed}/${passed + failed} geslaagd${failed > 0 ? `  ✗ ${failed} FAIL` : '  ✓ alles goed'}`);
console.log('');

process.exit(failed > 0 ? 1 : 0);
