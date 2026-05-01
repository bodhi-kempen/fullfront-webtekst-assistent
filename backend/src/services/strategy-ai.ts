import { callTool } from '../lib/anthropic.js';
import type { Archetype } from '../data/questions.js';

// ---------------------------------------------------------------------------
// Strategy AI — proposes website type, tone, addressing, primary CTA, and
// the optional pages. Page STRUCTURE is fixed per archetype on the server
// side (see BASE_PAGES below); the AI only decides about extras like blog
// and FAQ.
// Source: docs/ontwerp.md §7 (Prompt 2) + design update 2026-04-30.
// ---------------------------------------------------------------------------

const STRATEGY_SYSTEM_PROMPT = `
Je bent een ervaren website-strateeg. Op basis van het volledige interview
bepaal je de website-strategie.

## Wat je beslist

### 1. website_type (kies één)
- "lead_generation" — focus op aanvragen/leads
- "authority" — focus op expertise tonen
- "sales" — direct verkopen (webshops)
- "booking" — afspraken/boekingen via website

### 2. tone_of_voice
Concrete beschrijving in één zin, bijv:
"Warm en persoonlijk, alsof je met een vriendin praat die toevallig ook
expert is."
"Direct en vakkundig, korte zinnen, geen poespas."

### 3. addressing — "je" | "u" | "mix"
Standaard "je". "u" alleen als de gebruiker dat expliciet aangaf of de
doelgroep formeel is.

### 4. primary_cta
De belangrijkste actie in 2-4 woorden. Per archetype-typische keuzes:
- service_zzp: "Plan kennismakingsgesprek"
- lokale_ambacht: "Bel direct" / "Vraag offerte aan"
- visueel_portfolio: "Vraag beschikbaarheid"
- horeca: "Reserveer een tafel"
- webshop: "Bekijk collectie"
- boeking_gedreven: "Boek nu online"

### 5. include_blog (boolean)
true ALLEEN als de ondernemer in het interview heeft aangegeven regelmatig
te willen schrijven of al een blog heeft. Anders false.

### 6. include_faq (boolean)
true ALLEEN als er in het interview duidelijk veelgestelde vragen aan bod
kwamen die op een aparte pagina horen. Anders false.

LET OP — webshops hebben standaard al een Klantenservice-pagina (FAQ-stijl);
voor webshops moet include_faq dus false zijn.

### 7. archetype_config
- include_opt_in: alleen true bij service_zzp met lead magnet of bij
  webshop met welkomstkorting.
- over_method: "origin_story" | "faq" | "team"
- show_pricing: bool
- emergency_available: true bij lokale_ambacht met spoeddienst
- has_booking_system: bool
- service_count: aantal kerndiensten op de homepage (max 3)

## NIET je taak
De pagina-structuur (Home/Over/Diensten/etc) is vast per archetype. Je
hoeft daar geen pagina's voor voor te stellen. Alleen blog en FAQ als
opties.

## Output
Gebruik altijd de propose-tool. Geen losse tekst.
`.trim();

const PROPOSE_TOOL = {
  name: 'propose',
  description: 'Stel de website-strategie voor.',
  input_schema: {
    type: 'object' as const,
    properties: {
      website_type: {
        type: 'string',
        enum: ['lead_generation', 'authority', 'sales', 'booking'],
      },
      tone_of_voice: { type: 'string' },
      addressing: { type: 'string', enum: ['je', 'u', 'mix'] },
      primary_cta: { type: 'string' },
      include_blog: { type: 'boolean' },
      include_faq: { type: 'boolean' },
      archetype_config: {
        type: 'object',
        properties: {
          include_opt_in: { type: 'boolean' },
          over_method: {
            type: 'string',
            enum: ['origin_story', 'faq', 'team'],
          },
          show_pricing: { type: 'boolean' },
          emergency_available: { type: 'boolean' },
          has_booking_system: { type: 'boolean' },
          service_count: { type: 'integer', minimum: 1, maximum: 3 },
        },
        required: [
          'include_opt_in',
          'over_method',
          'show_pricing',
          'emergency_available',
          'has_booking_system',
          'service_count',
        ],
        additionalProperties: false,
      },
    },
    required: [
      'website_type',
      'tone_of_voice',
      'addressing',
      'primary_cta',
      'include_blog',
      'include_faq',
      'archetype_config',
    ],
    additionalProperties: false,
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PageType =
  | 'home'
  | 'over'
  | 'diensten'
  | 'ervaringen'
  | 'contact'
  | 'blog'
  | 'faq'
  | 'custom';

export interface SuggestedPage {
  page_type: PageType;
  title: string;
  slug: string;
  sort_order: number;
  include: boolean;
  rationale: string;
}

export interface ArchetypeConfig {
  include_opt_in: boolean;
  over_method: 'origin_story' | 'faq' | 'team';
  show_pricing: boolean;
  emergency_available: boolean;
  has_booking_system: boolean;
  service_count: number;
}

interface AIDecision {
  website_type: 'lead_generation' | 'authority' | 'sales' | 'booking';
  tone_of_voice: string;
  addressing: 'je' | 'u' | 'mix';
  primary_cta: string;
  include_blog: boolean;
  include_faq: boolean;
  archetype_config: ArchetypeConfig;
}

export interface StrategyProposal {
  website_type: AIDecision['website_type'];
  tone_of_voice: string;
  addressing: 'je' | 'u' | 'mix';
  primary_cta: string;
  suggested_pages: SuggestedPage[];
  archetype_config: ArchetypeConfig;
}

// ---------------------------------------------------------------------------
// Server-side base page structure per archetype
// ---------------------------------------------------------------------------

interface BasePageDef {
  page_type: PageType;
  title: string;
  slug: string;
  rationale: string;
}

const BASE_PAGES: Record<Archetype, BasePageDef[]> = {
  service_zzp: [
    { page_type: 'home',       title: 'Home',        slug: '',           rationale: 'Visitekaartje + funnel naar kennismaking.' },
    { page_type: 'over',       title: 'Over mij',    slug: 'over',       rationale: 'Vertrouwen opbouwen via persoonlijk verhaal.' },
    { page_type: 'diensten',   title: 'Diensten',    slug: 'diensten',   rationale: 'Volledig dienstenoverzicht met details.' },
    { page_type: 'ervaringen', title: 'Ervaringen',  slug: 'ervaringen', rationale: 'Social proof via klantverhalen.' },
    { page_type: 'contact',    title: 'Contact',     slug: 'contact',    rationale: 'Drempel verlagen voor kennismaking.' },
  ],
  lokale_ambacht: [
    { page_type: 'home',       title: 'Home',        slug: '',           rationale: 'Lokale vindbaarheid + directe call-to-action.' },
    { page_type: 'diensten',   title: 'Diensten',    slug: 'diensten',   rationale: 'Volledig overzicht van werkzaamheden + tarieven.' },
    { page_type: 'over',       title: 'Over ons',    slug: 'over',       rationale: 'Wie staat er achter het bedrijf, vakmanschap.' },
    { page_type: 'ervaringen', title: 'Ervaringen',  slug: 'ervaringen', rationale: 'Reviews + foto\'s van uitgevoerd werk.' },
    { page_type: 'contact',    title: 'Contact',     slug: 'contact',    rationale: 'Telefoon prominent + offerte aanvragen.' },
  ],
  visueel_portfolio: [
    { page_type: 'home',       title: 'Home',        slug: '',           rationale: 'Visuele eerste indruk + stijl tonen.' },
    { page_type: 'diensten',   title: 'Portfolio',   slug: 'portfolio',  rationale: 'Het werk zelf is de verkooptool.' },
    { page_type: 'over',       title: 'Over mij',    slug: 'over',       rationale: 'Persoonlijke benadering + visie op het werk.' },
    { page_type: 'ervaringen', title: 'Ervaringen',  slug: 'ervaringen', rationale: 'Klantverhalen + projectreviews.' },
    { page_type: 'contact',    title: 'Contact',     slug: 'contact',    rationale: 'Beschikbaarheid + projectaanvraag.' },
  ],
  horeca: [
    { page_type: 'home',       title: 'Home',        slug: '',           rationale: 'Sfeer + reservering direct vooraan.' },
    { page_type: 'diensten',   title: 'Menu',        slug: 'menu',       rationale: 'Volledige menukaart met beschrijvingen.' },
    { page_type: 'over',       title: 'Over ons',    slug: 'over',       rationale: 'Concept, chef, verhaal achter de zaak.' },
    { page_type: 'contact',    title: 'Contact',     slug: 'contact',    rationale: 'Reserveren + adres + openingstijden.' },
  ],
  webshop: [
    { page_type: 'home',       title: 'Home',         slug: '',                 rationale: 'Productselectie + waardepropositie.' },
    { page_type: 'over',       title: 'Over ons',     slug: 'over',             rationale: 'Verhaal achter het merk, vertrouwen.' },
    { page_type: 'faq',        title: 'Klantenservice', slug: 'klantenservice', rationale: 'Verzending, retouren, betaling, garantie.' },
    { page_type: 'contact',    title: 'Contact',      slug: 'contact',          rationale: 'Vragen die niet onder klantenservice vallen.' },
  ],
  boeking_gedreven: [
    { page_type: 'home',       title: 'Home',           slug: '',               rationale: 'Direct boeken + sfeer van de zaak.' },
    { page_type: 'diensten',   title: 'Behandelingen',  slug: 'behandelingen',  rationale: 'Volledig aanbod met prijzen en duur.' },
    { page_type: 'over',       title: 'Over',           slug: 'over',           rationale: 'Team / specialist + werkwijze.' },
    { page_type: 'ervaringen', title: 'Ervaringen',     slug: 'ervaringen',     rationale: 'Reviews + before/after foto\'s.' },
    { page_type: 'contact',    title: 'Contact',        slug: 'contact',        rationale: 'Openingstijden + niet-online afspraken.' },
  ],
};

function buildPagesList(
  archetype: Archetype,
  decision: AIDecision
): SuggestedPage[] {
  const base = BASE_PAGES[archetype];
  const pages: SuggestedPage[] = base.map((p, i) => ({
    page_type: p.page_type,
    title: p.title,
    slug: p.slug,
    sort_order: i,
    include: true,
    rationale: p.rationale,
  }));

  // Optional add-ons: blog and faq. Webshops already have a faq-typed
  // Klantenservice page; suppress a second one even if AI requested it.
  let nextOrder = pages.length;
  const archetypeAlreadyHasFaq = pages.some((p) => p.page_type === 'faq');

  if (decision.include_blog) {
    pages.push({
      page_type: 'blog',
      title: 'Blog',
      slug: 'blog',
      sort_order: nextOrder++,
      include: true,
      rationale: 'Inhoudelijke autoriteit + SEO via regelmatige posts.',
    });
  }
  if (decision.include_faq && !archetypeAlreadyHasFaq) {
    pages.push({
      page_type: 'faq',
      title: 'Veelgestelde vragen',
      slug: 'veelgestelde-vragen',
      sort_order: nextOrder++,
      include: true,
      rationale: 'Antwoorden op vragen die in het verkoop-traject blijven terugkomen.',
    });
  }

  return pages;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export async function proposeStrategy(input: {
  archetype: Archetype;
  sub_archetype: Archetype | null;
  answers: Array<{
    question_id: string;
    question_text: string;
    answer_text: string;
    phase: 1 | 2 | 3;
    is_followup: boolean;
  }>;
}): Promise<StrategyProposal> {
  const { archetype, sub_archetype, answers } = input;

  const transcript = answers
    .map(
      (a) =>
        `[fase ${a.phase}${a.is_followup ? ' doorvraag' : ''}] ` +
        `Q (${a.question_id}): ${a.question_text}\n` +
        `A: ${a.answer_text}`
    )
    .join('\n\n');

  const userMessage = `
## Bedrijfstype
Primary archetype: ${archetype}
${sub_archetype ? `Sub archetype: ${sub_archetype}` : 'Geen sub-archetype.'}

## Volledig interview-transcript

${transcript}

Bepaal nu de strategie via de propose-tool.
`.trim();

  const decision = await callTool<AIDecision>({
    systemPrompt: STRATEGY_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
    tool: PROPOSE_TOOL,
    maxTokens: 1024,
    purpose: 'strategy/propose',
  });

  const suggested_pages = buildPagesList(archetype, decision);

  return {
    website_type: decision.website_type,
    tone_of_voice: decision.tone_of_voice,
    addressing: decision.addressing,
    primary_cta: decision.primary_cta,
    archetype_config: decision.archetype_config,
    suggested_pages,
  };
}
