import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { loadExportDoc, loadExportPage } from '../services/export-render.js';
import { renderDocAsDocx } from '../services/export-docx.js';
import { renderDocAsPdf } from '../services/export-pdf.js';
import { renderPageAsText } from '../services/export-text.js';

export const exportRouter = Router({ mergeParams: true });

exportRouter.use(requireAuth);

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

function safeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'website'
  );
}

// POST /api/projects/:id/export/word
exportRouter.post('/word', async (req, res, next) => {
  try {
    const projectId = getId(req);
    await assertOwner(projectId, req.user!.id);
    const doc = await loadExportDoc(projectId);
    const buffer = await renderDocAsDocx(doc);
    const filename = `${safeFilename(doc.business_name)}-websiteteksten.docx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const e = err as Error & { statusCode: number };
      return res.status(e.statusCode).json({ error: e.message });
    }
    next(err);
  }
});

// POST /api/projects/:id/export/pdf
exportRouter.post('/pdf', async (req, res, next) => {
  try {
    const projectId = getId(req);
    await assertOwner(projectId, req.user!.id);
    const doc = await loadExportDoc(projectId);
    const buffer = await renderDocAsPdf(doc);
    const filename = `${safeFilename(doc.business_name)}-websiteteksten.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const e = err as Error & { statusCode: number };
      return res.status(e.statusCode).json({ error: e.message });
    }
    next(err);
  }
});

// GET /api/projects/:id/export/copy/:page_id
exportRouter.get('/copy/:page_id', async (req, res, next) => {
  try {
    const projectId = getId(req);
    await assertOwner(projectId, req.user!.id);
    const pageId = (req.params as { page_id: string }).page_id;
    const result = await loadExportPage(projectId, pageId);
    if (!result) return res.status(404).json({ error: 'Page not found' });
    const text = renderPageAsText(result.page, result.businessName);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(text);
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const e = err as Error & { statusCode: number };
      return res.status(e.statusCode).json({ error: e.message });
    }
    next(err);
  }
});
