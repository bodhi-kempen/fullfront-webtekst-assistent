import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import {
  approveStrategy,
  generateStrategy,
  getStrategy,
  updateStrategy,
  type StrategyUpdate,
} from '../services/strategy.js';
import { startContentGeneration } from '../services/content.js';

export const strategyRouter = Router({ mergeParams: true });

strategyRouter.use(requireAuth);

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

// POST /api/projects/:id/strategy/generate
strategyRouter.post('/generate', async (req, res, next) => {
  try {
    const projectId = getId(req);
    await assertOwner(projectId, req.user!.id);
    const strategy = await generateStrategy(projectId);
    res.json({ strategy });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id/strategy
strategyRouter.get('/', async (req, res, next) => {
  try {
    const projectId = getId(req);
    await assertOwner(projectId, req.user!.id);
    const strategy = await getStrategy(projectId);
    if (!strategy) return res.status(404).json({ error: 'Strategy not yet generated' });
    res.json({ strategy });
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id/strategy
strategyRouter.put('/', async (req, res, next) => {
  try {
    const projectId = getId(req);
    await assertOwner(projectId, req.user!.id);
    const updates = (req.body ?? {}) as StrategyUpdate;
    const strategy = await updateStrategy(projectId, updates);
    res.json({ strategy });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/strategy/approve
strategyRouter.post('/approve', async (req, res, next) => {
  try {
    const projectId = getId(req);
    await assertOwner(projectId, req.user!.id);
    const strategy = await approveStrategy(projectId);
    // Kick off content generation in the background. Server returns immediately.
    void startContentGeneration(projectId);
    res.json({ strategy, generating: true });
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const e = err as Error & { statusCode: number };
      return res.status(e.statusCode).json({ error: e.message });
    }
    next(err);
  }
});
