import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { isAdminEmail, requireAdmin } from '../middleware/admin.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { getPagesWithContent } from '../services/content.js';
import { getStrategy } from '../services/strategy.js';

export const adminRouter = Router();

// All admin routes require auth. /me is the only one any authed user can hit
// (it just tells them whether they have admin access). The rest gate on
// requireAdmin too.
adminRouter.use(requireAuth);

// GET /api/admin/me — minimal probe so the frontend can render the admin
// nav link without round-tripping every page.
adminRouter.get('/me', (req, res) => {
  res.json({ is_admin: isAdminEmail(req.user?.email) });
});

adminRouter.use(requireAdmin);

// GET /api/admin/stats — totals for the dashboard tile.
adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const [{ count: projectCount }, { count: completedInterviews }, { data: usage }] =
      await Promise.all([
        supabaseAdmin.from('projects').select('id', { count: 'exact', head: true }),
        supabaseAdmin
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .in('status', ['strategy', 'generating', 'review', 'completed']),
        supabaseAdmin.from('claude_usage').select('cost_usd'),
      ]);

    const totalCostUsd = (usage ?? []).reduce(
      (sum, row) => sum + Number(row.cost_usd ?? 0),
      0
    );

    const { count: reviewCount } = await supabaseAdmin
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .in('status', ['review', 'completed']);

    res.json({
      total_projects: projectCount ?? 0,
      interviews_completed: completedInterviews ?? 0,
      content_generated: reviewCount ?? 0,
      total_cost_usd: Number(totalCostUsd.toFixed(4)),
      total_claude_calls: usage?.length ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/projects — every project in the system with summary fields.
adminRouter.get('/projects', async (_req, res, next) => {
  try {
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('id, user_id, name, archetype, sub_archetype, status, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Bring in cost per project in one query, then merge.
    const { data: usageRows } = await supabaseAdmin
      .from('claude_usage')
      .select('project_id, cost_usd');

    const costByProject = new Map<string, number>();
    for (const row of usageRows ?? []) {
      if (!row.project_id) continue;
      const sum = costByProject.get(row.project_id) ?? 0;
      costByProject.set(row.project_id, sum + Number(row.cost_usd ?? 0));
    }

    // Fetch owner emails in one batch via auth admin API. Skipping silently
    // if the lookup fails — the project list still works without the email.
    const userIds = Array.from(
      new Set((projects ?? []).map((p) => p.user_id).filter(Boolean))
    );
    const emailByUser = new Map<string, string | null>();
    for (const uid of userIds) {
      try {
        const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
        emailByUser.set(uid, data.user?.email ?? null);
      } catch {
        emailByUser.set(uid, null);
      }
    }

    const enriched = (projects ?? []).map((p) => ({
      ...p,
      owner_email: emailByUser.get(p.user_id) ?? null,
      cost_usd: Number((costByProject.get(p.id) ?? 0).toFixed(4)),
    }));

    res.json({ projects: enriched });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/projects/:id — full data for one project.
adminRouter.get('/projects/:id', async (req, res, next) => {
  try {
    const projectId = req.params.id!;

    const [{ data: project }, { data: answers }, strategy, pages, { data: usage }] =
      await Promise.all([
        supabaseAdmin
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .maybeSingle(),
        supabaseAdmin
          .from('interview_answers')
          .select('*')
          .eq('project_id', projectId)
          .order('sequence_order', { ascending: true }),
        getStrategy(projectId).catch(() => null),
        getPagesWithContent(projectId).catch(() => []),
        supabaseAdmin
          .from('claude_usage')
          .select('purpose, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, cost_usd, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true }),
      ]);

    if (!project) {
      return res.status(404).json({ error: 'Project niet gevonden' });
    }

    // Resolve owner email.
    let owner_email: string | null = null;
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(project.user_id);
      owner_email = data.user?.email ?? null;
    } catch {
      // ignore
    }

    const usageRows = usage ?? [];
    const totalCost = usageRows.reduce(
      (sum, row) => sum + Number(row.cost_usd ?? 0),
      0
    );

    res.json({
      project: { ...project, owner_email },
      answers: answers ?? [],
      strategy,
      pages,
      usage: {
        rows: usageRows,
        total_cost_usd: Number(totalCost.toFixed(4)),
        call_count: usageRows.length,
      },
    });
  } catch (err) {
    next(err);
  }
});
