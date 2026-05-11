import { supabaseAdmin } from './supabase.js';
import { isAdminEmail } from '../middleware/admin.js';

interface RequestUser {
  id: string;
  email: string | null;
}

function httpError(status: number, message: string): Error {
  return Object.assign(new Error(message), { statusCode: status });
}

/** Throws 404 unless the user owns the project OR is an admin. Admins get
 *  read+write access to every project for support/quality-review. */
export async function assertProjectAccess(
  projectId: string,
  user: RequestUser
): Promise<void> {
  // Admins always pass — no DB round-trip needed for the check itself, but
  // we still verify the project exists so a typo doesn't pretend-succeed.
  if (isAdminEmail(user.email)) {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(404, 'Project not found');
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw httpError(404, 'Project not found');
}

/** Resolve a section to its page+project, gated by owner-or-admin access. */
export async function assertSectionAccess(
  sectionId: string,
  user: RequestUser
): Promise<{ pageId: string; pageType: string; projectId: string }> {
  const { data, error } = await supabaseAdmin
    .from('sections')
    .select('id, page_id, pages!inner(id, page_type, project_id, projects!inner(user_id))')
    .eq('id', sectionId)
    .maybeSingle();
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  if (!row) throw httpError(404, 'Section not found');

  const projectUserId = row.pages?.projects?.user_id;
  if (projectUserId !== user.id && !isAdminEmail(user.email)) {
    throw httpError(404, 'Section not found');
  }
  return {
    pageId: row.pages.id,
    pageType: row.pages.page_type,
    projectId: row.pages.project_id,
  };
}
