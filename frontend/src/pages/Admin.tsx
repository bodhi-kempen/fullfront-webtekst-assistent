import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck } from 'lucide-react';
import { AppShell, PageHeader } from '../components/AppShell';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { Modal } from '../components/Modal';

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

interface AdminUser {
  user_id: string;
  email: string | null;
  window_spent_usd: number;
  last_reset_at: string | null;
}

interface UsersResponse {
  users: AdminUser[];
  cap_usd: number;
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
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [capUsd, setCapUsd] = useState<number>(5);
  const [error, setError] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetReason, setResetReason] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const loadAll = async (cancelled: { v: boolean }) => {
    try {
      const [s, p, u] = await Promise.all([
        apiFetch<Stats>('/api/admin/stats'),
        apiFetch<{ projects: AdminProject[] }>('/api/admin/projects'),
        apiFetch<UsersResponse>('/api/admin/users'),
      ]);
      if (cancelled.v) return;
      setStats(s);
      setProjects(p.projects);
      setUsers(u.users);
      setCapUsd(u.cap_usd);
    } catch (err) {
      if (cancelled.v) return;
      setError(err instanceof Error ? err.message : 'Kon admin-data niet laden');
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    const cancelled = { v: false };
    void loadAll(cancelled);
    return () => { cancelled.v = true; };
  }, [isAdmin]);

  async function confirmReset() {
    if (!resetTarget) return;
    setResetBusy(true);
    setResetError(null);
    try {
      await apiFetch(`/api/admin/users/${resetTarget.user_id}/budget-reset`, {
        method: 'POST',
        body: JSON.stringify({ reason: resetReason }),
      });
      setResetTarget(null);
      setResetReason('');
      // Reload users to reflect the new window spend.
      const u = await apiFetch<UsersResponse>('/api/admin/users');
      setUsers(u.users);
      setCapUsd(u.cap_usd);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Reset mislukt');
    } finally {
      setResetBusy(false);
    }
  }

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

      <div className="card mt-6">
        <div className="card-title">Gebruikers — budgetvenster (30 dagen)</div>
        {!users ? (
          <p className="muted">Bezig met laden…</p>
        ) : users.length === 0 ? (
          <p className="muted">Nog geen gebruikers met projecten.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>E-mail</th>
                <th className="text-right">Verbruik (30 dagen)</th>
                <th>Laatste reset</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const pct = Math.min(100, (u.window_spent_usd / capUsd) * 100);
                const overBudget = u.window_spent_usd >= capUsd;
                return (
                  <tr key={u.user_id}>
                    <td className="muted">{u.email ?? u.user_id}</td>
                    <td className="text-right">
                      <span className={overBudget ? 'text-error' : undefined}>
                        ${u.window_spent_usd.toFixed(2)} / ${capUsd.toFixed(2)}
                      </span>
                      <div
                        style={{
                          marginTop: 4,
                          height: 4,
                          borderRadius: 2,
                          background: '#e5e7eb',
                          width: 120,
                          marginLeft: 'auto',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            borderRadius: 2,
                            width: `${pct}%`,
                            background: overBudget ? '#ef4444' : '#6366f1',
                          }}
                        />
                      </div>
                    </td>
                    <td className="muted tiny">
                      {u.last_reset_at ? formatDateNL(u.last_reset_at) : '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          setResetTarget(u);
                          setResetReason('');
                          setResetError(null);
                        }}
                      >
                        Budget resetten
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={resetTarget !== null}
        title="Budget resetten"
        onClose={() => setResetTarget(null)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setResetTarget(null)}
              disabled={resetBusy}
            >
              Annuleren
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={confirmReset}
              disabled={resetBusy}
            >
              {resetBusy ? 'Bezig…' : 'Resetten'}
            </button>
          </>
        }
      >
        <div className="modal-body">
          <p>
            Het verbruik van{' '}
            <strong>{resetTarget?.email ?? resetTarget?.user_id}</strong> wordt
            teruggezet. Nieuwe AI-generaties tellen vanaf nu weer mee in het
            30-dagenvenster.
          </p>
          <label className="form-label mt-4" htmlFor="reset-reason">
            Reden (optioneel)
          </label>
          <input
            id="reset-reason"
            type="text"
            className="form-input"
            value={resetReason}
            onChange={(e) => setResetReason(e.target.value)}
            placeholder="bijv. klant heeft betaald voor extra generatie"
          />
          {resetError && <div className="login-error mt-3">{resetError}</div>}
        </div>
      </Modal>
    </AppShell>
  );
}
