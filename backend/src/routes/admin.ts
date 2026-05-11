import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { isAdminEmail, requireAdmin } from '../middleware/admin.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { getPagesWithContent, startContentGeneration } from '../services/content.js';
import { getStrategy } from '../services/strategy.js';
import { setProjectInContext } from '../lib/usage.js';

// ---------------------------------------------------------------------------
// CSV helpers — RFC 4180 escaping. UTF-8 BOM prefix so Excel auto-detects
// the encoding and shows é/ë/ñ correctly instead of mojibake.
// ---------------------------------------------------------------------------
const UTF8_BOM = '﻿';

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : String(value);
  // Always quote: simpler, never wrong, and Sheets/Excel handle it fine.
  return `"${s.replace(/"/g, '""')}"`;
}

function csvLine(cells: unknown[]): string {
  return cells.map(csvCell).join(',') + '\r\n';
}

function safeFileName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'project';
}

function sendCsv(res: import('express').Response, filename: string, body: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`
  );
  res.send(UTF8_BOM + body);
}

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

// ---------------------------------------------------------------------------
// CSV exports
// ---------------------------------------------------------------------------

interface AnswerRowDb {
  question_id: string;
  question_text: string;
  answer_text: string;
  phase: number;
  sequence_order: number;
  is_followup: boolean;
  answer_source: 'voice' | 'typed';
  created_at: string;
}

async function loadAnswers(projectId: string): Promise<AnswerRowDb[]> {
  const { data, error } = await supabaseAdmin
    .from('interview_answers')
    .select(
      'question_id, question_text, answer_text, phase, sequence_order, is_followup, answer_source, created_at'
    )
    .eq('project_id', projectId)
    .order('sequence_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AnswerRowDb[];
}

function interviewCsv(answers: AnswerRowDb[]): string {
  let out = csvLine([
    'deel',
    'vraag_id',
    'ai_vraag',
    'ondernemer_antwoord',
    'is_doorvraag',
    'bron',
    'tijdstip',
  ]);
  for (const a of answers) {
    out += csvLine([
      a.phase,
      a.question_id,
      a.question_text,
      a.answer_text,
      a.is_followup ? 'ja' : 'nee',
      a.answer_source,
      a.created_at,
    ]);
  }
  return out;
}

// GET /api/admin/export/projects/:id/interview.csv
adminRouter.get('/export/projects/:id/interview.csv', async (req, res, next) => {
  try {
    const projectId = req.params.id!;
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .maybeSingle();
    if (!project) return res.status(404).json({ error: 'Project niet gevonden' });

    const answers = await loadAnswers(projectId);
    const filename = `${safeFileName(project.name ?? 'project')}-interview.csv`;
    sendCsv(res, filename, interviewCsv(answers));
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/export/projects/:id/full.csv — interview + strategy + content,
// concatenated with section headers separated by blank lines.
adminRouter.get('/export/projects/:id/full.csv', async (req, res, next) => {
  try {
    const projectId = req.params.id!;

    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .maybeSingle();
    if (!project) return res.status(404).json({ error: 'Project niet gevonden' });

    const [answers, strategy, pages] = await Promise.all([
      loadAnswers(projectId),
      getStrategy(projectId).catch(() => null),
      getPagesWithContent(projectId).catch(() => []),
    ]);

    let body = '';

    // ---- Sectie 1: interview ----
    body += csvLine(['SECTIE 1 — INTERVIEW']);
    body += interviewCsv(answers);
    body += '\r\n';

    // ---- Sectie 2: strategie ----
    body += csvLine(['SECTIE 2 — STRATEGIE']);
    body += csvLine(['veld', 'waarde']);
    if (strategy) {
      // JSON-stringify nested values (suggested_pages, archetype_config) so
      // they survive a single CSV cell.
      const ordered: Array<[string, unknown]> = [
        ['website_type', strategy.website_type],
        ['tone_of_voice', strategy.tone_of_voice],
        ['addressing', strategy.addressing],
        ['primary_cta', strategy.primary_cta],
        ['archetype_config', strategy.archetype_config],
        ['suggested_pages', strategy.suggested_pages],
      ];
      for (const [field, value] of ordered) {
        const v = value === null || value === undefined
          ? ''
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);
        body += csvLine([field, v]);
      }
    } else {
      body += csvLine(['(geen strategie gegenereerd)', '']);
    }
    body += '\r\n';

    // ---- Sectie 3: gegenereerde teksten ----
    body += csvLine(['SECTIE 3 — GEGENEREERDE TEKSTEN']);
    body += csvLine(['pagina', 'sectie', 'veld', 'tekst']);
    for (const p of pages) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const s of (p as any).sections ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const f of s.fields ?? []) {
          if (!f.field_value) continue;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body += csvLine([(p as any).title, s.section_type, f.field_name, f.field_value]);
        }
      }
    }

    const filename = `${safeFileName(project.name ?? 'project')}-full.csv`;
    sendCsv(res, filename, body);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Re-trigger content generation for any project. Used to recover projects
// where generation crashed mid-flow and left status=strategy with a partial
// page set. The worker wipes existing pages before regenerating so the
// retry is idempotent regardless of how far the original run got.
// ---------------------------------------------------------------------------
adminRouter.post('/projects/:id/regenerate-content', async (req, res, next) => {
  try {
    const projectId = req.params.id!;

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('id, user_id, name, status')
      .eq('id', projectId)
      .maybeSingle();
    if (error) throw error;
    if (!project) return res.status(404).json({ error: 'Project niet gevonden' });

    // Make usage logged against this project (admin's user_id stays in context).
    setProjectInContext(projectId);

    // Fire-and-forget — the worker reverts status on failure, just like the
    // normal /strategy/approve path.
    startContentGeneration(projectId);

    res.json({
      ok: true,
      project_id: projectId,
      project_name: project.name,
      previous_status: project.status,
      message: 'Content-generatie opnieuw gestart. Status wordt "generating"; poll het project om de voortgang te zien.',
    });
  } catch (err) {
    next(err);
  }
});
