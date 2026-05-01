import { supabaseAdmin } from '../lib/supabase.js';
import type { Archetype } from '../data/questions.js';
import {
  generateBlogPage,
  generateContactPage,
  generateFaqPage,
  generateFooter,
  generateHero,
  generateOptIn,
  generateOverFull,
  generateOverShort,
  generateServices,
  generateTestimonials,
  type GenContext,
  type ParsedBusinessInfo,
} from './content-ai.js';
import { parseBusinessInfo } from './business-info-ai.js';
import type { ArchetypeConfig, SuggestedPage } from './strategy-ai.js';

// ---------------------------------------------------------------------------
// Persisted shape
// ---------------------------------------------------------------------------

type FieldType = 'text' | 'textarea' | 'url' | 'phone' | 'email';

interface FieldRow {
  field_name: string;
  field_value: string;
  field_type: FieldType;
  sort_order: number;
}

interface SectionPlan {
  section_type: string;
  fields: FieldRow[];
}

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

interface ProjectRow {
  id: string;
  archetype: Archetype | null;
  sub_archetype: Archetype | null;
  business_name: string | null;
  status: string;
}
interface AnswerRow {
  question_id: string;
  answer_text: string;
  is_followup: boolean;
  parent_question_id: string | null;
}
interface StrategyRow {
  website_type: 'lead_generation' | 'authority' | 'sales' | 'booking';
  tone_of_voice: string;
  addressing: 'je' | 'u' | 'mix';
  primary_cta: string;
  suggested_pages: SuggestedPage[];
  archetype_config: ArchetypeConfig;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function f(name: string, value: string, type: FieldType, sort = 0): FieldRow {
  return { field_name: name, field_value: value, field_type: type, sort_order: sort };
}

/** Trim and fall back to a default when the AI returned empty or whitespace. */
function nonEmpty(value: string | null | undefined, fallback: string): string {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/** Build a url path from page list — '/' for home, '/<slug>' otherwise. */
function buildUrlFor(includedPages: SuggestedPage[]) {
  const slugByType = new Map<string, string>();
  for (const p of includedPages) slugByType.set(p.page_type, p.slug);
  return (pageType: string): string => {
    if (pageType === 'home') return '/';
    const slug = slugByType.get(pageType);
    return slug !== undefined && slug !== '' ? `/${slug}` : '#';
  };
}

// ---------------------------------------------------------------------------
// Context loaders
// ---------------------------------------------------------------------------

async function loadProject(projectId: string): Promise<ProjectRow> {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('id, archetype, sub_archetype, business_name, status')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Project not found');
  if (!(data as ProjectRow).archetype) throw new Error('Project has no archetype');
  return data as ProjectRow;
}

async function loadStrategy(projectId: string): Promise<StrategyRow> {
  const { data, error } = await supabaseAdmin
    .from('website_strategy')
    .select('website_type, tone_of_voice, addressing, primary_cta, suggested_pages, archetype_config')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Strategy not yet generated');
  return data as StrategyRow;
}

async function loadAnswers(projectId: string): Promise<Map<string, string>> {
  const { data: answers, error } = await supabaseAdmin
    .from('interview_answers')
    .select('question_id, answer_text, is_followup, parent_question_id')
    .eq('project_id', projectId)
    .order('sequence_order', { ascending: true });
  if (error) throw error;

  const grouped = new Map<string, string[]>();
  for (const a of (answers ?? []) as AnswerRow[]) {
    const key = a.is_followup ? a.parent_question_id ?? a.question_id : a.question_id;
    const arr = grouped.get(key) ?? [];
    arr.push(a.answer_text);
    grouped.set(key, arr);
  }
  const result = new Map<string, string>();
  for (const [k, v] of grouped) result.set(k, v.join('\n\n'));
  return result;
}

async function loadOrCreateBusinessInfo(
  projectId: string,
  businessName: string | null,
  archetype: Archetype,
  answers: Map<string, string>
): Promise<ParsedBusinessInfo> {
  const parsed = await parseBusinessInfo({
    archetype,
    business_name: businessName,
    answers,
  });

  const row = {
    project_id: projectId,
    business_name: parsed.business_name ?? businessName,
    owner_name: parsed.owner_name,
    phone: parsed.phone,
    email: parsed.email,
    address: parsed.address,
    postal_code: parsed.postal_code,
    city: parsed.city,
    kvk_number: parsed.kvk_number,
    service_area: parsed.service_area.length > 0 ? parsed.service_area : null,
    social_facebook: parsed.social_facebook,
    social_instagram: parsed.social_instagram,
    social_linkedin: parsed.social_linkedin,
    social_twitter: parsed.social_twitter,
    social_youtube: parsed.social_youtube,
    certifications: parsed.certifications.length > 0 ? parsed.certifications : null,
    opening_hours: parsed.opening_hours
      ? { text: parsed.opening_hours }
      : null,
  };

  const { error } = await supabaseAdmin
    .from('business_info')
    .upsert(row, { onConflict: 'project_id' });
  if (error) {
    console.warn('[content] business_info upsert failed:', error);
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Per-page builders. Each receives the suggested_page so it can fall back to
// the menu title if the AI returned an empty title.
// ---------------------------------------------------------------------------

async function buildHomeSections(
  ctx: GenContext,
  page: SuggestedPage
): Promise<SectionPlan[]> {
  const cfg = ctx.archetype_config;
  const [hero, overShort, services, testimonials, footer, optIn] =
    await Promise.all([
      generateHero(ctx),
      generateOverShort(ctx),
      generateServices(ctx, { count: cfg.service_count }),
      generateTestimonials(ctx, { count: 3 }),
      generateFooter(ctx),
      cfg.include_opt_in ? generateOptIn(ctx) : Promise.resolve(null),
    ]);

  const sections: SectionPlan[] = [];
  const urlContact = ctx.urlFor('contact');
  const urlOver = ctx.urlFor('over');
  const urlDiensten = ctx.urlFor('diensten');
  const urlErvaringen = ctx.urlFor('ervaringen');

  // --- Hero ---
  sections.push({
    section_type: 'hero',
    fields: [
      f('title', nonEmpty(hero.title, page.title), 'text'),
      f('subtitle', hero.subtitle, 'textarea'),
      f('cta_text', nonEmpty(hero.cta_text, ctx.primary_cta), 'text'),
      f('cta_url', urlContact, 'url'),
    ],
  });

  // --- Over (homepage section) ---
  sections.push({
    section_type: 'over_mij',
    fields: [
      f('title', nonEmpty(overShort.title, `Over ${ctx.business_name ?? 'mij'}`), 'text'),
      f('body', overShort.body, 'textarea'),
      f('cta_text', nonEmpty(overShort.cta_text, 'Lees mijn verhaal'), 'text'),
      f('cta_url', urlOver, 'url'),
    ],
  });

  // --- Diensten (homepage section) ---
  sections.push({
    section_type: 'diensten',
    fields: [
      f('title', nonEmpty(services.title, 'Onze diensten'), 'text'),
      f('intro', services.intro, 'textarea'),
      ...services.services.flatMap((s, i): FieldRow[] => [
        { field_name: 'service_title',       field_value: nonEmpty(s.title, `Dienst ${i + 1}`), field_type: 'text',     sort_order: i },
        { field_name: 'service_subtitle',    field_value: s.subtitle ?? '',                     field_type: 'text',     sort_order: i },
        { field_name: 'service_description', field_value: s.description,                        field_type: 'textarea', sort_order: i },
        { field_name: 'service_cta',         field_value: nonEmpty(s.cta_text, 'Meer informatie'), field_type: 'text',  sort_order: i },
        { field_name: 'service_cta_url',     field_value: urlDiensten,                          field_type: 'url',      sort_order: i },
      ]),
      f('section_footer_cta_text', nonEmpty(services.section_footer_cta_text, 'Bekijk volledig aanbod'), 'text'),
      f('section_footer_cta_url',  urlDiensten, 'url'),
    ],
  });

  // --- Ervaringen (homepage section, no per-item cta) ---
  sections.push({
    section_type: 'ervaringen',
    fields: [
      f('title', nonEmpty(testimonials.title, 'Ervaringen'), 'text'),
      f('intro', testimonials.intro, 'textarea'),
      ...testimonials.items.flatMap((t, i): FieldRow[] => [
        { field_name: 'item_title',    field_value: nonEmpty(t.title, `Klantverhaal ${i + 1}`), field_type: 'text',     sort_order: i },
        { field_name: 'item_subtitle', field_value: nonEmpty(t.subtitle, 'Klant'),              field_type: 'text',     sort_order: i },
        { field_name: 'item_quote',    field_value: t.quote,                                    field_type: 'textarea', sort_order: i },
      ]),
      f('section_footer_cta_text', nonEmpty(testimonials.section_footer_cta_text, 'Bekijk alle ervaringen'), 'text'),
      f('section_footer_cta_url',  urlErvaringen, 'url'),
    ],
  });

  // --- Opt-in (conditional) ---
  if (optIn) {
    sections.push({
      section_type: 'opt_in',
      fields: [
        f('title', nonEmpty(optIn.title, 'Gratis weggever'), 'text'),
        f('subtitle', optIn.subtitle, 'textarea'),
        f('cta_text', nonEmpty(optIn.cta_text, 'Download nu'), 'text'),
        f('cta_url', '#', 'url'),
      ],
    });
  }

  // --- Footer (structured) ---
  sections.push({
    section_type: 'footer',
    fields: buildFooterFields(ctx, footer.description, page.title),
  });

  return sections;
}

function buildFooterFields(
  ctx: GenContext,
  description: string,
  homePageTitle: string
): FieldRow[] {
  const business = ctx.business_info;
  const businessName = ctx.business_name ?? business?.business_name ?? 'het bedrijf';
  const year = new Date().getFullYear();

  const fields: FieldRow[] = [
    f('description', description, 'textarea'),
    f(
      'copyright_text',
      `© ${year} ${businessName}. Alle rechten voorbehouden.`,
      'text'
    ),
  ];

  // Navigation links — always include home + every active page
  const navLinks: Array<{ label: string; url: string }> = [
    { label: 'Home', url: '/' },
  ];
  for (const p of activePagesFor(ctx)) {
    if (p.page_type === 'home') continue;
    navLinks.push({ label: p.title, url: ctx.urlFor(p.page_type) });
  }
  navLinks.forEach((n, i) => {
    fields.push({ field_name: 'nav_label', field_value: n.label, field_type: 'text', sort_order: i });
    fields.push({ field_name: 'nav_url', field_value: n.url, field_type: 'url', sort_order: i });
  });

  // Legal links from business_info.legal_pages_needed
  const legalLabels: Record<'privacy' | 'terms' | 'cookies', string> = {
    privacy: 'Privacyverklaring',
    terms: 'Algemene voorwaarden',
    cookies: 'Cookieverklaring',
  };
  const legal = business?.legal_pages_needed ?? ['privacy'];
  legal.forEach((key, i) => {
    fields.push({ field_name: 'legal_label', field_value: legalLabels[key], field_type: 'text', sort_order: i });
    fields.push({ field_name: 'legal_url', field_value: `/${key}`, field_type: 'url', sort_order: i });
  });

  // NAWTE — only fields we actually have a value for
  const pushIf = (name: string, value: string | null | undefined, type: FieldType) => {
    if (value && value.trim().length > 0) {
      fields.push(f(name, value.trim(), type));
    }
  };
  pushIf('contact_phone', business?.phone, 'phone');
  pushIf('contact_email', business?.email, 'email');
  pushIf('contact_address', business?.address, 'textarea');
  pushIf('contact_postal_code', business?.postal_code, 'text');
  pushIf('contact_city', business?.city, 'text');
  pushIf('contact_kvk', business?.kvk_number, 'text');
  pushIf('contact_opening_hours', business?.opening_hours, 'textarea');
  pushIf('social_facebook', business?.social_facebook, 'url');
  pushIf('social_instagram', business?.social_instagram, 'url');
  pushIf('social_linkedin', business?.social_linkedin, 'url');
  pushIf('social_twitter', business?.social_twitter, 'url');
  pushIf('social_youtube', business?.social_youtube, 'url');

  // Suppress unused-arg warning — homePageTitle reserved for future use.
  void homePageTitle;
  return fields;
}

/** Active pages from the strategy (passed via closure on ctx). */
function activePagesFor(ctx: GenContext & { _pages?: SuggestedPage[] }): SuggestedPage[] {
  return ctx._pages ?? [];
}

async function buildOverPageSections(
  ctx: GenContext,
  page: SuggestedPage
): Promise<SectionPlan[]> {
  const over = await generateOverFull(ctx);
  return [
    {
      section_type: 'titel',
      fields: [
        f('title', nonEmpty(over.title, page.title), 'text'),
        f('intro', over.intro, 'textarea'),
      ],
    },
    {
      section_type: 'content',
      fields: [f('body', over.body, 'textarea')],
    },
    {
      section_type: 'cta',
      fields: [
        f('cta_text', nonEmpty(over.cta_text, ctx.primary_cta), 'text'),
        f('cta_url', ctx.urlFor('contact'), 'url'),
      ],
    },
  ];
}

async function buildServicesPageSections(
  ctx: GenContext,
  page: SuggestedPage
): Promise<SectionPlan[]> {
  const services = await generateServices(ctx, { count: 5, isFullPage: true });
  return [
    {
      section_type: 'titel',
      fields: [
        f('title', nonEmpty(services.title, page.title), 'text'),
        f('intro', services.intro, 'textarea'),
      ],
    },
    {
      section_type: 'diensten',
      fields: services.services.flatMap((s, i): FieldRow[] => [
        { field_name: 'service_title',       field_value: nonEmpty(s.title, `Dienst ${i + 1}`), field_type: 'text',     sort_order: i },
        { field_name: 'service_subtitle',    field_value: s.subtitle ?? '',                     field_type: 'text',     sort_order: i },
        { field_name: 'service_description', field_value: s.description,                        field_type: 'textarea', sort_order: i },
        { field_name: 'service_cta',         field_value: nonEmpty(s.cta_text, ctx.primary_cta), field_type: 'text',    sort_order: i },
        { field_name: 'service_cta_url',     field_value: ctx.urlFor('contact'),                field_type: 'url',      sort_order: i },
      ]),
    },
  ];
}

async function buildTestimonialsPageSections(
  ctx: GenContext,
  page: SuggestedPage
): Promise<SectionPlan[]> {
  const t = await generateTestimonials(ctx, { count: 6, isFullPage: true });
  return [
    {
      section_type: 'titel',
      fields: [
        f('title', nonEmpty(t.title, page.title), 'text'),
        f('intro', t.intro, 'textarea'),
      ],
    },
    {
      section_type: 'ervaringen',
      fields: t.items.flatMap((it, i): FieldRow[] => [
        { field_name: 'item_title',    field_value: nonEmpty(it.title, `Klantverhaal ${i + 1}`), field_type: 'text',     sort_order: i },
        { field_name: 'item_subtitle', field_value: nonEmpty(it.subtitle, 'Klant'),              field_type: 'text',     sort_order: i },
        { field_name: 'item_quote',    field_value: it.quote,                                    field_type: 'textarea', sort_order: i },
        { field_name: 'item_cta',      field_value: nonEmpty(it.cta_text, ctx.primary_cta),      field_type: 'text',     sort_order: i },
        { field_name: 'item_cta_url',  field_value: ctx.urlFor('contact'),                       field_type: 'url',      sort_order: i },
      ]),
    },
  ];
}

async function buildContactPageSections(
  ctx: GenContext,
  page: SuggestedPage
): Promise<SectionPlan[]> {
  const c = await generateContactPage(ctx);
  const business = ctx.business_info;

  // Contact-info "content" section with NAWTE + social fields. Only fields we have a value for.
  const infoFields: FieldRow[] = [];
  const pushIf = (name: string, value: string | null | undefined, type: FieldType) => {
    if (value && value.trim().length > 0) {
      infoFields.push(f(name, value.trim(), type));
    }
  };
  pushIf('contact_phone', business?.phone, 'phone');
  pushIf('contact_email', business?.email, 'email');
  pushIf('contact_address', business?.address, 'textarea');
  pushIf('contact_postal_code', business?.postal_code, 'text');
  pushIf('contact_city', business?.city, 'text');
  pushIf('contact_kvk', business?.kvk_number, 'text');
  pushIf('contact_opening_hours', business?.opening_hours, 'textarea');
  pushIf('social_facebook', business?.social_facebook, 'url');
  pushIf('social_instagram', business?.social_instagram, 'url');
  pushIf('social_linkedin', business?.social_linkedin, 'url');
  pushIf('social_twitter', business?.social_twitter, 'url');
  pushIf('social_youtube', business?.social_youtube, 'url');

  const sections: SectionPlan[] = [
    {
      section_type: 'titel',
      fields: [
        f('title', nonEmpty(c.title, page.title), 'text'),
        f('intro', c.intro, 'textarea'),
      ],
    },
  ];

  if (infoFields.length > 0) {
    sections.push({ section_type: 'content', fields: infoFields });
  }

  sections.push({
    section_type: 'contact_form',
    fields: [
      f('trigger', nonEmpty(c.form_trigger, 'Stuur een bericht'), 'text'),
      f('confirmation', c.confirmation_message, 'textarea'),
      ...c.form_fields.map(
        (label, i): FieldRow => ({
          field_name: 'form_field',
          field_value: label,
          field_type: 'text',
          sort_order: i,
        })
      ),
    ],
  });

  return sections;
}

async function buildFaqPageSections(
  ctx: GenContext,
  page: SuggestedPage
): Promise<SectionPlan[]> {
  const result = await generateFaqPage(ctx);
  return [
    {
      section_type: 'titel',
      fields: [
        f('title', nonEmpty(result.title, page.title), 'text'),
        f('intro', result.intro, 'textarea'),
      ],
    },
    {
      section_type: 'content',
      fields: result.items.flatMap((item, i): FieldRow[] => [
        { field_name: 'faq_question', field_value: item.question, field_type: 'text',     sort_order: i },
        { field_name: 'faq_answer',   field_value: item.answer,   field_type: 'textarea', sort_order: i },
      ]),
    },
  ];
}

async function buildBlogPageSections(
  ctx: GenContext,
  page: SuggestedPage
): Promise<SectionPlan[]> {
  const b = await generateBlogPage(ctx);
  return [
    {
      section_type: 'titel',
      fields: [
        f('title', nonEmpty(b.title, page.title), 'text'),
        f('intro', b.intro, 'textarea'),
      ],
    },
    {
      section_type: 'content',
      fields: [f('author_bio', b.author_bio, 'textarea')],
    },
  ];
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

async function deleteExistingPages(projectId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('pages')
    .delete()
    .eq('project_id', projectId);
  if (error) throw error;
}

function resolveSlug(page: SuggestedPage, usedSlugs: Set<string>): string {
  let base = page.slug?.trim();
  if (!base) {
    base = page.page_type === 'home' ? '' : page.page_type;
  }
  if (!usedSlugs.has(base)) return base;
  const fallback = base || page.page_type;
  for (let n = 2; n < 100; n++) {
    const candidate = `${fallback}-${n}`;
    if (!usedSlugs.has(candidate)) return candidate;
  }
  throw new Error(`Could not resolve unique slug for ${page.page_type}`);
}

async function persistPage(
  projectId: string,
  page: SuggestedPage,
  sections: SectionPlan[],
  usedSlugs: Set<string>
): Promise<void> {
  const slug = resolveSlug(page, usedSlugs);
  usedSlugs.add(slug);

  const { data: pageRow, error: pErr } = await supabaseAdmin
    .from('pages')
    .insert({
      project_id: projectId,
      page_type: page.page_type,
      title: page.title,
      slug,
      sort_order: page.sort_order,
      is_active: true,
    })
    .select('id')
    .single();
  if (pErr) throw pErr;

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i]!;
    const { data: secRow, error: sErr } = await supabaseAdmin
      .from('sections')
      .insert({
        page_id: pageRow.id,
        section_type: sec.section_type,
        sort_order: i,
        is_active: true,
      })
      .select('id')
      .single();
    if (sErr) throw sErr;

    if (sec.fields.length > 0) {
      const rows = sec.fields.map((field) => ({
        section_id: secRow.id,
        field_name: field.field_name,
        field_value: field.field_value,
        field_type: field.field_type,
        sort_order: field.sort_order,
        version: 1,
        is_current: true,
        source: 'ai_generated',
      }));
      const { error: cErr } = await supabaseAdmin
        .from('section_content')
        .insert(rows);
      if (cErr) throw cErr;
    }
  }
}

async function setStatus(projectId: string, status: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('projects')
    .update({ status })
    .eq('id', projectId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

async function buildContextFor(
  projectId: string
): Promise<{ ctx: GenContext; project: ProjectRow; strategy: StrategyRow }> {
  const project = await loadProject(projectId);
  const strategy = await loadStrategy(projectId);
  const answers = await loadAnswers(projectId);

  const includedPages = strategy.suggested_pages
    .filter((p) => p.include)
    .sort((a, b) => a.sort_order - b.sort_order);

  const businessInfo = await loadOrCreateBusinessInfo(
    projectId,
    project.business_name,
    project.archetype!,
    answers
  );

  const ctx: GenContext = {
    archetype: project.archetype!,
    sub_archetype: project.sub_archetype,
    website_type: strategy.website_type,
    tone_of_voice: strategy.tone_of_voice,
    addressing: strategy.addressing,
    primary_cta: strategy.primary_cta,
    archetype_config: strategy.archetype_config,
    answers,
    business_name: project.business_name ?? businessInfo.business_name,
    urlFor: buildUrlFor(includedPages),
    business_info: businessInfo,
  };
  // Stash the page list so the footer builder can render the nav menu.
  (ctx as GenContext & { _pages?: SuggestedPage[] })._pages = includedPages;

  return { ctx, project, strategy };
}

async function generateOnePage(
  ctx: GenContext,
  page: SuggestedPage
): Promise<SectionPlan[]> {
  switch (page.page_type) {
    case 'home':       return buildHomeSections(ctx, page);
    case 'over':       return buildOverPageSections(ctx, page);
    case 'diensten':   return buildServicesPageSections(ctx, page);
    case 'ervaringen': return buildTestimonialsPageSections(ctx, page);
    case 'contact':    return buildContactPageSections(ctx, page);
    case 'blog':       return buildBlogPageSections(ctx, page);
    case 'faq':        return buildFaqPageSections(ctx, page);
    case 'custom':
      throw new Error(
        `Refusing to generate page with legacy type 'custom' (title="${page.title}"). Re-run strategy.`
      );
  }
}

export async function generateAllContent(projectId: string): Promise<void> {
  await setStatus(projectId, 'generating');

  const { ctx, strategy } = await buildContextFor(projectId);
  await deleteExistingPages(projectId);

  const includedPages = strategy.suggested_pages
    .filter((p) => p.include)
    .sort((a, b) => a.sort_order - b.sort_order);

  console.log(
    `[content] ${projectId}: generating ${includedPages.length} pages (${includedPages
      .map((p) => p.page_type)
      .join(', ')})`
  );

  const usedSlugs = new Set<string>();
  for (const page of includedPages) {
    const t0 = Date.now();
    try {
      const sections = await generateOnePage(ctx, page);
      await persistPage(projectId, page, sections, usedSlugs);
      console.log(
        `[content] ${projectId}: ✓ ${page.page_type} "${page.title}" (${sections.length} sections, ${Math.round((Date.now() - t0) / 100) / 10}s)`
      );
    } catch (err) {
      console.error(
        `[content] ${projectId}: ✗ ${page.page_type} "${page.title}" failed:`,
        err
      );
      throw err;
    }
  }

  await setStatus(projectId, 'review');
  console.log(`[content] ${projectId}: all done.`);
}

export function startContentGeneration(projectId: string): void {
  void generateAllContent(projectId).catch(async (err) => {
    console.error(`[content] generation failed for ${projectId}:`, err);
    try {
      await setStatus(projectId, 'strategy');
    } catch (revErr) {
      console.error('[content] failed to revert status:', revErr);
    }
  });
}

// ---------------------------------------------------------------------------
// Public: read pages + content for review UI
// ---------------------------------------------------------------------------

export interface PageWithSections {
  id: string;
  page_type: string;
  title: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  sections: Array<{
    id: string;
    section_type: string;
    sort_order: number;
    fields: Array<{
      id: string;
      field_name: string;
      field_value: string;
      field_type: FieldType;
      sort_order: number;
      version: number;
    }>;
  }>;
}

export async function getPagesWithContent(
  projectId: string
): Promise<PageWithSections[]> {
  const { data: pages, error: pErr } = await supabaseAdmin
    .from('pages')
    .select('id, page_type, title, slug, sort_order, is_active')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });
  if (pErr) throw pErr;
  if (!pages || pages.length === 0) return [];

  const pageIds = pages.map((p) => p.id);
  const { data: sections, error: sErr } = await supabaseAdmin
    .from('sections')
    .select('id, page_id, section_type, sort_order')
    .in('page_id', pageIds)
    .order('sort_order', { ascending: true });
  if (sErr) throw sErr;

  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: content, error: cErr } =
    sectionIds.length > 0
      ? await supabaseAdmin
          .from('section_content')
          .select('id, section_id, field_name, field_value, field_type, sort_order, version, is_current')
          .in('section_id', sectionIds)
          .eq('is_current', true)
          .order('sort_order', { ascending: true })
      : { data: [], error: null };
  if (cErr) throw cErr;

  const fieldsBySection = new Map<string, PageWithSections['sections'][number]['fields']>();
  for (const c of content ?? []) {
    const arr = fieldsBySection.get(c.section_id) ?? [];
    arr.push({
      id: c.id,
      field_name: c.field_name,
      field_value: c.field_value ?? '',
      field_type: c.field_type as FieldType,
      sort_order: c.sort_order,
      version: c.version,
    });
    fieldsBySection.set(c.section_id, arr);
  }

  const sectionsByPage = new Map<string, PageWithSections['sections']>();
  for (const s of sections ?? []) {
    const arr = sectionsByPage.get(s.page_id) ?? [];
    arr.push({
      id: s.id,
      section_type: s.section_type,
      sort_order: s.sort_order,
      fields: fieldsBySection.get(s.id) ?? [],
    });
    sectionsByPage.set(s.page_id, arr);
  }

  return pages.map((p) => ({
    id: p.id,
    page_type: p.page_type,
    title: p.title,
    slug: p.slug,
    sort_order: p.sort_order,
    is_active: p.is_active,
    sections: sectionsByPage.get(p.id) ?? [],
  }));
}
