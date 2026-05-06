import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return env.adminEmails.includes(email.toLowerCase());
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Niet ingelogd' });
  }
  if (!isAdminEmail(req.user.email)) {
    return res.status(403).json({ error: 'Geen admin-toegang' });
  }
  next();
}
