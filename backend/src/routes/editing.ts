import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sectionRegenerateLimiter } from '../middleware/rateLimit.js';
import { assertSectionAccess } from '../lib/projectAccess.js';
import { setProjectInContext } from '../lib/usage.js';
import {
  regenerateSection,
  updateFieldValue,
} from '../services/editing.js';

export const editingRouter = Router();

editingRouter.use(requireAuth);

function statusFromErr(err: unknown): { status: number; message: string } | null {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const e = err as Error & { statusCode: number };
    return { status: e.statusCode, message: e.message };
  }
  return null;
}

// PUT /api/sections/:id/content/:field_id
editingRouter.put('/:id/content/:field_id', async (req, res, next) => {
  try {
    const sectionId = req.params.id!;
    const fieldId = req.params.field_id!;
    await assertSectionAccess(sectionId, req.user!);

    const { value } = (req.body ?? {}) as { value?: string };
    if (typeof value !== 'string') {
      return res.status(400).json({ error: 'value (string) is required' });
    }
    // Force the field to belong to the section we just access-checked.
    // Without this a user who owns section A could send another user's
    // field_id and updateFieldValue would happily overwrite their row.
    const updated = await updateFieldValue(fieldId, value, sectionId);
    res.json({ field: updated });
  } catch (err) {
    const s = statusFromErr(err);
    if (s) return res.status(s.status).json({ error: s.message });
    next(err);
  }
});

// POST /api/sections/:id/regenerate
// Per-user 20/hour rate limit — supports normal polish iterations, but caps
// accidental loops that would drain Anthropic budget.
editingRouter.post('/:id/regenerate', sectionRegenerateLimiter, async (req, res, next) => {
  try {
    const sectionId = req.params.id!;
    const owner = await assertSectionAccess(sectionId, req.user!);
    setProjectInContext(owner.projectId);
    await regenerateSection(sectionId, owner.pageType, owner.projectId);
    res.json({ ok: true });
  } catch (err) {
    const s = statusFromErr(err);
    if (s) return res.status(s.status).json({ error: s.message });
    next(err);
  }
});

// POST /api/sections/:id/regenerate-with-prompt
// Shares the section-regenerate quota (20/hour) with the plain regenerate route.
editingRouter.post('/:id/regenerate-with-prompt', sectionRegenerateLimiter, async (req, res, next) => {
  try {
    const sectionId = req.params.id!;
    const owner = await assertSectionAccess(sectionId, req.user!);
    setProjectInContext(owner.projectId);
    const { instruction } = (req.body ?? {}) as { instruction?: string };
    if (typeof instruction !== 'string' || instruction.trim().length === 0) {
      return res.status(400).json({ error: 'instruction (string) is required' });
    }
    await regenerateSection(sectionId, owner.pageType, owner.projectId, instruction);
    res.json({ ok: true });
  } catch (err) {
    const s = statusFromErr(err);
    if (s) return res.status(s.status).json({ error: s.message });
    next(err);
  }
});
