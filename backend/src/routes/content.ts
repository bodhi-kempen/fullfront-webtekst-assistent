import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import {
  getPagesWithContent,
  startContentGeneration,
} from '../services/content.js';

export const contentRouter = Router({ mergeParams: true });

contentRouter.use(requireAuth);

async function assertOwner(projectId: string, userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw Object.assign(new Error('Project not found'), { statusCode: 404 });
  }
}

function getId(req: { params: unknown }): string {
  return (req.params as { id: string }).id;
}

// POST /api/projects/:id/generate
contentRouter.post('/generate', async (req, res, next) => {
  try {
    const projectId = getId(req);
    await assertOwner(projectId, req.user!.id);
    startContentGeneration(projectId);
    res.json({ generating: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id/pages
contentRouter.get('/pages', async (req, res, next) => {
  try {
    const projectId = getId(req);
    await assertOwner(projectId, req.user!.id);

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('status')
      .eq('id', projectId)
      .maybeSingle();
    if (error) throw error;

    const pages = await getPagesWithContent(projectId);
    res.json({ status: project?.status ?? null, pages });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id/pages/:page_id
contentRouter.get('/pages/:page_id', async (req, res, next) => {
  try {
    const projectId = getId(req);
    await assertOwner(projectId, req.user!.id);
    const pages = await getPagesWithContent(projectId);
    const pageId = (req.params as { page_id: string }).page_id;
    const page = pages.find((p) => p.id === pageId);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json({ page });
  } catch (err) {
    next(err);
  }
});
