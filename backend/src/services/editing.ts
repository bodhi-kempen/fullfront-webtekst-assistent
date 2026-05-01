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
import type { ArchetypeConfig, SuggestedPage } from './strategy-ai.js';

type FieldType = 'text' | 'textarea' | 'url' | 'phone' | 'email';

interface FieldRow {
  field_name: string;
  field_value: string;
  field_type: FieldType;
  sort_order: number;
}

// ---------------------------------------------------------------------------
// Authorization helper — verify the section belongs to the given user via
// page → project chain.
// ---------------------------------------------------------------------------

export async function assertSectionOwner(
  sectionId: string,
  userId: string
): Promise<{ pageId: string; pageType: string; projectId: string }> {
  const { data, error } = await supabaseAdmin
    .from('sections')
    .select('id, page_id, pages!inner(id, page_type, project_id, projects!inner(user_id))')
    .eq('id', sectionId)
    .maybeSingle();
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  if (!row) {
    throw Object.assign(new Error('Section not found'), { statusCode: 404 });
  }
  const projectUserId = row.pages?.projects?.user_id;
  if (projectUserId !== userId) {
    throw Object.assign(new Error('Section not found'), { statusCode: 404 });
  }
  return {
    pageId: row.pages.id,
    pageType: row.pages.page_type,
    projectId: row.pages.project_id,
  };
}

// ---------------------------------------------------------------------------
// PUT one field
// ---------------------------------------------------------------------------

export async function updateFieldValue(
  fieldId: string,
  newValue: string
): Promise<{ id: string; field_name: string; field_value: string; version: number }> {
  // Read existing
  const { data: existing, error: rErr } = await supabaseAdmin
    .from('section_content')
    .select('section_id, field_name, field_type, sort_order, version, is_current')
    .eq('id', fieldId)
    .maybeSingle();
  if (rErr) throw rErr;
  if (!existing) {
    throw Object.assign(new Error('Field not found'), { statusCode: 404 });
  }
  if (!existing.is_current) {
    throw Object.assign(new Error('Field is not the current version'), {
      statusCode: 409,
    });
  }

  // Mark current as old
  const { error: oErr } = await supabaseAdmin
    .from('section_content')
    .update({ is_current: false })
    .eq('id', fieldId);
  if (oErr) throw oErr;

  // Insert new version
  const { data: inserted, error: iErr } = await supabaseAdmin
    .from('section_content')
    .insert({
      section_id: existing.section_id,
      field_name: existing.field_name,
      field_value: newValue,
      field_type: existing.field_type,
      sort_order: existing.sort_order,
      version: existing.version + 1,
      is_current: true,
      source: 'user_edited',
    })
    .select('id, field_name, field_value, version')
    .single();
  if (iErr) throw iErr;

  return inserted;
}

// ---------------------------------------------------------------------------
// Build generator context from a project_id (mirrors content.ts loader).
// ---------------------------------------------------------------------------

interface ProjectRow {
  archetype: Archetype | null;
  sub_archetype: Archetype | null;
  business_name: string | null;
}
interface StrategyRow {
  website_type: 'lead_generation' | 'authority' | 'sales' | 'booking';
  tone_of_voice: string;
  addressing: 'je' | 'u' | 'mix';
  primary_cta: string;
  suggested_pages: SuggestedPage[];
  archetype_config: ArchetypeConfig;
}

async function buildCtx(
  projectId: string,
  userInstruction: string | undefined
): Promise<GenContext> {
  const { data: project, error: pErr } = await supabaseAdmin
    .from('projects')
    .select('archetype, sub_archetype, business_name')
    .eq('id', projectId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!project || !(project as ProjectRow).archetype) {
    throw new Error('Project missing archetype');
  }

  const { data: strategy, error: sErr } = await supabaseAdmin
    .from('website_strategy')
    .select('website_type, tone_of_voice, addressing, primary_cta, suggested_pages, archetype_config')
    .eq('project_id', projectId)
    .maybeSingle();
  if (sErr) throw sErr;
  if (!strategy) throw new Error('Strategy not yet generated');

  const { data: answers, error: aErr } = await supabaseAdmin
    .from('interview_answers')
    .select('question_id, answer_text, is_followup, parent_question_id')
    .eq('project_id', projectId)
    .order('sequence_order', { ascending: true });
  if (aErr) throw aErr;

  const grouped = new Map<string, string[]>();
  for (const a of answers ?? []) {
    const key = a.is_followup ? a.parent_question_id ?? a.question_id : a.question_id;
    const arr = grouped.get(key) ?? [];
    arr.push(a.answer_text);
    grouped.set(key, arr);
  }
  const answerMap = new Map<string, string>();
  for (const [k, v] of grouped) answerMap.set(k, v.join('\n\n'));

  const p = project as ProjectRow;
  const s = strategy as StrategyRow;

  // Re-use the previously-parsed business_info row rather than calling Claude
  // again on every regenerate.
  const { data: bi } = await supabaseAdmin
    .from('business_info')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  const business_info: ParsedBusinessInfo | undefined = bi
    ? {
        business_name: bi.business_name ?? null,
        owner_name: bi.owner_name ?? null,
        phone: bi.phone ?? null,
        email: bi.email ?? null,
        address: bi.address ?? null,
        postal_code: bi.postal_code ?? null,
        city: bi.city ?? null,
        kvk_number: bi.kvk_number ?? null,
        service_area: bi.service_area ?? [],
        social_facebook: bi.social_facebook ?? null,
        social_instagram: bi.social_instagram ?? null,
        social_linkedin: bi.social_linkedin ?? null,
        social_twitter: bi.social_twitter ?? null,
        social_youtube: bi.social_youtube ?? null,
        certifications: bi.certifications ?? [],
        opening_hours:
          (bi.opening_hours as { text?: string } | null)?.text ?? null,
        legal_pages_needed: ['privacy'],
      }
    : undefined;

  const includedPages = s.suggested_pages.filter((p2) => p2.include);
  const slugByType = new Map<string, string>();
  for (const pg of includedPages) slugByType.set(pg.page_type, pg.slug);
  const urlFor = (pageType: string): string => {
    if (pageType === 'home') return '/';
    const slug = slugByType.get(pageType);
    return slug !== undefined && slug !== '' ? `/${slug}` : '#';
  };

  const ctx: GenContext = {
    archetype: p.archetype!,
    sub_archetype: p.sub_archetype,
    website_type: s.website_type,
    tone_of_voice: s.tone_of_voice,
    addressing: s.addressing,
    primary_cta: s.primary_cta,
    archetype_config: s.archetype_config,
    answers: answerMap,
    business_name: p.business_name,
    urlFor,
    business_info,
    user_instruction: userInstruction,
  };
  return ctx;
}

// ---------------------------------------------------------------------------
// Replace all current section_content for a section with new field rows.
// Bumps the version per (field_name, sort_order).
// ---------------------------------------------------------------------------

async function replaceSectionContent(
  sectionId: string,
  newFields: FieldRow[]
): Promise<void> {
  const { data: existing, error: rErr } = await supabaseAdmin
    .from('section_content')
    .select('id, field_name, sort_order, version')
    .eq('section_id', sectionId)
    .eq('is_current', true);
  if (rErr) throw rErr;

  const versionByKey = new Map<string, number>();
  for (const e of existing ?? []) {
    versionByKey.set(`${e.field_name}|${e.sort_order}`, e.version);
  }

  if (existing && existing.length > 0) {
    const { error: oErr } = await supabaseAdmin
      .from('section_content')
      .update({ is_current: false })
      .eq('section_id', sectionId)
      .eq('is_current', true);
    if (oErr) throw oErr;
  }

  if (newFields.length === 0) return;

  const rows = newFields.map((f) => {
    const prevVersion =
      versionByKey.get(`${f.field_name}|${f.sort_order}`) ?? 0;
    return {
      section_id: sectionId,
      field_name: f.field_name,
      field_value: f.field_value,
      field_type: f.field_type,
      sort_order: f.sort_order,
      version: prevVersion + 1,
      is_current: true,
      source: 'ai_generated',
    };
  });
  const { error: iErr } = await supabaseAdmin
    .from('section_content')
    .insert(rows);
  if (iErr) throw iErr;
}

// ---------------------------------------------------------------------------
// Section-level regenerate dispatcher
// ---------------------------------------------------------------------------

function f(name: string, value: string, type: FieldType, sort = 0): FieldRow {
  return { field_name: name, field_value: value, field_type: type, sort_order: sort };
}

function nonEmpty(value: string | null | undefined, fallback: string): string {
  const t = (value ?? '').trim();
  return t.length > 0 ? t : fallback;
}

async function buildFieldsForSection(
  ctx: GenContext,
  pageType: string,
  sectionType: string
): Promise<FieldRow[]> {
  const key = `${pageType}/${sectionType}`;
  const urlContact = ctx.urlFor('contact');
  const urlOver = ctx.urlFor('over');
  const urlDiensten = ctx.urlFor('diensten');
  const urlErvaringen = ctx.urlFor('ervaringen');

  switch (key) {
    case 'home/hero': {
      const r = await generateHero(ctx);
      return [
        f('title', nonEmpty(r.title, ctx.business_name ?? 'Welkom'), 'text'),
        f('subtitle', r.subtitle, 'textarea'),
        f('cta_text', nonEmpty(r.cta_text, ctx.primary_cta), 'text'),
        f('cta_url', urlContact, 'url'),
      ];
    }
    case 'home/over_mij': {
      const r = await generateOverShort(ctx);
      return [
        f('title', nonEmpty(r.title, `Over ${ctx.business_name ?? 'mij'}`), 'text'),
        f('body', r.body, 'textarea'),
        f('cta_text', nonEmpty(r.cta_text, 'Lees mijn verhaal'), 'text'),
        f('cta_url', urlOver, 'url'),
      ];
    }
    case 'home/diensten': {
      const r = await generateServices(ctx, { count: ctx.archetype_config.service_count });
      return [
        f('title', nonEmpty(r.title, 'Onze diensten'), 'text'),
        f('intro', r.intro, 'textarea'),
        ...r.services.flatMap((s, i): FieldRow[] => [
          { field_name: 'service_title',       field_value: nonEmpty(s.title, `Dienst ${i + 1}`), field_type: 'text',     sort_order: i },
          { field_name: 'service_subtitle',    field_value: s.subtitle ?? '',                     field_type: 'text',     sort_order: i },
          { field_name: 'service_description', field_value: s.description,                        field_type: 'textarea', sort_order: i },
          { field_name: 'service_cta',         field_value: nonEmpty(s.cta_text, 'Meer informatie'), field_type: 'text',  sort_order: i },
          { field_name: 'service_cta_url',     field_value: urlDiensten,                          field_type: 'url',      sort_order: i },
        ]),
        f('section_footer_cta_text', nonEmpty(r.section_footer_cta_text, 'Bekijk volledig aanbod'), 'text'),
        f('section_footer_cta_url',  urlDiensten, 'url'),
      ];
    }
    case 'home/ervaringen': {
      const r = await generateTestimonials(ctx, { count: 3 });
      return [
        f('title', nonEmpty(r.title, 'Ervaringen'), 'text'),
        f('intro', r.intro, 'textarea'),
        ...r.items.flatMap((it, i): FieldRow[] => [
          { field_name: 'item_title',    field_value: nonEmpty(it.title, `Klantverhaal ${i + 1}`), field_type: 'text',     sort_order: i },
          { field_name: 'item_subtitle', field_value: nonEmpty(it.subtitle, 'Klant'),              field_type: 'text',     sort_order: i },
          { field_name: 'item_quote',    field_value: it.quote,                                    field_type: 'textarea', sort_order: i },
        ]),
        f('section_footer_cta_text', nonEmpty(r.section_footer_cta_text, 'Bekijk alle ervaringen'), 'text'),
        f('section_footer_cta_url',  urlErvaringen, 'url'),
      ];
    }
    case 'home/opt_in': {
      const r = await generateOptIn(ctx);
      return [
        f('title', nonEmpty(r.title, 'Gratis weggever'), 'text'),
        f('subtitle', r.subtitle, 'textarea'),
        f('cta_text', nonEmpty(r.cta_text, 'Download nu'), 'text'),
        f('cta_url', '#', 'url'),
      ];
    }
    case 'home/footer': {
      // Only regenerate the description; nav/legal/NAWTE are server-built
      // and not driven by an AI regenerate.
      const r = await generateFooter(ctx);
      return [f('description', r.description, 'textarea')];
    }
    case 'over/titel': {
      const r = await generateOverFull(ctx);
      return [f('title', nonEmpty(r.title, 'Over'), 'text'), f('intro', r.intro, 'textarea')];
    }
    case 'over/content': {
      const r = await generateOverFull(ctx);
      return [f('body', r.body, 'textarea')];
    }
    case 'over/cta': {
      const r = await generateOverFull(ctx);
      return [
        f('cta_text', nonEmpty(r.cta_text, ctx.primary_cta), 'text'),
        f('cta_url', urlContact, 'url'),
      ];
    }
    case 'diensten/titel': {
      const r = await generateServices(ctx, { count: 5, isFullPage: true });
      return [f('title', nonEmpty(r.title, 'Diensten'), 'text'), f('intro', r.intro, 'textarea')];
    }
    case 'diensten/diensten': {
      const r = await generateServices(ctx, { count: 5, isFullPage: true });
      return r.services.flatMap((s, i): FieldRow[] => [
        { field_name: 'service_title',       field_value: nonEmpty(s.title, `Dienst ${i + 1}`), field_type: 'text',     sort_order: i },
        { field_name: 'service_subtitle',    field_value: s.subtitle ?? '',                     field_type: 'text',     sort_order: i },
        { field_name: 'service_description', field_value: s.description,                        field_type: 'textarea', sort_order: i },
        { field_name: 'service_cta',         field_value: nonEmpty(s.cta_text, ctx.primary_cta), field_type: 'text',    sort_order: i },
        { field_name: 'service_cta_url',     field_value: urlContact,                           field_type: 'url',      sort_order: i },
      ]);
    }
    case 'ervaringen/titel': {
      const r = await generateTestimonials(ctx, { count: 6, isFullPage: true });
      return [f('title', nonEmpty(r.title, 'Ervaringen'), 'text'), f('intro', r.intro, 'textarea')];
    }
    case 'ervaringen/ervaringen': {
      const r = await generateTestimonials(ctx, { count: 6, isFullPage: true });
      return r.items.flatMap((it, i): FieldRow[] => [
        { field_name: 'item_title',    field_value: nonEmpty(it.title, `Klantverhaal ${i + 1}`), field_type: 'text',     sort_order: i },
        { field_name: 'item_subtitle', field_value: nonEmpty(it.subtitle, 'Klant'),              field_type: 'text',     sort_order: i },
        { field_name: 'item_quote',    field_value: it.quote,                                    field_type: 'textarea', sort_order: i },
        { field_name: 'item_cta',      field_value: nonEmpty(it.cta_text, ctx.primary_cta),      field_type: 'text',     sort_order: i },
        { field_name: 'item_cta_url',  field_value: urlContact,                                  field_type: 'url',      sort_order: i },
      ]);
    }
    case 'contact/titel': {
      const r = await generateContactPage(ctx);
      return [f('title', nonEmpty(r.title, 'Contact'), 'text'), f('intro', r.intro, 'textarea')];
    }
    case 'contact/content': {
      // NAWTE block — server-built from business_info; no AI call needed.
      const bi = ctx.business_info;
      const out: FieldRow[] = [];
      const pushIf = (name: string, v: string | null | undefined, t: FieldType) => {
        if (v && v.trim().length > 0) out.push(f(name, v.trim(), t));
      };
      pushIf('contact_phone', bi?.phone, 'phone');
      pushIf('contact_email', bi?.email, 'email');
      pushIf('contact_address', bi?.address, 'textarea');
      pushIf('contact_postal_code', bi?.postal_code, 'text');
      pushIf('contact_city', bi?.city, 'text');
      pushIf('contact_kvk', bi?.kvk_number, 'text');
      pushIf('contact_opening_hours', bi?.opening_hours, 'textarea');
      pushIf('social_facebook', bi?.social_facebook, 'url');
      pushIf('social_instagram', bi?.social_instagram, 'url');
      pushIf('social_linkedin', bi?.social_linkedin, 'url');
      pushIf('social_twitter', bi?.social_twitter, 'url');
      pushIf('social_youtube', bi?.social_youtube, 'url');
      return out;
    }
    case 'contact/contact_form': {
      const r = await generateContactPage(ctx);
      return [
        f('trigger', nonEmpty(r.form_trigger, 'Stuur een bericht'), 'text'),
        f('confirmation', r.confirmation_message, 'textarea'),
        ...r.form_fields.map(
          (label, i): FieldRow => ({
            field_name: 'form_field',
            field_value: label,
            field_type: 'text',
            sort_order: i,
          })
        ),
      ];
    }
    case 'blog/titel': {
      const r = await generateBlogPage(ctx);
      return [f('title', nonEmpty(r.title, 'Blog'), 'text'), f('intro', r.intro, 'textarea')];
    }
    case 'blog/content': {
      const r = await generateBlogPage(ctx);
      return [f('author_bio', r.author_bio, 'textarea')];
    }
    case 'faq/titel': {
      const r = await generateFaqPage(ctx);
      return [f('title', nonEmpty(r.title, 'Veelgestelde vragen'), 'text'), f('intro', r.intro, 'textarea')];
    }
    case 'faq/content': {
      const r = await generateFaqPage(ctx);
      return r.items.flatMap((item, i): FieldRow[] => [
        { field_name: 'faq_question', field_value: item.question, field_type: 'text',     sort_order: i },
        { field_name: 'faq_answer',   field_value: item.answer,   field_type: 'textarea', sort_order: i },
      ]);
    }
    default:
      throw Object.assign(
        new Error(`No regenerator for ${key}`),
        { statusCode: 400 }
      );
  }
}

export async function regenerateSection(
  sectionId: string,
  pageType: string,
  projectId: string,
  userInstruction?: string
): Promise<void> {
  // Fetch the section type
  const { data: section, error } = await supabaseAdmin
    .from('sections')
    .select('section_type')
    .eq('id', sectionId)
    .maybeSingle();
  if (error) throw error;
  if (!section) {
    throw Object.assign(new Error('Section not found'), { statusCode: 404 });
  }

  const ctx = await buildCtx(projectId, userInstruction);
  const fields = await buildFieldsForSection(ctx, pageType, section.section_type);
  await replaceSectionContent(sectionId, fields);
}
