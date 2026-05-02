import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

/** Build the value for `Permissions-Policy: microphone=(...)` from the
 *  same allowlist that drives frame-ancestors. Each origin must be a
 *  quoted URL; `self` is the unquoted "current origin" keyword. The
 *  Permissions-Policy spec doesn't support host wildcards, so values
 *  like "https://*.fullfront.nl" are passed through verbatim — modern
 *  browsers ignore unrecognized tokens, and any concrete origins in
 *  the list still take effect. */
function microphoneAllowlist(): string | null {
  if (env.frameAncestors.length === 0) return null;
  const tokens = env.frameAncestors
    .filter((s) => /^https?:\/\//.test(s))
    .map((s) => `"${s}"`);
  return ['self', ...tokens].join(' ');
}

export function frameEmbed(_req: Request, res: Response, next: NextFunction) {
  // Express doesn't set X-Frame-Options by default, but defensively remove it
  // so any upstream proxy or future middleware can't accidentally block embedding.
  res.removeHeader('X-Frame-Options');

  if (env.frameAncestors.length > 0) {
    const sources = ["'self'", ...env.frameAncestors].join(' ');
    res.setHeader('Content-Security-Policy', `frame-ancestors ${sources}`);
  }

  // Permissions-Policy delegates microphone access to the listed origins
  // when the app runs inside an <iframe>. Without this, Safari/Chrome
  // refuse SpeechRecognition.start() in the iframe even when allow="microphone"
  // is set on the parent's iframe tag.
  const micAllow = microphoneAllowlist();
  if (micAllow) {
    res.setHeader('Permissions-Policy', `microphone=(${micAllow})`);
  }

  next();
}
