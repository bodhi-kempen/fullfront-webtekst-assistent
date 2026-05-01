import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Download,
  FileText,
  LayoutDashboard,
  Pencil,
  RefreshCcw,
} from 'lucide-react';
import { AppShell, PageHeader } from '../components/AppShell';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { apiDownload, apiFetch, apiText } from '../lib/api';

interface Field {
  id: string;
  field_name: string;
  field_value: string;
  field_type: 'text' | 'textarea' | 'url' | 'phone' | 'email';
  sort_order: number;
  version: number;
}
interface Section {
  id: string;
  section_type: string;
  sort_order: number;
  fields: Field[];
}
interface Page {
  id: string;
  page_type: string;
  title: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  sections: Section[];
}

const SECTION_LABEL: Record<string, string> = {
  hero: 'Hero',
  over_mij: 'Over (kort)',
  diensten: 'Diensten',
  ervaringen: 'Ervaringen',
  opt_in: 'Opt-in',
  footer: 'Footer',
  titel: 'Titel + intro',
  content: 'Content',
  cta: 'CTA',
  contact_form: 'Contactformulier',
  header: 'Header',
};

export function ReviewPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [pages, setPages] = useState<Page[] | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busySections, setBusySections] = useState<Set<string>>(new Set());
  const [instructionModalSection, setInstructionModalSection] = useState<string | null>(null);
  const [instructionText, setInstructionText] = useState('');

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await apiFetch<{ status: string | null; pages: Page[] }>(
        `/api/projects/${projectId}/pages`
      );
      setStatus(res.status);
      setPages(res.pages);
      setActivePageId((cur) => cur ?? res.pages[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kon pagina's niet laden");
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const reachedReview =
      (status === 'review' || status === 'completed') && pages !== null && pages.length > 0;
    const failedGeneration = status === 'strategy' && pages !== null && pages.length === 0;
    if (reachedReview || failedGeneration) return;
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [status, pages, load]);

  async function downloadWord() {
    setError(null);
    try {
      await apiDownload(`/api/projects/${projectId}/export/word`, { method: 'POST' });
      toast.show('Word-document gedownload');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Word-download mislukt');
    }
  }
  async function downloadPdf() {
    setError(null);
    try {
      await apiDownload(`/api/projects/${projectId}/export/pdf`, { method: 'POST' });
      toast.show('PDF gedownload');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF-download mislukt');
    }
  }
  async function copyPage(pageId: string) {
    setError(null);
    try {
      const text = await apiText(`/api/projects/${projectId}/export/copy/${pageId}`);
      await navigator.clipboard.writeText(text);
      toast.show('Pagina gekopieerd naar klembord');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kopiëren mislukt');
    }
  }

  async function saveField(fieldId: string, value: string, sectionId: string) {
    try {
      await apiFetch(`/api/sections/${sectionId}/content/${fieldId}`, {
        method: 'PUT',
        body: JSON.stringify({ value }),
      });
      await load();
      toast.show('Wijziging opgeslagen');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt');
    }
  }

  async function regenerateSection(sectionId: string, instruction?: string): Promise<void> {
    setBusySections((s) => new Set(s).add(sectionId));
    setError(null);
    try {
      if (instruction) {
        await apiFetch(`/api/sections/${sectionId}/regenerate-with-prompt`, {
          method: 'POST',
          body: JSON.stringify({ instruction }),
        });
      } else {
        await apiFetch(`/api/sections/${sectionId}/regenerate`, { method: 'POST' });
      }
      await load();
      toast.show('Sectie hergegenereerd');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hergenereren mislukt');
    } finally {
      setBusySections((s) => {
        const n = new Set(s);
        n.delete(sectionId);
        return n;
      });
    }
  }

  const activePage = pages?.find((p) => p.id === activePageId) ?? pages?.[0];

  const sidebar = (
    <>
      <div className="sidebar-group">
        <button type="button" className="nav-item" onClick={() => navigate('/')}>
          <LayoutDashboard /> Dashboard
        </button>
      </div>

      {pages && pages.length > 0 && (
        <>
          <div className="sidebar-group">
            <div className="sidebar-group-label">Pagina's</div>
            {pages.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`nav-item${activePage?.id === p.id ? ' active' : ''}`}
                onClick={() => setActivePageId(p.id)}
              >
                <FileText /> {p.title}
              </button>
            ))}
          </div>

          <div className="sidebar-group">
            <div className="sidebar-group-label">Exporteren</div>
            <button type="button" className="nav-item" onClick={() => void downloadWord()}>
              <Download /> Word (.docx)
            </button>
            <button type="button" className="nav-item" onClick={() => void downloadPdf()}>
              <Download /> PDF
            </button>
          </div>
        </>
      )}
    </>
  );

  if (!pages) {
    return (
      <AppShell sidebar={sidebar}>
        <p className="muted">{error ?? 'Bezig met laden…'}</p>
      </AppShell>
    );
  }

  if (status === 'generating') {
    return (
      <AppShell sidebar={sidebar}>
        <div className="gen-state">
          <div className="gen-spinner" />
          <div className="gen-title">Teksten genereren…</div>
          <div className="gen-subtitle">Dit duurt 1 tot 2 minuten.</div>
          {pages.length > 0 && (
            <ul className="gen-checklist">
              {pages.map((p) => (
                <li key={p.id}>
                  <span className="gen-check">
                    <CheckCircle2 />
                  </span>
                  {p.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      </AppShell>
    );
  }

  if (pages.length === 0) {
    async function retry() {
      if (!projectId) return;
      try {
        await apiFetch(`/api/projects/${projectId}/generate`, { method: 'POST' });
        setStatus('generating');
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kon niet opnieuw starten');
      }
    }
    return (
      <AppShell sidebar={sidebar}>
        <div className="card card-padded">
          <div className="card-title">Teksten genereren is gestopt</div>
          <p className="muted">
            Er ging iets mis tijdens het genereren. Geen pagina's opgeslagen. Probeer het opnieuw.
          </p>
          <div className="form-row mt-4">
            <button type="button" className="btn btn-primary" onClick={() => void retry()}>
              Opnieuw genereren
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(`/strategy/${projectId}`)}
            >
              Terug naar strategie
            </button>
          </div>
          {error && <div className="login-error mt-4">{error}</div>}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell sidebar={sidebar}>
      <PageHeader
        title={activePage?.title ?? 'Review'}
        subtitle={activePage?.slug ? `/${activePage.slug}` : '/'}
        right={
          activePage ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void copyPage(activePage.id)}
            >
              Kopieer pagina
            </button>
          ) : null
        }
      />

      {error && <div className="login-error">{error}</div>}

      {activePage &&
        activePage.sections.map((s) => (
          <SectionEditor
            key={s.id}
            section={s}
            busy={busySections.has(s.id)}
            onSaveField={(fid, v) => saveField(fid, v, s.id)}
            onRegenerate={() => regenerateSection(s.id)}
            onOpenInstruction={() => {
              setInstructionModalSection(s.id);
              setInstructionText('');
            }}
          />
        ))}

      <Modal
        open={!!instructionModalSection}
        title="Hergenereer met instructie"
        icon={<Pencil />}
        onClose={() => setInstructionModalSection(null)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setInstructionModalSection(null)}
            >
              Annuleren
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!instructionText.trim()}
              onClick={async () => {
                const sid = instructionModalSection;
                const text = instructionText.trim();
                setInstructionModalSection(null);
                if (sid && text) await regenerateSection(sid, text);
              }}
            >
              Hergenereer met instructie
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Instructie</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={instructionText}
            onChange={(e) => setInstructionText(e.target.value)}
            placeholder='bijv. "maak het korter", "formeler", "voeg meer urgentie toe"'
            autoFocus
          />
        </div>
      </Modal>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Section editor
// ---------------------------------------------------------------------------

function SectionEditor({
  section,
  busy,
  onSaveField,
  onRegenerate,
  onOpenInstruction,
}: {
  section: Section;
  busy: boolean;
  onSaveField: (fieldId: string, value: string) => void;
  onRegenerate: () => void;
  onOpenInstruction: () => void;
}) {
  const grouped = groupFieldsByOrder(section.fields);

  return (
    <section className="review-section" style={{ opacity: busy ? 0.6 : 1 }}>
      <div className="review-section__head">
        <h3 className="review-section__title">
          {SECTION_LABEL[section.section_type] ?? section.section_type}
        </h3>
        <div className="review-section__actions">
          <button
            type="button"
            className={`btn btn-secondary btn-sm${busy ? ' btn-loading' : ''}`}
            disabled={busy}
            onClick={onRegenerate}
          >
            <RefreshCcw /> Hergenereer
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={onOpenInstruction}
          >
            <Pencil /> Met instructie
          </button>
        </div>
      </div>

      {grouped.singles.map((f) => (
        <div key={f.id} className="form-group">
          <FieldEditor field={f} disabled={busy} onSave={onSaveField} />
        </div>
      ))}

      {grouped.repeats.length > 0 && (
        <div>
          {grouped.repeats.map((group, i) => (
            <div key={i} className="item-card">
              <div className="item-card__num">Item {i + 1}</div>
              {group.map((f) => (
                <div key={f.id} className="form-group">
                  <FieldEditor field={f} disabled={busy} onSave={onSaveField} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {grouped.singles.length === 0 && grouped.repeats.length === 0 && (
        <div className="muted">Geen velden in deze sectie.</div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Field grouping + editor
// ---------------------------------------------------------------------------

const FIELD_ORDER: Record<string, number> = {
  title: 10, intro: 20, subtitle: 30, body: 40, description: 50,
  trigger: 60, confirmation: 70, author_bio: 80,
  cta_text: 90, cta_url: 91, copyright_text: 95,
  contact_phone: 200, contact_email: 210, contact_address: 220,
  contact_postal_code: 230, contact_city: 240, contact_kvk: 250,
  contact_opening_hours: 260,
  social_facebook: 300, social_instagram: 310, social_linkedin: 320,
  social_twitter: 330, social_youtube: 340,
  section_footer_cta_text: 500, section_footer_cta_url: 501,
  service_title: 10, service_subtitle: 20, service_description: 30,
  service_cta: 40, service_cta_url: 41,
  item_title: 10, item_subtitle: 20, item_quote: 30,
  item_cta: 40, item_cta_url: 41,
  form_field: 100,
  faq_question: 10, faq_answer: 20,
  nav_label: 10, nav_url: 11,
  legal_label: 10, legal_url: 11,
};
function rankOf(name: string): number {
  return FIELD_ORDER[name] ?? 999;
}
function sortByRank(fields: Field[]): Field[] {
  return [...fields].sort((a, b) => rankOf(a.field_name) - rankOf(b.field_name));
}
function groupFieldsByOrder(fields: Field[]): { singles: Field[]; repeats: Field[][] } {
  const repeatedNames = new Set<string>();
  for (const f of fields) if (f.sort_order > 0) repeatedNames.add(f.field_name);

  const singles: Field[] = [];
  const repeatsByOrder = new Map<number, Field[]>();
  for (const f of fields) {
    if (repeatedNames.has(f.field_name)) {
      const arr = repeatsByOrder.get(f.sort_order) ?? [];
      arr.push(f);
      repeatsByOrder.set(f.sort_order, arr);
    } else {
      singles.push(f);
    }
  }
  return {
    singles: sortByRank(singles),
    repeats: Array.from(repeatsByOrder.entries())
      .sort(([a], [b]) => a - b)
      .map(([, v]) => sortByRank(v)),
  };
}

function humanizeFieldName(name: string): string {
  const map: Record<string, string> = {
    title: 'Titel', subtitle: 'Subtitel', body: 'Tekst', intro: 'Intro',
    cta_text: 'CTA-knoptekst', cta_url: 'CTA-link (URL)',
    description: 'Omschrijving', copyright_text: 'Copyright-regel',
    service_title: 'Naam', service_subtitle: 'Korte omschrijving',
    service_description: 'Volledige omschrijving',
    service_cta: 'CTA', service_cta_url: 'CTA-link (URL)',
    item_title: 'Titel', item_subtitle: 'Naam / context',
    item_quote: 'Quote', item_cta: 'CTA', item_cta_url: 'CTA-link (URL)',
    trigger: 'Formulier-uitnodiging', confirmation: 'Bevestigingsbericht',
    form_field: 'Formulierveld', author_bio: 'Auteur-bio',
    faq_question: 'Vraag', faq_answer: 'Antwoord',
    section_footer_cta_text: 'Sectie-CTA onderaan',
    section_footer_cta_url: 'Sectie-CTA link (URL)',
    nav_label: 'Menu-label', nav_url: 'Menu-link (URL)',
    legal_label: 'Juridische pagina', legal_url: 'Juridische link (URL)',
    contact_phone: 'Telefoon', contact_email: 'E-mail',
    contact_address: 'Adres', contact_postal_code: 'Postcode',
    contact_city: 'Plaats', contact_kvk: 'KvK-nummer',
    contact_opening_hours: 'Openingstijden',
    social_facebook: 'Facebook', social_instagram: 'Instagram',
    social_linkedin: 'LinkedIn', social_twitter: 'Twitter / X',
    social_youtube: 'YouTube',
  };
  return map[name] ?? name;
}

function FieldEditor({
  field,
  disabled,
  onSave,
}: {
  field: Field;
  disabled: boolean;
  onSave: (fieldId: string, value: string) => void;
}) {
  const [value, setValue] = useState(field.field_value);
  const [savedValue, setSavedValue] = useState(field.field_value);

  useEffect(() => {
    setValue(field.field_value);
    setSavedValue(field.field_value);
  }, [field.id, field.field_value]);

  const dirty = value !== savedValue;

  return (
    <>
      <label className="form-label">{humanizeFieldName(field.field_name)}</label>
      {field.field_type === 'textarea' ? (
        <textarea
          className="form-textarea"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (dirty) {
              onSave(field.id, value);
              setSavedValue(value);
            }
          }}
          disabled={disabled}
          rows={Math.min(8, Math.max(2, Math.ceil(value.length / 80)))}
        />
      ) : (
        <input
          className="form-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (dirty) {
              onSave(field.id, value);
              setSavedValue(value);
            }
          }}
          disabled={disabled}
        />
      )}
    </>
  );
}
