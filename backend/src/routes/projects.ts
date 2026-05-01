import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

// GET /api/projects
projectsRouter.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json({ projects: data });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects
projectsRouter.post('/', async (req, res, next) => {
  try {
    const { name, business_name, language } = req.body ?? {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert({
        user_id: req.user!.id,
        name,
        business_name: business_name ?? null,
        language: language === 'en' ? 'en' : 'nl',
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ project: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id
projectsRouter.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Project not found' });
    res.json({ project: data });
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id
projectsRouter.put('/:id', async (req, res, next) => {
  try {
    const allowed = ['name', 'business_name', 'language', 'status'] as const;
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in (req.body ?? {})) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }
    const { data, error } = await supabaseAdmin
      .from('projects')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Project not found' });
    res.json({ project: data });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id
projectsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { error, count } = await supabaseAdmin
      .from('projects')
      .delete({ count: 'exact' })
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id);
    if (error) throw error;
    if (!count) return res.status(404).json({ error: 'Project not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
