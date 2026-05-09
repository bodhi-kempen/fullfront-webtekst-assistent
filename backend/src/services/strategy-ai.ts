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
De pagina-structuur (Home/Over/Diensten/etc) is in principe vast per
archetype. Je hoeft daar geen pagina's voor voor te stellen — server
genereert ze uit BASE_PAGES.

## WEL je taak (alleen bij wijzigingen)
Tijdens DEEL 10 stelde de assistant zelf een pagina-lijst voor (vraag
p10q12). Als de transcript laat zien dat de ondernemer dit voorstel
heeft GEWIJZIGD (toevoegen, verwijderen, hernoemen, splitsen), reflecteer
die wijzigingen dan in pages_override.

Detectie: kijk naar de p10q12-sectie van de transcript. Als de gebruiker
ALLEEN bevestigt ("ja", "klinkt goed", "prima") en het voorstel is
gewoon de archetype-default → laat pages_override null. Als de gebruiker
ZEGT iets als "voeg X toe", "Y mag weg", "X bij Y", "splitsen", "andere
naam" → de finale geaccepteerde lijst (zoals zichtbaar in de laatste
followup-tekst die de gebruiker bevestigde) komt in pages_override.

Mapping naar page_type:
- Home → 'home'
- Over/Origin/Het verhaal → 'over'
- Diensten/Behandelingen/Lessen/Menu/Shop/Producten/Portfolio → 'diensten'
- Ervaringen/Reviews/Klantverhalen/Testimonials → 'ervaringen'
- Contact/Reserveren/Boeken/Plan een afspraak → 'contact' (titel mag wel "Reserveren" zijn)
- Blog/Inspiratie/Artikelen → 'blog'
- FAQ/Veelgestelde vragen/Klantenservice → 'faq'
- Iets dat nergens onder valt → 'custom'

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
      pages_override: {
        type: ['array', 'null'],
        description:
          'Vul ALLEEN als de transcript laat zien dat de gebruiker het ' +
          'voorgestelde pagina-overzicht (p10q12) wijzigde — toevoegen, ' +
          'verwijderen, hernoemen of splitsen. Anders null laten; dan ' +
          'gebruikt de server de standaard archetype-pagina-structuur. ' +
          'De volgorde van het array bepaalt sort_order.',
        items: {
          type: 'object',
          properties: {
            page_type: {
              type: 'string',
              enum: [
                'home',
                'over',
                'diensten',
                'ervaringen',
                'contact',
                'blog',
                'faq',
                'custom',
              ],
            },
            title: { type: 'string', description: "Pagina-titel zoals in de menu (bijv. 'Reserveren', 'Reviews')." },
            slug: {
              type: 'string',
              description: "URL-slug, lowercase ASCII met '-' tussen woorden. Leeg ('') voor de Home.",
            },
            rationale: {
              type: 'string',
              description: 'Korte uitleg waarom deze pagina (max 1 zin).',
            },
          },
          required: ['page_type', 'title', 'slug', 'rationale'],
          additionalProperties: false,
        },
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
      'pages_override',
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

interface PageOverrideEntry {
  page_type: PageType;
  title: string;
  slug: string;
  rationale: string;
}

interface AIDecision {
  website_type: 'lead_generation' | 'authority' | 'sales' | 'booking';
  tone_of_voice: string;
  addressing: 'je' | 'u' | 'mix';
  primary_cta: string;
  include_blog: boolean;
  include_faq: boolean;
  archetype_config: ArchetypeConfig;
  pages_override: PageOverrideEntry[] | null;
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
    { page_type: 'home',       title: 'Home',           slug: '',                 rationale: 'Productselectie + waardepropositie.' },
    { page_type: 'diensten',   title: 'Shop',           slug: 'shop',             rationale: 'Productcategorieën of individuele producten met prijzen.' },
    { page_type: 'over',       title: 'Over ons',       slug: 'over',             rationale: 'Verhaal achter het merk, vertrouwen.' },
    { page_type: 'ervaringen', title: 'Reviews',        slug: 'reviews',          rationale: 'Klantbeoordelingen en foto\'s van het product in gebruik.' },
    { page_type: 'faq',        title: 'Klantenservice', slug: 'klantenservice',   rationale: 'Verzending, retouren, betaling, garantie.' },
    { page_type: 'contact',    title: 'Contact',        slug: 'contact',          rationale: 'Vragen die niet onder klantenservice vallen.' },
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
  // If the strategy AI saw user modifications to the page proposal, honor
  // its override. We dedupe + ensure Home leads + force include=true so a
  // mis-shaped AI response can't leave us with an empty or broken list.
  const override = decision.pages_override;
  if (override && override.length > 0) {
    const cleaned = sanitizeOverridePages(override);
    if (cleaned.length > 0) return cleaned;
    console.warn('[strategy] pages_override was non-empty but sanitised to 0 — falling back to BASE_PAGES');
  }

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

/** Defensive cleanup of an AI-produced page list:
 *  - dedupe identical slugs (keep first)
 *  - dedupe duplicated page_type=home (keep first)
 *  - ensure exactly one home, at index 0, with empty slug
 *  - assign sort_order based on resulting array index
 *  - drop entries with empty title
 *  - normalize slug (lowercase ascii-ish; we trust the AI mostly here).
 */
function sanitizeOverridePages(rows: PageOverrideEntry[]): SuggestedPage[] {
  const seenSlugs = new Set<string>();
  let seenHome = false;
  const result: SuggestedPage[] = [];

  for (const row of rows) {
    if (!row || !row.title || !row.title.trim()) continue;
    let slug = (row.slug ?? '').trim().toLowerCase();
    if (row.page_type === 'home') {
      if (seenHome) continue;
      seenHome = true;
      slug = '';
    }
    if (slug !== '' && seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    result.push({
      page_type: row.page_type,
      title: row.title.trim(),
      slug,
      sort_order: result.length,
      include: true,
      rationale: (row.rationale ?? '').trim() || `Door gebruiker bevestigde pagina.`,
    });
  }

  // Move home to index 0 if it came later, or synthesize one if missing.
  if (result.length === 0) return result;
  const homeIdx = result.findIndex((p) => p.page_type === 'home');
  if (homeIdx > 0) {
    const [home] = result.splice(homeIdx, 1);
    result.unshift(home!);
  } else if (homeIdx === -1) {
    result.unshift({
      page_type: 'home',
      title: 'Home',
      slug: '',
      sort_order: 0,
      include: true,
      rationale: 'Verplichte landingspagina.',
    });
  }
  return result.map((p, i) => ({ ...p, sort_order: i }));
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
