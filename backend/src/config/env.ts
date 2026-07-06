import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

// Load backend/.env regardless of where `node` was started from. On Railway
// env vars come from the platform and this file may not exist — that's
// fine, dotenv silently no-ops.
const __envDir = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(__envDir, '../../.env') });

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const isProd = process.env.NODE_ENV === 'production';

// Baseline origin allowlist for Fullfront-hosted contexts. Matches the
// hostnames the app ships with — the main app, the marketing site, and any
// *.fullfront.nl subdomain used for the ledenomgeving embed. Individual
// origins compare exact; anything ending in .fullfront.nl is treated as a
// wildcard subdomain. localhost is only allowed outside production.
const DEFAULT_ALLOWED_ORIGINS: readonly string[] = [
  'https://webtekst.fullfront.nl',
  'https://fullfront.nl',
  'https://www.fullfront.nl',
];
const DEFAULT_ALLOWED_SUFFIXES: readonly string[] = [
  '.fullfront.nl', // covers ledenomgeving.fullfront.nl, staging.fullfront.nl, etc.
];

function isFullfrontOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:') return false;
    const host = url.host.toLowerCase();
    if (DEFAULT_ALLOWED_ORIGINS.some((o) => new URL(o).host === host)) return true;
    return DEFAULT_ALLOWED_SUFFIXES.some((suffix) => host.endsWith(suffix));
  } catch {
    return false;
  }
}

/**
 * CORS_ORIGIN parsing.
 * - Empty (dev): allow http://localhost:5173.
 * - Empty (prod): use the Fullfront allowlist (fullfront.nl + *.fullfront.nl).
 * - "*": kept for emergencies (staging debugging) but logs a warning at boot.
 * - Comma-separated: those origins are ADDED to the Fullfront allowlist.
 *
 * Returned as a function so we can honour the *.fullfront.nl subdomain
 * wildcard cleanly. Requests without an Origin header (curl, server-to-server,
 * same-origin browser calls) still pass — there's no CSRF surface without an
 * Origin, and blocking them would break the frontend.
 */
type CorsOriginFn = (
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void
) => void;

function parseCorsOrigin(): string | string[] | true | CorsOriginFn {
  const raw = process.env.CORS_ORIGIN;
  if (raw === '*') {
    console.warn(
      '[cors] CORS_ORIGIN="*" — allowing any origin. Only use for temporary debugging.'
    );
    return true;
  }

  // Dev default: local Vite only.
  if (!raw && !isProd) {
    return 'http://localhost:5173';
  }

  const extras = (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (origin, cb) => {
    if (!origin) return cb(null, true);
    if (isFullfrontOrigin(origin)) return cb(null, true);
    if (extras.includes(origin)) return cb(null, true);
    if (!isProd && origin.startsWith('http://localhost:')) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  };
}

// Comma-separated list of origins allowed to embed the app in an <iframe>.
// Drives the `Content-Security-Policy: frame-ancestors` header. Wildcards
// (e.g. *.fullfront.nl) are passed through verbatim — CSP supports them.
// Default in dev: 'self' only. In prod, leave empty to disable embedding,
// or set the var to opt in.
function parseFrameAncestors(): string[] {
  const raw = process.env.ALLOWED_FRAME_ORIGINS;
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function parseUnlimitedBudgetUsers(): string[] {
  const raw = process.env.UNLIMITED_BUDGET_USERS;
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: parseCorsOrigin(),
  frameAncestors: parseFrameAncestors(),
  adminEmails: parseAdminEmails(),
  // User ids that bypass the per-user spend cap entirely. Usage is still
  // logged in claude_usage; only the budget gate is skipped. Set via
  // UNLIMITED_BUDGET_USERS as a comma-separated list of UUIDs.
  unlimitedBudgetUsers: parseUnlimitedBudgetUsers(),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
  // Per-user lifetime spend cap on Claude (USD). Set to 0 to disable.
  // Default $3 ≈ €2,80 — enough for ~3 complete projects at current usage.
  maxUsageUsdPerUser: Number(process.env.MAX_USAGE_USD_PER_USER ?? 3),
};
