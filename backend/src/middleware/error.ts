import type { NextFunction, Request, Response } from 'express';
import { BudgetExceededError } from '../lib/usage.js';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof BudgetExceededError) {
    // 402 Payment Required surfaces this distinctly from real server errors.
    return res.status(402).json({ error: err.message, code: 'budget_exceeded' });
  }
  console.error(err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}
