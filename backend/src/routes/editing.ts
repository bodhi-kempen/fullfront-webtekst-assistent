import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  assertSectionOwner,
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
    await assertSectionOwner(sectionId, req.user!.id);

    const { value } = (req.body ?? {}) as { value?: string };
    if (typeof value !== 'string') {
      return res.status(400).json({ error: 'value (string) is required' });
    }
    const updated = await updateFieldValue(fieldId, value);
    res.json({ field: updated });
  } catch (err) {
    const s = statusFromErr(err);
    if (s) return res.status(s.status).json({ error: s.message });
    next(err);
  }
});

// POST /api/sections/:id/regenerate
editingRouter.post('/:id/regenerate', async (req, res, next) => {
  try {
    const sectionId = req.params.id!;
    const owner = await assertSectionOwner(sectionId, req.user!.id);
    await regenerateSection(sectionId, owner.pageType, owner.projectId);
    res.json({ ok: true });
  } catch (err) {
    const s = statusFromErr(err);
    if (s) return res.status(s.status).json({ error: s.message });
    next(err);
  }
});

// POST /api/sections/:id/regenerate-with-prompt
editingRouter.post('/:id/regenerate-with-prompt', async (req, res, next) => {
  try {
    const sectionId = req.params.id!;
    const owner = await assertSectionOwner(sectionId, req.user!.id);
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
