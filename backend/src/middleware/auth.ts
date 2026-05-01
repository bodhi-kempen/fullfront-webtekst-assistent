import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { withUsageContext } from '../lib/usage.js';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string | null };
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  const token = header.slice('Bearer '.length).trim();
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = { id: data.user.id, email: data.user.email ?? null };

  // Install usage telemetry context for the rest of the request. Routes that
  // know a project_id call setProjectInContext() after assertProjectOwner.
  // Returning a promise so the async context spans the whole handler chain.
  return withUsageContext(
    { userId: data.user.id, projectId: null },
    async () => next()
  );
}
