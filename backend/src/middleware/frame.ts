import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

export function frameEmbed(_req: Request, res: Response, next: NextFunction) {
  // Express doesn't set X-Frame-Options by default, but defensively remove it
  // so any upstream proxy or future middleware can't accidentally block embedding.
  res.removeHeader('X-Frame-Options');

  if (env.frameAncestors.length > 0) {
    const sources = ["'self'", ...env.frameAncestors].join(' ');
    res.setHeader('Content-Security-Policy', `frame-ancestors ${sources}`);
  }

  next();
}
