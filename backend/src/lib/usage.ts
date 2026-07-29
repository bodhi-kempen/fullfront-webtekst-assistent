import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { supabaseAdmin } from './supabase.js';

// Anthropic Sonnet 4 pricing (USD per million tokens). Update if Anthropic
// adjusts pricing or we switch models.
const PRICING_PER_MTOK_USD = {
  'claude-sonnet-4-6': {
    input: 3.0,
    output: 15.0,
    cache_write: 3.75,
    cache_read: 0.3,
  },
} as const;

function priceFor(model: string) {
  return (
    PRICING_PER_MTOK_USD[model as keyof typeof PRICING_PER_MTOK_USD] ??
    PRICING_PER_MTOK_USD['claude-sonnet-4-6']
  );
}

export interface UsageTokens {
  input: number;
  output: number;
  cache_creation: number;
  cache_read: number;
}

export function computeCostUsd(model: string, t: UsageTokens): number {
  const p = priceFor(model);
  return (
    (t.input * p.input +
      t.output * p.output +
      t.cache_creation * p.cache_write +
      t.cache_read * p.cache_read) /
    1_000_000
  );
}

// ---------------------------------------------------------------------------
// AsyncLocalStorage carries the current request's user_id (and optional
// project_id) through every async hop so callTool can log and enforce
// without a signature change at every layer.
// ---------------------------------------------------------------------------
interface UsageContext {
  userId: string;
  projectId: string | null;
  /** Skip budget check (admin recovery flows). Usage is still logged. */
  bypassBudget?: boolean;
  /** In-memory accumulator for per-run spend. Set at the start of generateAllContent(). */
  runSpentUsd?: number;
  /** Per-run cap in USD. Throw RunBudgetExceededError when runSpentUsd exceeds this. */
  runBudgetUsd?: number;
}

const storage = new AsyncLocalStorage<UsageContext>();

export function withUsageContext<T>(ctx: UsageContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

export function getUsageContext(): UsageContext | undefined {
  return storage.getStore();
}

/** Express middleware: install context for every authed request. */
export function usageContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next();
  storage.run({ userId: req.user.id, projectId: null }, () => next());
}

/** Set the project_id once the route knows it (after assertProjectOwner). */
export function setProjectInContext(projectId: string) {
  const ctx = storage.getStore();
  if (ctx) ctx.projectId = projectId;
}

// ---------------------------------------------------------------------------
// Budget errors
// ---------------------------------------------------------------------------

/** Thrown when the user's 30-day rolling spend exceeds BUDGET_CAP_USD.
 *  Returns HTTP 402 from the error middleware. */
export class BudgetExceededError extends Error {
  status = 402;
  constructor(public spentUsd: number, public limitUsd: number) {
    super(
      'Je hebt het maximum aan AI-generaties voor deze periode bereikt. ' +
      'Neem contact op met Fullfront om verder te gaan.'
    );
    this.name = 'BudgetExceededError';
  }
}

/** Thrown inside generateAllContent() when a single run exceeds BUDGET_RUN_CAP_USD.
 *  Caught by startContentGeneration()'s catch block — never returned as HTTP. */
export class RunBudgetExceededError extends Error {
  constructor(public spentUsd: number, public limitUsd: number) {
    super(
      `Generatie afgebroken: runbudget overschreden ` +
      `($${spentUsd.toFixed(3)} van $${limitUsd.toFixed(2)} per run)`
    );
    this.name = 'RunBudgetExceededError';
  }
}

// ---------------------------------------------------------------------------
// Budget check
// ---------------------------------------------------------------------------

/**
 * Rolling-window budget check: sums cost_usd for this user from
 *   GREATEST(now() - 30 days, last budget_reset for this user)
 * to now. Throws BudgetExceededError if the total >= BUDGET_CAP_USD.
 */
export async function assertWithinBudget(): Promise<void> {
  const ctx = storage.getStore();
  if (!ctx || env.budgetCapUsd <= 0) return;
  if (ctx.bypassBudget) return;
  if (env.unlimitedBudgetUsers.includes(ctx.userId)) return;

  // Step 1: find the most recent manual reset for this user (if any).
  const { data: resetData, error: resetErr } = await supabaseAdmin
    .from('budget_resets')
    .select('reset_at')
    .eq('user_id', ctx.userId)
    .order('reset_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (resetErr) {
    console.error('[usage] budget_resets query failed', resetErr);
    // fail open — don't block users on a telemetry error
  }

  // Step 2: window start = GREATEST(now() - 30 days, last reset_at)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const lastResetAt = resetData?.reset_at ?? null;
  const windowStart =
    lastResetAt && lastResetAt > thirtyDaysAgo ? lastResetAt : thirtyDaysAgo;

  // Step 3: sum usage since window start.
  const { data, error } = await supabaseAdmin
    .from('claude_usage')
    .select('cost_usd')
    .eq('user_id', ctx.userId)
    .gt('created_at', windowStart);

  if (error) {
    console.error('[usage] budget check query failed', error);
    return; // fail open
  }

  const spent = (data ?? []).reduce(
    (sum, row) => sum + Number(row.cost_usd ?? 0),
    0
  );
  if (spent >= env.budgetCapUsd) {
    throw new BudgetExceededError(spent, env.budgetCapUsd);
  }
}

// ---------------------------------------------------------------------------
// Usage logging (+ per-run guard)
// ---------------------------------------------------------------------------

/** Log one Claude call's usage. Also advances the in-memory run spend counter
 *  and throws RunBudgetExceededError if the run cap is exceeded. */
export async function logUsage(opts: {
  purpose: string;
  model: string;
  tokens: UsageTokens;
}) {
  const ctx = storage.getStore();
  if (!ctx) {
    console.warn(`[usage] no context for ${opts.purpose} — skipping log`);
    return;
  }

  const cost = computeCostUsd(opts.model, opts.tokens);

  const { error } = await supabaseAdmin.from('claude_usage').insert({
    user_id: ctx.userId,
    project_id: ctx.projectId,
    purpose: opts.purpose,
    model: opts.model,
    input_tokens: opts.tokens.input,
    output_tokens: opts.tokens.output,
    cache_creation_tokens: opts.tokens.cache_creation,
    cache_read_tokens: opts.tokens.cache_read,
    cost_usd: cost,
  });
  if (error) {
    console.error('[usage] insert failed', error);
  }

  // Per-run guard: check AFTER this call completes (never mid-call).
  // Bypassed for admin recovery flows.
  if (ctx.runBudgetUsd !== undefined && !ctx.bypassBudget) {
    ctx.runSpentUsd = (ctx.runSpentUsd ?? 0) + cost;
    if (ctx.runSpentUsd > ctx.runBudgetUsd) {
      throw new RunBudgetExceededError(ctx.runSpentUsd, ctx.runBudgetUsd);
    }
  }
}
