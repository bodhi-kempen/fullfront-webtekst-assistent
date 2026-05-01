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

// CORS_ORIGIN parsing: accepts a single origin, a comma-separated list, or
// "*" for any. In production we default to "*" — the deployed frontend hits
// the same origin so CORS isn't actually used by the app itself, but a
// permissive default keeps it simple if external clients ever call the API.
function parseCorsOrigin(): string | string[] | true {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) return isProd ? true : 'http://localhost:5173';
  if (raw === '*') return true;
  if (raw.includes(',')) return raw.split(',').map((s) => s.trim()).filter(Boolean);
  return raw;
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

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: parseCorsOrigin(),
  frameAncestors: parseFrameAncestors(),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
};
