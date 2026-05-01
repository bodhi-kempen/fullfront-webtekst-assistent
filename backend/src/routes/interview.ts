import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { setProjectInContext } from '../lib/usage.js';
import {
  getInterviewStep,
  markInterviewComplete,
  submitAnswer,
  type SubmitAnswerInput,
} from '../services/interview.js';

export const interviewRouter = Router({ mergeParams: true });

interviewRouter.use(requireAuth);

async function assertProjectOwner(
  projectId: string,
  userId: string
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const err = Object.assign(new Error('Project not found'), {
      statusCode: 404,
    });
    throw err;
  }
}

// POST /api/projects/:id/interview/start
interviewRouter.post('/start', async (req, res, next) => {
  try {
    const projectId = (req.params as { id: string }).id;
    await assertProjectOwner(projectId, req.user!.id);
    setProjectInContext(projectId);
    const step = await getInterviewStep(projectId);
    res.json(step);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/interview/answer
interviewRouter.post('/answer', async (req, res, next) => {
  try {
    const projectId = (req.params as { id: string }).id;
    await assertProjectOwner(projectId, req.user!.id);
    setProjectInContext(projectId);

    const body = (req.body ?? {}) as Partial<SubmitAnswerInput>;
    if (!body.question_id || !body.answer_text || !body.answer_source) {
      return res
        .status(400)
        .json({ error: 'question_id, answer_text, answer_source required' });
    }
    if (body.answer_source !== 'voice' && body.answer_source !== 'typed') {
      return res
        .status(400)
        .json({ error: 'answer_source must be "voice" or "typed"' });
    }

    const step = await submitAnswer(projectId, {
      question_id: body.question_id,
      question_text: body.question_text,
      answer_text: body.answer_text,
      answer_source: body.answer_source,
    });
    res.json(step);
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const e = err as Error & { statusCode: number };
      return res.status(e.statusCode).json({ error: e.message });
    }
    next(err);
  }
});

// GET /api/projects/:id/interview/status
interviewRouter.get('/status', async (req, res, next) => {
  try {
    const projectId = (req.params as { id: string }).id;
    await assertProjectOwner(projectId, req.user!.id);
    setProjectInContext(projectId);
    const step = await getInterviewStep(projectId);
    res.json(step);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/interview/complete
interviewRouter.post('/complete', async (req, res, next) => {
  try {
    const projectId = (req.params as { id: string }).id;
    await assertProjectOwner(projectId, req.user!.id);
    setProjectInContext(projectId);
    await markInterviewComplete(projectId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
