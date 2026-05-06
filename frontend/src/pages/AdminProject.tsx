import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react';
import { AppShell, PageHeader } from '../components/AppShell';
import { useAuth } from '../contexts/AuthContext';
import { apiDownload, apiFetch } from '../lib/api';

interface AnswerRow {
  id: string;
  question_id: string;
  question_text: string;
  answer_text: string;
  phase: number;
  sequence_order: number;
  is_followup: boolean;
  parent_question_id: string | null;
  answer_source: 'voice' | 'typed';
  created_at: string;
}

interface UsageRow {
  purpose: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  cost_usd: number;
  created_at: string;
}

interface SectionField {
  field_name: string;
  field_value: string;
}

interface SectionBlock {
  id: string;
  section_type: string;
  fields: SectionField[];
}

interface PageBlock {
  id: string;
  title: string;
  slug: string;
  page_type: string;
  sections: SectionBlock[];
}

interface AdminProjectResponse {
  project: {
    id: string;
    name: string;
    owner_email: string | null;
    archetype: string | null;
    sub_archetype: string | null;
    status: string;
    created_at: string;
    business_name: string | null;
  };
  answers: AnswerRow[];
  strategy: unknown;
  pages: PageBlock[];
  usage: { rows: UsageRow[]; total_cost_usd: number; call_count: number };
}

export function AdminProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [data, setData] = useState<AdminProjectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !isAdmin) return;
    let cancelled = false;
    apiFetch<AdminProjectResponse>(`/api/admin/projects/${id}`)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Kon project niet laden');
      });
    return () => {
      cancelled = true;
    };
  }, [id, isAdmin]);

  if (authLoading) {
    return (
      <AppShell sidebar={<></>}>
        <p className="muted">Bezig met laden…</p>
      </AppShell>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  const sidebar = (
    <div className="sidebar-group">
      <button type="button" className="nav-item" onClick={() => navigate('/')}>
        <LayoutDashboard /> Dashboard
      </button>
      <button type="button" className="nav-item" onClick={() => navigate('/admin')}>
        <ShieldCheck /> Admin
      </button>
    </div>
  );

  if (error) {
    return (
      <AppShell sidebar={sidebar}>
        <div className="login-error">{error}</div>
      </AppShell>
    );
  }
  if (!data) {
    return (
      <AppShell sidebar={sidebar}>
        <p className="muted">Bezig met laden…</p>
      </AppShell>
    );
  }

  const { project, answers, strategy, pages, usage } = data;

  // Group answers by phase for readability.
  const byPhase = new Map<number, AnswerRow[]>();
  for (const a of answers) {
    const arr = byPhase.get(a.phase) ?? [];
    arr.push(a);
    byPhase.set(a.phase, arr);
  }

  function downloadWord() {
    apiDownload(`/api/projects/${project.id}/export/word`, { method: 'POST' }).catch(
      (err) => setError(err instanceof Error ? err.message : 'Word-download mislukt')
    );
  }
  function downloadPdf() {
    apiDownload(`/api/projects/${project.id}/export/pdf`, { method: 'POST' }).catch(
      (err) => setError(err instanceof Error ? err.message : 'PDF-download mislukt')
    );
  }

  return (
    <AppShell sidebar={sidebar}>
      <PageHeader
        title={project.name}
        subtitle={
          <>
            <Link to="/admin" className="link">
              <ArrowLeft style={{ width: 12, height: 12, verticalAlign: -1 }} /> Terug
            </Link>
            {' · '}
            {project.owner_email ?? 'onbekende eigenaar'} · {project.archetype ?? '—'}
            {project.sub_archetype ? ` + ${project.sub_archetype}` : ''} · {project.status}
          </>
        }
        right={
          pages.length > 0 ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary btn-compact" onClick={downloadWord}>
                <Download /> Word
              </button>
              <button type="button" className="btn btn-secondary btn-compact" onClick={downloadPdf}>
                <Download /> PDF
              </button>
              <a
                className="btn btn-secondary btn-compact"
                href={`/review/${project.id}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink /> Open review
              </a>
            </div>
          ) : null
        }
      />

      {/* Usage */}
      <div className="card mt-4">
        <div className="card-title">Claude-kosten</div>
        <p className="muted">
          {usage.call_count} calls · ${usage.total_cost_usd.toFixed(4)} totaal
        </p>
        <table className="admin-table mt-2">
          <thead>
            <tr>
              <th>Purpose</th>
              <th className="text-right">Input</th>
              <th className="text-right">Output</th>
              <th className="text-right">Cache R/W</th>
              <th className="text-right">Kosten</th>
            </tr>
          </thead>
          <tbody>
            {usage.rows.map((u, i) => (
              <tr key={i}>
                <td>{u.purpose}</td>
                <td className="text-right tiny">{u.input_tokens}</td>
                <td className="text-right tiny">{u.output_tokens}</td>
                <td className="text-right tiny">
                  {u.cache_read_tokens}/{u.cache_creation_tokens}
                </td>
                <td className="text-right">${Number(u.cost_usd).toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Strategy */}
      <div className="card mt-4">
        <div className="card-title">Strategie</div>
        {strategy ? (
          <pre className="admin-pre">{JSON.stringify(strategy, null, 2)}</pre>
        ) : (
          <p className="muted">Nog geen strategie gegenereerd.</p>
        )}
      </div>

      {/* Interview answers */}
      <div className="card mt-4">
        <div className="card-title">Interview-antwoorden ({answers.length})</div>
        {[...byPhase.entries()]
          .sort(([a], [b]) => a - b)
          .map(([phase, rows]) => (
            <div key={phase} className="admin-phase-block">
              <div className="admin-phase-block__label">DEEL {phase}</div>
              {rows.map((a) => (
                <div key={a.id} className={`admin-answer${a.is_followup ? ' is-followup' : ''}`}>
                  <div className="admin-answer__q">
                    <span className="admin-answer__qid">{a.question_id}</span>
                    {a.is_followup && <span className="admin-answer__tag">followup</span>}
                    <span>{a.question_text}</span>
                  </div>
                  <div className="admin-answer__a">{a.answer_text}</div>
                </div>
              ))}
            </div>
          ))}
      </div>

      {/* Generated content */}
      <div className="card mt-4">
        <div className="card-title">Gegenereerde teksten ({pages.length} pagina's)</div>
        {pages.length === 0 ? (
          <p className="muted">Nog geen content gegenereerd.</p>
        ) : (
          pages.map((p) => (
            <div key={p.id} className="admin-page-block">
              <div className="admin-page-block__title">
                {p.title}{' '}
                <span className="muted tiny">/{p.slug || ''} · {p.page_type}</span>
              </div>
              {p.sections.map((s) => (
                <div key={s.id} className="admin-section-block">
                  <div className="admin-section-block__type">{s.section_type}</div>
                  {s.fields
                    .filter((f) => f.field_value)
                    .map((f, i) => (
                      <div key={i} className="admin-field">
                        <div className="admin-field__name">{f.field_name}</div>
                        <div className="admin-field__value">{f.field_value}</div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
