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
// Budget check + logging
// ---------------------------------------------------------------------------

export class BudgetExceededError extends Error {
  status = 402;
  constructor(public spentUsd: number, public limitUsd: number) {
    super(
      `Gebruikslimiet bereikt: $${spentUsd.toFixed(2)} van $${limitUsd.toFixed(
        2
      )} verbruikt.`
    );
    this.name = 'BudgetExceededError';
  }
}

/** Throws BudgetExceededError if the user has exceeded MAX_USAGE_USD_PER_USER. */
export async function assertWithinBudget(): Promise<void> {
  const ctx = storage.getStore();
  if (!ctx || env.maxUsageUsdPerUser <= 0) return;

  const { data, error } = await supabaseAdmin
    .from('claude_usage')
    .select('cost_usd')
    .eq('user_id', ctx.userId);

  if (error) {
    console.error('[usage] budget check query failed', error);
    return; // fail open — don't block users on a telemetry error
  }

  const spent = (data ?? []).reduce(
    (sum, row) => sum + Number(row.cost_usd ?? 0),
    0
  );
  if (spent >= env.maxUsageUsdPerUser) {
    throw new BudgetExceededError(spent, env.maxUsageUsdPerUser);
  }
}

/** Log one Claude call's usage. Failure is logged but never thrown. */
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
}
