import type { Request } from 'express';
import { rateLimit } from 'express-rate-limit';

/**
 * Rate limiters used by the API. All limits are per-process — in production
 * this is a single Railway container so the count is the effective limit.
 * If we move to multiple replicas we'll need a store (Redis) to share state.
 *
 * All limiters return 429 with a Dutch error message that the frontend can
 * surface directly. The `Retry-After` header is set by express-rate-limit.
 */

// Extract user id from an already-authenticated request. Handlers that use
// `perUserLimiter` are ALWAYS mounted behind requireAuth, so req.user is set.
function userKey(req: Request): string {
  return req.user?.id ?? req.ip ?? 'unknown';
}

/**
 * Signup / anonymous account creation — max 5 per IP per hour.
 * Note: signup happens client-side via the Supabase JS SDK, so this backend
 * limiter only fires if the client also pings a signup-adjacent endpoint.
 * The primary defense is Supabase's built-in auth rate limit configured in
 * the Supabase dashboard. This is a secondary layer for any future
 * signup-proxy endpoint we add on the backend.
 */
export const authSignupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Te veel accounts vanaf dit IP-adres aangemaakt. Probeer het over een uur opnieuw.',
  },
});

/**
 * Interview answer submission — 30 per user per minute.
 * The interview needs to feel responsive; 30/min gives comfortable headroom
 * for a normal typing pace (one Q every ~15s) with room for corrections and
 * retries, but blocks scripted flooding of a single project.
 */
export const interviewAnswerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKey,
  message: {
    error: 'Je stuurt de antwoorden te snel achter elkaar in. Wacht even en probeer het opnieuw.',
  },
});

/**
 * Content generation triggers — 3 per user per hour.
 * Covers both first-time generation (strategy approve) and full-project
 * regeneration. Rechonstruction is expensive (~$0.30 per full project); we
 * don't want a single user burning through the budget cap in an accidental
 * loop. Section-level regenerate has its own, gentler limiter below.
 */
export const contentGenerateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKey,
  message: {
    error: 'Je hebt de projectgeneratie maximaal drie keer per uur beschikbaar. Probeer het later opnieuw.',
  },
});

/**
 * Single-section regenerate — 20 per user per hour.
 * Users iterate quickly on individual sections while polishing copy; a
 * per-section regenerate costs ~$0.01–$0.03. 20/hour still bounds the
 * damage from an accidental loop without harming normal editing.
 */
export const sectionRegenerateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKey,
  message: {
    error: 'Je hebt de sectie te vaak opnieuw laten genereren binnen een uur. Probeer het later opnieuw.',
  },
});
