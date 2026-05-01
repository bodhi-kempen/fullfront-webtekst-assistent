/**
 * Shared content-rendering logic for all export formats.
 * Takes the persisted PageWithSections shape and turns it into a clean
 * intermediate structure that the docx, pdf, and plain-text formatters
 * can walk linearly without knowing about field names.
 */

import { supabaseAdmin } from '../lib/supabase.js';
import { getPagesWithContent, type PageWithSections } from './content.js';

// ---------------------------------------------------------------------------
// Intermediate model
// ---------------------------------------------------------------------------

export interface ExportDoc {
  business_name: string;
  pages: ExportPage[];
}

export interface ExportPage {
  id: string;
  title: string;
  page_type: string;
  slug: string;
  sections: ExportSection[];
}

export interface ExportSection {
  label: string;
  pre: ExportBlock[];
  items: ExportItem[];
  post: ExportBlock[];
}

export type ExportBlock =
  | { kind: 'field'; label: string; value: string; isLong: boolean }
  | { kind: 'cta'; label: string; text: string; url: string }
  | { kind: 'link'; label: string; url: string };

export interface ExportItem {
  /** Display heading for this item, e.g., "Dienst 1". */
  heading: string;
  blocks: ExportBlock[];
}

type Field = PageWithSections['sections'][number]['fields'][number];

// ---------------------------------------------------------------------------
// Field-name metadata (matches frontend FIELD_ORDER + humanizeFieldName)
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

function rank(name: string): number {
  return FIELD_ORDER[name] ?? 999;
}

const FIELD_LABEL: Record<string, string> = {
  title: 'Titel',
  subtitle: 'Subtitel',
  body: 'Tekst',
  intro: 'Intro',
  cta_text: 'CTA',
  description: 'Omschrijving',
  copyright_text: 'Copyright',
  service_title: 'Naam',
  service_subtitle: 'Korte omschrijving',
  service_description: 'Volledige omschrijving',
  service_cta: 'CTA',
  item_title: 'Titel',
  item_subtitle: 'Naam / context',
  item_quote: 'Quote',
  item_cta: 'CTA',
  trigger: 'Formulier-uitnodiging',
  confirmation: 'Bevestigingsbericht',
  form_field: 'Formulierveld',
  author_bio: 'Auteur-bio',
  faq_question: 'Vraag',
  faq_answer: 'Antwoord',
  section_footer_cta_text: 'Sectie-CTA onderaan',
  contact_phone: 'Telefoon',
  contact_email: 'E-mail',
  contact_address: 'Adres',
  contact_postal_code: 'Postcode',
  contact_city: 'Plaats',
  contact_kvk: 'KvK-nummer',
  contact_opening_hours: 'Openingstijden',
  social_facebook: 'Facebook',
  social_instagram: 'Instagram',
  social_linkedin: 'LinkedIn',
  social_twitter: 'Twitter / X',
  social_youtube: 'YouTube',
};

function labelFor(name: string): string {
  return FIELD_LABEL[name] ?? name;
}

const SECTION_LABEL: Record<string, string> = {
  hero: 'Hero',
  over_mij: 'Over (kort)',
  diensten: 'Diensten',
  ervaringen: 'Ervaringen',
  opt_in: 'Opt-in',
  cta: 'Call to action',
  footer: 'Footer',
  titel: 'Titel + intro',
  content: 'Content',
  contact_form: 'Contactformulier',
  header: 'Header',
};

// CTA-pair map: when we see the first key, look for its partner at the same
// sort_order and merge into a single cta/link block.
const CTA_PAIRS: Record<string, string> = {
  cta_text: 'cta_url',
  service_cta: 'service_cta_url',
  item_cta: 'item_cta_url',
  section_footer_cta_text: 'section_footer_cta_url',
  nav_label: 'nav_url',
  legal_label: 'legal_url',
};

// ---------------------------------------------------------------------------
// Section renderer
// ---------------------------------------------------------------------------

function renderSection(
  section: PageWithSections['sections'][number]
): ExportSection {
  const fields = section.fields.filter(
    (f) => f.field_value !== '' && f.field_value !== null
  );

  // Identify "repeated" field names (those that appear at sort_order > 0).
  const repeatedNames = new Set<string>();
  for (const f of fields) if (f.sort_order > 0) repeatedNames.add(f.field_name);

  const singleFields = fields.filter((f) => !repeatedNames.has(f.field_name));
  const repeatedFields = fields.filter((f) => repeatedNames.has(f.field_name));

  // Render singles, splitting pre/post on rank.
  const pre: ExportBlock[] = [];
  const post: ExportBlock[] = [];
  const blocks = pairAndRender(singleFields);
  for (const { rankValue, block } of blocks) {
    (rankValue >= 500 ? post : pre).push(block);
  }

  // Render repeated fields, grouped by sort_order.
  const byOrder = new Map<number, Field[]>();
  for (const f of repeatedFields) {
    const arr = byOrder.get(f.sort_order) ?? [];
    arr.push(f);
    byOrder.set(f.sort_order, arr);
  }
  const items: ExportItem[] = [];
  const orderedKeys = [...byOrder.keys()].sort((a, b) => a - b);
  for (const key of orderedKeys) {
    const group = byOrder.get(key)!;
    const blocks = pairAndRender(group).map((b) => b.block);
    items.push({ heading: itemHeading(group, key), blocks });
  }

  return {
    label: SECTION_LABEL[section.section_type] ?? section.section_type,
    pre,
    items,
    post,
  };
}

function pairAndRender(
  fields: Field[]
): Array<{ rankValue: number; block: ExportBlock }> {
  const sorted = [...fields].sort(
    (a, b) => rank(a.field_name) - rank(b.field_name)
  );
  const used = new Set<string>(); // composite key field_name|sort_order
  const out: Array<{ rankValue: number; block: ExportBlock }> = [];

  for (const f of sorted) {
    const compositeKey = `${f.field_name}|${f.sort_order}`;
    if (used.has(compositeKey)) continue;

    const partnerName = CTA_PAIRS[f.field_name];
    if (partnerName) {
      const partner = fields.find(
        (x) =>
          x.field_name === partnerName && x.sort_order === f.sort_order
      );
      if (partner) {
        used.add(compositeKey);
        used.add(`${partner.field_name}|${partner.sort_order}`);
        // For nav/legal, we use a "link" block — the label IS the visible text.
        if (f.field_name === 'nav_label' || f.field_name === 'legal_label') {
          out.push({
            rankValue: rank(f.field_name),
            block: { kind: 'link', label: f.field_value, url: partner.field_value },
          });
        } else {
          out.push({
            rankValue: rank(f.field_name),
            block: {
              kind: 'cta',
              label: labelFor(f.field_name),
              text: f.field_value,
              url: partner.field_value,
            },
          });
        }
        continue;
      }
    }

    // Skip orphan URL halves.
    if (
      Object.values(CTA_PAIRS).includes(f.field_name) &&
      !sorted.find(
        (x) =>
          CTA_PAIRS[x.field_name] === f.field_name &&
          x.sort_order === f.sort_order
      )
    ) {
      // Orphan URL with no partner — render as a plain link field.
      used.add(compositeKey);
      out.push({
        rankValue: rank(f.field_name),
        block: {
          kind: 'field',
          label: labelFor(f.field_name),
          value: f.field_value,
          isLong: false,
        },
      });
      continue;
    }

    used.add(compositeKey);
    out.push({
      rankValue: rank(f.field_name),
      block: {
        kind: 'field',
        label: labelFor(f.field_name),
        value: f.field_value,
        isLong: f.field_type === 'textarea',
      },
    });
  }

  return out;
}

function itemHeading(group: Field[], orderIndex: number): string {
  const names = new Set(group.map((g) => g.field_name));
  if (names.has('service_title') || names.has('service_description')) {
    return `Dienst ${orderIndex + 1}`;
  }
  if (names.has('item_quote') || names.has('item_title')) {
    return `Klantverhaal ${orderIndex + 1}`;
  }
  if (names.has('faq_question')) {
    return `Vraag ${orderIndex + 1}`;
  }
  if (names.has('nav_label')) {
    return ''; // rendered as compact link
  }
  if (names.has('legal_label')) {
    return '';
  }
  if (names.has('form_field')) {
    return `Formulierveld ${orderIndex + 1}`;
  }
  return `Item ${orderIndex + 1}`;
}

// ---------------------------------------------------------------------------
// Public: build ExportDoc from a project
// ---------------------------------------------------------------------------

export async function loadExportDoc(projectId: string): Promise<ExportDoc> {
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('name, business_name')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw error;
  const businessName =
    (project?.business_name as string | null) ??
    (project?.name as string | null) ??
    'Website';

  const pagesRaw = await getPagesWithContent(projectId);
  const pages: ExportPage[] = pagesRaw.map((p) => ({
    id: p.id,
    title: p.title,
    page_type: p.page_type,
    slug: p.slug,
    sections: p.sections.map(renderSection),
  }));

  return { business_name: businessName, pages };
}

export async function loadExportPage(
  projectId: string,
  pageId: string
): Promise<{ businessName: string; page: ExportPage } | null> {
  const doc = await loadExportDoc(projectId);
  const page = doc.pages.find((p) => p.id === pageId);
  if (!page) return null;
  return { businessName: doc.business_name, page };
}
