import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, LayoutDashboard, Plus } from 'lucide-react';
import { AppShell, PageHeader } from '../components/AppShell';
import { PlaceholderState } from '../components/PlaceholderState';
import { StatusBadge } from '../components/StatusBadge';
import { apiFetch } from '../lib/api';

interface Project {
  id: string;
  name: string;
  business_name: string | null;
  status: 'interview' | 'strategy' | 'generating' | 'review' | 'completed';
  updated_at: string;
}

function nextRouteForStatus(p: Project): string {
  switch (p.status) {
    case 'interview':
      return `/interview/${p.id}`;
    case 'strategy':
      return `/strategy/${p.id}`;
    case 'generating':
    case 'review':
    case 'completed':
      return `/review/${p.id}`;
  }
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ projects: Project[] }>('/api/projects');
      setProjects(res.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon projecten niet laden');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createProject() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await apiFetch<{ project: Project }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim() }),
      });
      navigate(`/interview/${res.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aanmaken mislukt');
      setCreating(false);
    }
  }

  return (
    <AppShell
      sidebar={
        <div className="sidebar-group">
          <button type="button" className="nav-item active">
            <LayoutDashboard /> Dashboard
          </button>
        </div>
      }
    >
      <PageHeader
        title="Mijn projecten"
        subtitle="Overzicht van alle website-projecten"
      />

      <div className="card">
        <div className="card-title">Nieuw project</div>
        <div className="form-row">
          <input
            className="form-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void createProject();
            }}
            placeholder="Naam van het project, bijv. 'Henk Loodgietersbedrijf'"
            disabled={creating}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className={`btn btn-primary${creating ? ' btn-loading' : ''}`}
            onClick={() => void createProject()}
            disabled={creating || !newName.trim()}
          >
            <Plus /> {creating ? 'Bezig…' : 'Nieuw project'}
          </button>
        </div>
      </div>

      {error && (
        <div className="login-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        {loading ? (
          <p className="muted">Bezig met laden…</p>
        ) : projects.length === 0 ? (
          <div className="card">
            <PlaceholderState
              icon={<Inbox />}
              title="Nog geen projecten"
              description="Maak hierboven je eerste project aan om te beginnen."
            />
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                className="project-card"
                onClick={() => navigate(nextRouteForStatus(p))}
              >
                <div className="project-card__name">{p.name}</div>
                <StatusBadge status={p.status} />
                <div className="project-card__meta">
                  Laatst bewerkt:{' '}
                  {new Date(p.updated_at).toLocaleString('nl-NL', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
