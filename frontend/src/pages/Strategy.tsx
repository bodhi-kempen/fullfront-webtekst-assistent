import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Compass, LayoutDashboard, RefreshCcw } from 'lucide-react';
import { AppShell, PageHeader } from '../components/AppShell';
import { apiFetch } from '../lib/api';

interface SuggestedPage {
  page_type:
    | 'home' | 'over' | 'diensten' | 'ervaringen'
    | 'contact' | 'blog' | 'faq' | 'custom';
  title: string;
  slug: string;
  sort_order: number;
  include: boolean;
  rationale: string;
}

interface ArchetypeConfig {
  include_opt_in: boolean;
  over_method: 'origin_story' | 'faq' | 'team';
  show_pricing: boolean;
  emergency_available: boolean;
  has_booking_system: boolean;
  service_count: number;
}

interface Strategy {
  id: string;
  project_id: string;
  website_type: 'lead_generation' | 'authority' | 'sales' | 'booking';
  tone_of_voice: string;
  addressing: 'je' | 'u' | 'mix';
  primary_cta: string;
  suggested_pages: SuggestedPage[];
  archetype_config: ArchetypeConfig;
  approved: boolean;
}

const TYPE_LABEL: Record<Strategy['website_type'], string> = {
  lead_generation: 'Leads / aanvragen',
  authority: 'Autoriteit / expertise',
  sales: 'Direct verkopen',
  booking: 'Boekingen / afspraken',
};
const OVER_METHOD_LABEL: Record<ArchetypeConfig['over_method'], string> = {
  origin_story: 'Origin story',
  faq: 'FAQ-stijl',
  team: 'Team-overzicht',
};

export function StrategyPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        try {
          const res = await apiFetch<{ strategy: Strategy }>(
            `/api/projects/${projectId}/strategy`
          );
          if (!cancelled) setStrategy(res.strategy);
        } catch {
          if (cancelled) return;
          setBusy('Strategie wordt gegenereerd…');
          const res = await apiFetch<{ strategy: Strategy }>(
            `/api/projects/${projectId}/strategy/generate`,
            { method: 'POST' }
          );
          if (!cancelled) setStrategy(res.strategy);
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Kon strategie niet laden');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setBusy(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  async function save(partial: Partial<Strategy>) {
    if (!strategy) return;
    setError(null);
    try {
      const res = await apiFetch<{ strategy: Strategy }>(
        `/api/projects/${projectId}/strategy`,
        { method: 'PUT', body: JSON.stringify(partial) }
      );
      setStrategy(res.strategy);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt');
    }
  }

  async function regenerate() {
    if (!projectId) return;
    setBusy('Strategie wordt opnieuw gegenereerd…');
    setError(null);
    try {
      const res = await apiFetch<{ strategy: Strategy }>(
        `/api/projects/${projectId}/strategy/generate`,
        { method: 'POST' }
      );
      setStrategy(res.strategy);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hergenereren mislukt');
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    if (!projectId) return;
    setBusy('Goedgekeurd — teksten worden gegenereerd…');
    setError(null);
    try {
      await apiFetch(`/api/projects/${projectId}/strategy/approve`, { method: 'POST' });
      navigate(`/review/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Goedkeuren mislukt');
      setBusy(null);
    }
  }

  function togglePage(idx: number) {
    if (!strategy) return;
    const next = [...strategy.suggested_pages];
    const cur = next[idx];
    if (!cur) return;
    next[idx] = { ...cur, include: !cur.include };
    void save({ suggested_pages: next });
  }
  function updatePageTitle(idx: number, title: string) {
    if (!strategy) return;
    const next = [...strategy.suggested_pages];
    const cur = next[idx];
    if (!cur) return;
    next[idx] = { ...cur, title };
    setStrategy({ ...strategy, suggested_pages: next });
  }
  function commitPageTitles() {
    if (!strategy) return;
    void save({ suggested_pages: strategy.suggested_pages });
  }

  const sidebar = (
    <div className="sidebar-group">
      <button type="button" className="nav-item" onClick={() => navigate('/')}>
        <LayoutDashboard /> Dashboard
      </button>
      <button type="button" className="nav-item active">
        <Compass /> Strategie
      </button>
    </div>
  );

  if (loading) {
    return (
      <AppShell sidebar={sidebar}>
        <div className="gen-state">
          <div className="gen-spinner" />
          <div className="gen-title">{busy ?? 'Bezig met laden…'}</div>
        </div>
      </AppShell>
    );
  }

  if (!strategy) {
    return (
      <AppShell sidebar={sidebar}>
        <div className="login-error">{error ?? 'Geen strategie gevonden.'}</div>
      </AppShell>
    );
  }

  return (
    <AppShell sidebar={sidebar}>
      <PageHeader
        title="Strategie voor je website"
        subtitle="Op basis van je interview heb ik onderstaande strategie opgesteld. Pas aan wat je wilt en klik op Goedkeuren."
      />

      {error && <div className="login-error">{error}</div>}

      <div className="card card-padded">
        <div className="card-title">Type &amp; toon</div>

        <div className="form-group">
          <label className="form-label">Type website</label>
          <select
            className="form-select"
            value={strategy.website_type}
            onChange={(e) =>
              void save({ website_type: e.target.value as Strategy['website_type'] })
            }
          >
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Tone of voice</label>
          <textarea
            className="form-textarea"
            rows={2}
            value={strategy.tone_of_voice}
            onChange={(e) => setStrategy({ ...strategy, tone_of_voice: e.target.value })}
            onBlur={() => void save({ tone_of_voice: strategy.tone_of_voice })}
          />
        </div>

        <div className="form-row" style={{ alignItems: 'flex-start', gap: 16 }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Aanspreekvorm</label>
            <select
              className="form-select"
              value={strategy.addressing}
              onChange={(e) =>
                void save({ addressing: e.target.value as Strategy['addressing'] })
              }
            >
              <option value="je">Je (informeel)</option>
              <option value="u">U (formeel)</option>
              <option value="mix">Mix</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
            <label className="form-label">Belangrijkste actie (CTA)</label>
            <input
              className="form-input"
              type="text"
              value={strategy.primary_cta}
              onChange={(e) => setStrategy({ ...strategy, primary_cta: e.target.value })}
              onBlur={() => void save({ primary_cta: strategy.primary_cta })}
            />
          </div>
        </div>
      </div>

      <div className="card card-padded">
        <div className="card-title">Pagina's</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {strategy.suggested_pages.map((p, idx) => (
            <li
              key={`${p.page_type}-${p.slug}-${idx}`}
              className="form-row"
              style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}
            >
              <input
                type="checkbox"
                className="form-checkbox"
                checked={p.include}
                onChange={() => togglePage(idx)}
                aria-label={`Pagina ${p.title}`}
              />
              <input
                type="text"
                className="form-input"
                value={p.title}
                onChange={(e) => updatePageTitle(idx, e.target.value)}
                onBlur={() => commitPageTitles()}
                style={{ flex: 1 }}
              />
              <span className="badge badge-status-gray" style={{ minWidth: 96, justifyContent: 'center' }}>
                {p.page_type}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card card-padded">
        <div className="card-title">Verdere keuzes</div>
        <Detail label="Methode Over-pagina" value={OVER_METHOD_LABEL[strategy.archetype_config.over_method]} />
        <Detail label="Opt-in (lead magnet)" value={strategy.archetype_config.include_opt_in ? 'Ja' : 'Nee'} />
        <Detail label="Prijzen tonen" value={strategy.archetype_config.show_pricing ? 'Ja' : 'Nee'} />
        <Detail label="Spoeddienst" value={strategy.archetype_config.emergency_available ? 'Ja' : 'Nee'} />
        <Detail label="Online boeken" value={strategy.archetype_config.has_booking_system ? 'Ja' : 'Nee'} />
        <Detail label="Aantal kerndiensten op homepage" value={String(strategy.archetype_config.service_count)} />
      </div>

      <div className="form-row" style={{ marginTop: 20 }}>
        <button
          type="button"
          className={`btn btn-secondary${busy ? ' btn-loading' : ''}`}
          onClick={() => void regenerate()}
          disabled={!!busy}
        >
          <RefreshCcw /> Strategie opnieuw genereren
        </button>
        <div className="flex-spacer" />
        <button
          type="button"
          className={`btn btn-primary btn-lg${busy ? ' btn-loading' : ''}`}
          onClick={() => void approve()}
          disabled={!!busy}
        >
          {busy ?? 'Goedkeuren & teksten genereren'}
        </button>
      </div>
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="field-row">
      <span className="field-row__label">{label}</span>
      <span className="field-row__value">{value}</span>
    </div>
  );
}
