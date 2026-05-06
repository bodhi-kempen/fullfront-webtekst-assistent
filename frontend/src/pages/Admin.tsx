import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck } from 'lucide-react';
import { AppShell, PageHeader } from '../components/AppShell';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';

interface Stats {
  total_projects: number;
  interviews_completed: number;
  content_generated: number;
  total_cost_usd: number;
  total_claude_calls: number;
}

interface AdminProject {
  id: string;
  user_id: string;
  name: string;
  archetype: string | null;
  sub_archetype: string | null;
  status: string;
  created_at: string;
  owner_email: string | null;
  cost_usd: number;
}

function formatDateNL(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' });
}

export function AdminPage() {
  const { isAdmin, loading: authLoading, adminLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [projects, setProjects] = useState<AdminProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const [s, p] = await Promise.all([
          apiFetch<Stats>('/api/admin/stats'),
          apiFetch<{ projects: AdminProject[] }>('/api/admin/projects'),
        ]);
        if (cancelled) return;
        setStats(s);
        setProjects(p.projects);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Kon admin-data niet laden');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // Wait for both the session AND the /api/admin/me probe before deciding.
  // Otherwise isAdmin's default-false value redirects the page away before
  // the probe has a chance to confirm admin status.
  console.info(
    `[admin-page] render: authLoading=${authLoading} adminLoading=${adminLoading} isAdmin=${isAdmin}`
  );
  if (authLoading || adminLoading) {
    return (
      <AppShell sidebar={<></>}>
        <p className="muted">Bezig met laden…</p>
      </AppShell>
    );
  }
  if (!isAdmin) {
    console.warn('[admin-page] redirecting to / because isAdmin=false');
    return <Navigate to="/" replace />;
  }

  const sidebar = (
    <div className="sidebar-group">
      <button type="button" className="nav-item" onClick={() => navigate('/')}>
        <LayoutDashboard /> Dashboard
      </button>
      <button type="button" className="nav-item active">
        <ShieldCheck /> Admin
      </button>
    </div>
  );

  return (
    <AppShell sidebar={sidebar}>
      <PageHeader
        title="Admin"
        subtitle="Overzicht van alle projecten en kwaliteitscontrole"
      />

      {error && <div className="login-error">{error}</div>}

      {stats && (
        <div className="admin-stats">
          <div className="admin-stat">
            <div className="admin-stat__value">{stats.total_projects}</div>
            <div className="admin-stat__label">Projecten totaal</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat__value">{stats.interviews_completed}</div>
            <div className="admin-stat__label">Interviews afgerond</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat__value">{stats.content_generated}</div>
            <div className="admin-stat__label">Teksten gegenereerd</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat__value">${stats.total_cost_usd.toFixed(2)}</div>
            <div className="admin-stat__label">
              Totale Claude-kosten ({stats.total_claude_calls} calls)
            </div>
          </div>
        </div>
      )}

      <div className="card mt-6">
        <div className="card-title">Projecten</div>
        {!projects ? (
          <p className="muted">Bezig met laden…</p>
        ) : projects.length === 0 ? (
          <p className="muted">Nog geen projecten.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Naam</th>
                <th>Eigenaar</th>
                <th>Archetype</th>
                <th>Status</th>
                <th>Aangemaakt</th>
                <th className="text-right">Kosten</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/admin/projects/${p.id}`} className="link">
                      {p.name}
                    </Link>
                  </td>
                  <td className="muted">{p.owner_email ?? '—'}</td>
                  <td className="muted">
                    {p.archetype ?? '—'}
                    {p.sub_archetype ? ` + ${p.sub_archetype}` : ''}
                  </td>
                  <td>
                    <span className={`status-pill status-pill--${p.status}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="muted tiny">{formatDateNL(p.created_at)}</td>
                  <td className="text-right">${p.cost_usd.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
