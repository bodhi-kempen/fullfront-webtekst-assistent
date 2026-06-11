import { callTool } from '../lib/anthropic.js';
import type { Archetype } from '../data/questions.js';
import type { ArchetypeConfig } from './strategy-ai.js';

// ---------------------------------------------------------------------------
// Shared context passed to every generator
// ---------------------------------------------------------------------------

export interface GenContext {
  archetype: Archetype;
  sub_archetype: Archetype | null;
  website_type: 'lead_generation' | 'authority' | 'sales' | 'booking';
  tone_of_voice: string;
  addressing: 'je' | 'u' | 'mix';
  primary_cta: string;
  archetype_config: ArchetypeConfig;
  /** Concatenated main+followup answer text per question_id. */
  answers: Map<string, string>;
  business_name: string | null;
  /** Resolves a page_type (e.g. "over") to its URL path ("/over"). */
  urlFor: (pageType: string) => string;
  /** Parsed structured business info (NAWTE, social, certifications). */
  business_info?: ParsedBusinessInfo;
  /** Optional regenerate-with-prompt instruction from the user. */
  user_instruction?: string;
}

export interface ParsedBusinessInfo {
  business_name: string | null;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  kvk_number: string | null;
  service_area: string[];
  social_facebook: string | null;
  social_instagram: string | null;
  social_linkedin: string | null;
  social_twitter: string | null;
  social_youtube: string | null;
  certifications: string[];
  opening_hours: string | null;
  legal_pages_needed: Array<'privacy' | 'terms' | 'cookies'>;
}

// ---------------------------------------------------------------------------
// Common helpers
// ---------------------------------------------------------------------------

function ans(ctx: GenContext, ...ids: string[]): string {
  return ids
    .map((id) => {
      const text = ctx.answers.get(id);
      return text ? `[${id}] ${text}` : '';
    })
    .filter(Boolean)
    .join('\n\n');
}

/** Build a per-service block from all p4_s*_q* answers in context. Use this
 *  for the diensten generator so Claude sees ALL services in a structured
 *  way regardless of how many services the user described. */
function servicesBlock(ctx: GenContext): string {
  const serviceNumbers = new Set<number>();
  for (const id of ctx.answers.keys()) {
    const m = id.match(/^p4_s(\d+)_q\d+$/);
    if (m) serviceNumbers.add(Number(m[1]));
  }
  if (serviceNumbers.size === 0) {
    return '(geen diensten beschreven in het interview)';
  }
  const sorted = [...serviceNumbers].sort((a, b) => a - b);
  const Q_LABELS: Record<number, string> = {
    1: 'Naam + omschrijving',
    2: 'Waarom zo ingericht',
    3: 'Voor wie',
    4: 'Welke situatie',
    5: 'Welk probleem lost het op',
    6: 'Wat verandert er',
    7: 'Wat levert het op',
    8: 'Wat merkt klant als eerste',
  };
  const blocks: string[] = [];
  for (const n of sorted) {
    const lines: string[] = [`### Dienst ${n}`];
    for (let q = 1; q <= 8; q++) {
      const text = ctx.answers.get(`p4_s${n}_q${q}`);
      if (text) {
        lines.push(`- ${Q_LABELS[q]}: ${text}`);
      }
    }
    blocks.push(lines.join('\n'));
  }
  return blocks.join('\n\n');
}

/** Guardrails included in every content generator's system prompt.
 *  Prevents hallucinated names, fabricated facts, and silent fill-ins of
 *  missing information. Things the AI MUST NOT do — and what to do instead
 *  when the interview hasn't given us the answer. */
function accuracyBlock(ctx: GenContext): string {
  const businessName = ctx.business_name ?? '(geen bedrijfsnaam bekend)';
  return `
## FEITELIJKE NAUWKEURIGHEID — STRIKT

### Namen
Gebruik UITSLUITEND namen die LETTERLIJK in het interview of de strategie
voorkomen. Verzin NOOIT een persoonsnaam (geen Sophie, Eva, Mila, Lisa, etc.).
Als de naam van de ondernemer niet bekend is, gebruik dan de bedrijfsnaam
("${businessName}") of een neutrale formulering ("een afspraak bij ${businessName}",
"het team van ${businessName}"). LIEVER GEEN NAAM dan een verzonnen naam.

### Zekerheid behouden
Behoud de mate van zekerheid uit het interview. Als de ondernemer
"misschien", "ik denk", "ik ben aan het onderzoeken", "ik ben ermee bezig"
of een vergelijkbare voorwaardelijke vorm gebruikte, blijft dat in de tekst
een plan of mogelijkheid — NOOIT een vaststaand feit. "Ik wil ooit een
tweede vestiging openen" wordt nooit "We hebben een tweede vestiging".

### Placeholders bij ontbrekende info
Als belangrijke informatie ontbreekt (plaatsnaam, telefoonnummer, prijzen,
adres, openingstijden) vul je het gat NIET op met een vage formulering of
verzonnen inhoud. Gebruik in plaats daarvan letterlijk:
"[INVULLEN: korte omschrijving van wat hier hoort]"
zodat het opvalt en niet ongemerkt live gaat. Voorbeelden:
- "[INVULLEN: prijs vanaf]"
- "[INVULLEN: plaatsnaam]"
- "[INVULLEN: telefoonnummer]"
NIET "Vraag naar onze prijzen" of "in onze regio" als trucje om een gat
te verbergen.
`.trim();
}

function styleBlock(ctx: GenContext, opts?: { isFullPage?: boolean }): string {
  return `
## Schrijfstijl
- Tone of voice: ${ctx.tone_of_voice}
- Aanspreekvorm: ${ctx.addressing === 'je' ? '"je"' : ctx.addressing === 'u' ? '"u"' : 'mix van je en u'}
- Primaire CTA-actie: "${ctx.primary_cta}"
- Archetype-context: ${ctx.archetype}${ctx.sub_archetype ? ` + ${ctx.sub_archetype}` : ''}
- Geen "Welkom bij..." of "Wij zijn de specialist in...".
- Concrete taal, geen marketing-clichés.
- Nederlands.

## SPREEKTAAL EN PERSOONLIJKHEID
Schrijf alsof de ondernemer zelf praat. Gebruik korte zinnen. Wissel lange en
korte zinnen af. Begin af en toe een zin met "En" of "Maar". Gebruik spreektaal
waar het past ("gewoon", "lekker", "even"). Vermijd marketingtaal en clichés.

VERBODEN WOORDEN (gebruik deze NIET): "uniek", "passie", "dé", "met passie",
"met liefde", "vakmanschap en passie", "jouw partner in".

Deze regel geldt voor ALLE velden in elke tool-output: titels, subtitels,
intro's, body, CTA's, beschrijvingen, hero-titels, alles. Geen uitzonderingen.
Een hero-titel als "Jouw haar, onze passie" is dus FOUT — kies iets concreets
zonder verboden woorden.

SLECHT: "Met passie en vakmanschap creëren wij unieke oplossingen."
GOED: "We maken het gewoon goed. Daar draait het om."

## UNIEKE TITELS PER PAGINA — STRIKT
Gebruik NOOIT dezelfde titel op meerdere pagina's. Elke pagina verdient een
unieke, specifieke titel. "Zo kan ik je helpen" mag maar op één pagina
voorkomen. De diensten-pagina moet een titel hebben die specifiek is voor het
aanbod (bijv. "Wandelingen en opvang voor jouw hond" in plaats van het
generieke "Zo kan ik je helpen"). Maak titels concreet aan de hand van het
echte aanbod van dit bedrijf.

## KORTE, PUNCHIGE INTRO'S
Intro's zijn maximaal 2 zinnen. Gebruik korte, krachtige zinnen die direct
aanspreken. Vermijd beschrijvende opsommingen.

SLECHT: "Of je hond nu een sociale vlinder is of liever wat rust heeft, bij
Blije Pootjes krijgt elke hond de dag die bij hem past. Beweging, aandacht en
contact, afgestemd op wie jouw hond is."
GOED: "Jouw hond verdient meer dan een rondje om het blok. Dit is wat we voor
hem doen."

## GEVARIEERDE CTA'S PER PAGINA
Gebruik NIET dezelfde CTA-tekst op elke pagina. Varieer de CTA per context:
- Home hero: actiegericht ("Plan een kennismaking", "Boek je afspraak")
- Diensten: specifiek ("Bekijk de wandelingen", "Bekijk het aanbod")
- Over: persoonlijk ("Leer [naam] kennen", "Lees het verhaal")
- Ervaringen: sociaal bewijs ("Bekijk alle ervaringen", "Lees wat klanten zeggen")
- Contact: laagdrempelig ("Stuur een berichtje", "Neem contact op")

## INTERPUNCTIE — STRIKT
- Gebruik NOOIT em dashes (—) of en dashes (–) in je teksten.
- Gebruik gewone leestekens: punten, komma's, dubbele punten.
- Waar je een em dash zou willen, schrijf je liever twee losse zinnen of
  voeg je een gewone komma toe.

## GEEN MARKDOWN
- NOOIT **vet**, *cursief*, # koppen, lijsten met - of *.
- Schrijf platte tekst. Alinea's scheid je met witregels.
- Als je structuur wilt aanbrengen, gebruik dan losse paragrafen, geen
  markdown. De website-builder doet de opmaak.
${
  opts?.isFullPage
    ? `\n## Diepte\nDit is de volledige pagina, niet de homepage-samenvatting. Schrijf
uitgebreidere en diepere teksten dan op de homepage. Geef context, voorbeelden
en details die op de homepage zouden ontbreken.`
    : ''
}
${ctx.user_instruction ? `\n## Extra instructie van de gebruiker\n${ctx.user_instruction}` : ''}
`.trim();
}

// ---------------------------------------------------------------------------
// 1. Hero (homepage)  — Prompt 3
// ---------------------------------------------------------------------------

const HERO_TOOL = {
  name: 'write_hero',
  description: 'Schrijf de hero sectie voor de homepage.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        description: 'Max 10 woorden. Pakt aandacht. Toont wat het bedrijf doet of het voordeel.',
      },
      subtitle: {
        type: 'string',
        description: 'Max 30 woorden. Verduidelijkt of "service statement" met doelgroep + behoefte + resultaat.',
      },
      cta_text: {
        type: 'string',
        description: 'Max 5 woorden. De knoptekst voor de primaire actie.',
      },
    },
    required: ['title', 'subtitle', 'cta_text'],
    additionalProperties: false,
  },
};

export interface HeroOutput {
  title: string;
  subtitle: string;
  cta_text: string;
}

export async function generateHero(ctx: GenContext): Promise<HeroOutput> {
  const system = `
Je schrijft de hero-sectie van een homepage volgens het Fullfront hulpdocument.

## Per archetype
- service_zzp: titel = transformatie/resultaat. "Van burn-out naar balans"
- lokale_ambacht: titel = dienst + regio. "Loodgieter Amsterdam, 24/7"
- visueel_portfolio: titel = stijl + specialisatie. "Documentaire bruiloftsfotografie"
- horeca: titel = concept + sfeer. "Authentiek Italiaans aan de gracht"
- webshop: titel = waardepropositie. "Handgemaakte sieraden met een verhaal"
- boeking_gedreven: titel = dienst + actie. "Jouw haar, onze passie"

## Subtitel-formule (vooral voor service_zzp):
"Ik help [ideale klant] om [behoefte] zodat zij [resultaat]"

## CTA
De cta_text is de website-brede primaire CTA: "${ctx.primary_cta}".
Gebruik die letterlijk, of een kortere variant van max 4 woorden.

${accuracyBlock(ctx)}

${styleBlock(ctx)}
`.trim();

  const user = `
## Bedrijf
${ctx.business_name ?? '(naam onbekend)'}

## Wat het bedrijf doet en voor wie
${ans(ctx, 'p1q1', 'p1q3', 'p1q4', 'p1q5')}

## Probleem en differentiator
${ans(ctx, 'p2q1', 'p2q5', 'p3q5')}

## Resultaat en mission
${ans(ctx, 'p5q5', 'p7q1')}
`.trim();

  return callTool<HeroOutput>({
    systemPrompt: system,
    messages: [{ role: 'user', content: user }],
    tool: HERO_TOOL,
    maxTokens: 512,
    purpose: 'content/hero',
  });
}

// ---------------------------------------------------------------------------
// 2. Over mij/ons — kort (homepage section)  — Prompt 4
// ---------------------------------------------------------------------------

const OVER_SHORT_TOOL = {
  name: 'write_over_short',
  description: 'Schrijf de korte Over-mij sectie voor de homepage.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string', description: 'Bijv. "Over [naam]" of vergelijkbaar.' },
      body: {
        type: 'string',
        description: 'Verhalend, 120-160 woorden. De WHY, vertrouwen, persoonlijke connectie. Geen opsommingen.',
      },
      cta_text: { type: 'string', description: 'Bijv. "Meer over [naam]" of "Leer mij kennen". NIET de website-brede CTA. Max 5 woorden.' },
    },
    required: ['title', 'body', 'cta_text'],
    additionalProperties: false,
  },
};

export interface OverShortOutput {
  title: string;
  body: string;
  cta_text: string;
}

export async function generateOverShort(ctx: GenContext): Promise<OverShortOutput> {
  const system = `
Je schrijft de korte Over-sectie op de homepage (120-160 woorden).
Mensen kopen niet WAT je doet maar WAAROM. Persoonlijk, niet zakelijk.
Verhalend, geen opsommingen.

## CTA
De cta_text leidt naar de Over-pagina, NIET naar contact. Gebruik
"Meer over [voornaam]", "Leer [voornaam] kennen", "Lees mijn verhaal" of
een vergelijkbare zachte variant. Max 5 woorden.

${accuracyBlock(ctx)}

${styleBlock(ctx)}
`.trim();

  const user = `
## Bedrijf
${ctx.business_name ?? '(naam onbekend)'}

## Wie ben je
${ans(ctx, 'p1q1', 'p1q2')}

## Origin & WHY
${ans(ctx, 'p6q1', 'p6q2', 'p6q3')}

## Waarden en wat je anders doet
${ans(ctx, 'p6q5', 'p6q6', 'p7q5')}
`.trim();

  return callTool<OverShortOutput>({
    systemPrompt: system,
    messages: [{ role: 'user', content: user }],
    tool: OVER_SHORT_TOOL,
    maxTokens: 768,
    purpose: 'content/over-short',
  });
}

// ---------------------------------------------------------------------------
// 3. Over mij/ons — volledig (eigen pagina)  — Prompt 5
// ---------------------------------------------------------------------------

const OVER_FULL_TOOL = {
  name: 'write_over_full',
  description: 'Schrijf de volledige Over-pagina volgens de gekozen methode.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        description: 'Pagina-titel, max ~8 woorden.',
      },
      intro: {
        type: 'string',
        description:
          'KORT, max 2 zinnen. Hooks de lezer, vat NIET het hele verhaal samen. ' +
          'De volledige inhoud hoort in body.',
      },
      body: {
        type: 'string',
        description:
          'VERPLICHT EN NIET LEEG. De Over-pagina volgens de gekozen methode. ' +
          'HARDE LIMIET: MAXIMAAL 1500 TEKENS (~200-250 woorden). Tel je tekens. ' +
          'Bij overschrijding: schrap de minst essentiële alinea. Bevat alle ' +
          'stappen/paragrafen uit de methode-instructies, in compacte vorm. ' +
          'Geen herhaling van de Home-pagina Over-sectie — focus op nieuwe ' +
          'details, anekdotes, het moment waarop alles begon. Mag GEEN lege ' +
          'string zijn.',
      },
      cta_text: { type: 'string', description: 'Max 5 woorden.' },
    },
    required: ['title', 'intro', 'body', 'cta_text'],
    additionalProperties: false,
  },
};

export interface OverFullOutput {
  title: string;
  intro: string;
  body: string;
  cta_text: string;
}

export async function generateOverFull(ctx: GenContext): Promise<OverFullOutput> {
  const method = ctx.archetype_config.over_method;
  const methodInstructions =
    method === 'origin_story'
      ? `## Methode: Origin Story
Structuur:
1. Achtergrond — leven/werk voor het keerpunt
2. Het moment — life changing event, beeldend beschreven
3. Daardoor — wat werd in gang gezet
4. Obstakels — uitdagingen overwonnen
5. Keerpunt — het moment van keuze
6. Nu — wat je nu doet, verbonden met het verhaal`
      : method === 'faq'
        ? `## Methode: FAQ
Beantwoord in samenhangende paragrafen: Why/How/What, waarom gestart, expertise/achtergrond, persoonlijke achtergrond/hobby's.`
        : `## Methode: Team Overzicht
Per teamlid: naam, functie, specialiteiten, persoonlijke beschrijving (1 alinea per persoon).`;

  const system = `
Je schrijft de Over-pagina. Doel: VERTROUWEN creëren. De WHY is belangrijker
dan de WAT.

## UNIEK VERHAAL — NIET HERHALEN WAT OP HOME STAAT
De Over-pagina mag NIET dezelfde informatie herhalen die al op de Home-pagina
staat. De Home "Over (kort)" sectie geeft een samenvatting. De Over-pagina
vertelt het UITGEBREIDE verhaal met details die niet op Home staan:
persoonlijke anekdotes, het moment waarop alles begon, de eerste klant, een
specifieke herinnering. Maak het concreet en menselijk, geen herhaling van de
samenvatting.

## Veldverdeling — STRIKT (cruciaal)
De write_over_full tool heeft 4 velden. Vul ALLE vier — vooral body is verplicht:
- title: korte pagina-titel, max ~8 woorden. UNIEK voor deze pagina, niet
  dezelfde als een andere pagina.
- intro: maximaal 2 zinnen die de lezer binnenhalen. Géén samenvatting van het
  hele verhaal.
- body: het VOLLEDIGE verhaal volgens de methode-structuur hieronder.
  HARDE LIMIET: MAXIMAAL 1500 TEKENS (ongeveer 200-250 woorden). Niet 2000,
  niet 1800 — maximaal 1500. Tel je tekens terwijl je schrijft. Kom je boven
  de 1500 uit, schrap dan de minst essentiële alinea (vaak de obstakels of
  een herhaling van waarden) en behoud begin, keerpunt en nu. Een te lange
  body wordt afgekeurd. Dit veld mag NOOIT leeg zijn — als de body leeg blijft,
  faalt de generatie. Liever een kortere body dan helemaal geen body.
- cta_text: max 5 woorden. Persoonlijk en pagina-specifiek (bijv. "Leer
  [naam] kennen", "Lees het verhaal"). Niet de website-brede primaire CTA.

Veel voorkomende fout: de methode-structuur in intro proppen en body leeg
laten. Doe dat niet. Het hele methode-verhaal hoort in body — beknopt.

${methodInstructions}

${accuracyBlock(ctx)}

${styleBlock(ctx, { isFullPage: true })}
`.trim();

  const user = `
## Bedrijf
${ctx.business_name ?? '(naam onbekend)'}

## Wie ben je en wat doe je
${ans(ctx, 'p1q1', 'p1q2', 'p1q3')}

## Origin story
${ans(ctx, 'p6q1', 'p6q2', 'p6q3', 'p6q4')}

## Waarden en differentiator
${ans(ctx, 'p6q5', 'p6q6', 'p7q5', 'p7q6')}
`.trim();

  const result = await callTool<OverFullOutput>({
    systemPrompt: system,
    messages: [{ role: 'user', content: user }],
    tool: OVER_FULL_TOOL,
    maxTokens: 1024,
    purpose: 'content/over-full',
  });

  // Defensive: AI sometimes returns an empty body even though the prompt
  // requires it. If we got back an empty/very-short body, retry ONCE with
  // an extra reminder. This used to leave production projects with
  // titled-but-empty Over pages.
  const bodyTooShort = !result.body || result.body.trim().length < 200;
  if (bodyTooShort) {
    console.warn(
      `[content/over-full] empty body returned (length=${result.body?.length ?? 0}); retrying once with explicit reminder`
    );
    const retry = await callTool<OverFullOutput>({
      systemPrompt: system,
      messages: [
        { role: 'user', content: user },
        {
          role: 'assistant',
          content:
            'Vorige poging gaf een lege body. Ik schrijf nu een complete body ' +
            'van 300-600 woorden volgens de methode-structuur.',
        },
        {
          role: 'user',
          content:
            'Ja, geef nu het volledige verhaal in het body-veld. Body MAG NIET leeg ' +
            'zijn — vul het met het volledige verhaal volgens de methode, ook al moet ' +
            'je improviseren waar interview-antwoorden ontbreken.',
        },
      ],
      tool: OVER_FULL_TOOL,
      maxTokens: 1024,
      purpose: 'content/over-full-retry',
    });
    if (retry.body && retry.body.trim().length > 100) {
      return retry;
    }
    console.error(
      `[content/over-full] retry still produced empty body (length=${retry.body?.length ?? 0})`
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// 4. Diensten / Producten  — Prompt 6
// ---------------------------------------------------------------------------

const SERVICES_TOOL = {
  name: 'write_services',
  description: 'Schrijf de diensten/producten sectie.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string', description: 'Sectietitel. Bijv. "Onze diensten" of "Zo kan ik je helpen".' },
      intro: { type: 'string', description: 'Korte intro, 1-2 zinnen.' },
      services: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Naam van de dienst/product.' },
            subtitle: { type: 'string', description: 'Max 15 woorden, concreter wat het is.' },
            description: {
              type: 'string',
              description: '40-60 woorden voor homepage, 80-130 voor volledige pagina.',
            },
            cta_text: {
              type: 'string',
              description:
                'Op de homepage: zachte info-CTA zoals "Meer over dit traject" of "Lees verder". Op de verdiepingspagina: actie-CTA passend bij de primaire CTA. Max 5 woorden.',
            },
          },
          required: ['title', 'subtitle', 'description', 'cta_text'],
          additionalProperties: false,
        },
      },
      section_footer_cta_text: {
        type: 'string',
        description:
          'CTA-tekst onderaan de sectie die naar de volledige diensten-pagina leidt. Bijv. "Bekijk volledig aanbod" of "Bekijk alle diensten". Alleen voor de homepage; op de verdiepingspagina laat je deze leeg.',
      },
    },
    required: ['title', 'intro', 'services', 'section_footer_cta_text'],
    additionalProperties: false,
  },
};

export interface ServiceItem {
  title: string;
  subtitle: string;
  description: string;
  cta_text: string;
}

export interface ServicesOutput {
  title: string;
  intro: string;
  services: ServiceItem[];
  section_footer_cta_text: string;
}

export async function generateServices(
  ctx: GenContext,
  options: { count: number; isFullPage?: boolean }
): Promise<ServicesOutput> {
  const styleByArchetype: Record<Archetype, string> = {
    service_zzp:
      '"Herken je dit? ... Na dit traject ..." Begin met herkenning, eindig met resultaat.',
    lokale_ambacht:
      'Concrete situatie + actie. Bijv. "Lekkage? Wij zijn binnen 30 min ter plaatse."',
    visueel_portfolio:
      'Beschrijf het resultaat / de ervaring. Bijv. "Een complete reportage van jullie dag..."',
    horeca:
      'Sensorisch / sfeervol. Bijv. "Onze chef bereidt elke dag verse pasta..."',
    webshop:
      'Productvoordelen + waarom kopen. Geen pure beschrijving, maar de WHY.',
    boeking_gedreven:
      'Behandeling + resultaat. Bijv. "30 minuten transformatie."',
  };

  const system = `
Je schrijft de diensten/producten sectie volgens het Fullfront hulpdocument.

## STRIKTE REGEL — verzin geen diensten
Werk UITSLUITEND met de diensten die de ondernemer in het interview noemde.
Verzin geen extra diensten, ook niet als het er minder zijn dan ${options.count}.
Het werkelijke aantal beschreven diensten gaat ALTIJD boven de service_count
uit de config — beschrijf alleen wat de ondernemer echt heeft toegelicht.
${
  options.isFullPage
    ? 'Gebruik ALLE diensten die de ondernemer noemde, niet meer en niet minder.'
    : `Toon maximaal ${options.count} diensten. Als de ondernemer er minder noemde, toon alleen die.`
}
Thema's of stijlen die binnen een bestaande dienst vallen zijn GEEN aparte
dienst. Twijfel je? Dan is het geen aparte dienst.

## PRIJZEN
show_pricing = ${ctx.archetype_config.show_pricing ? 'true' : 'false'}.
${
  ctx.archetype_config.show_pricing
    ? `Als de ondernemer een concrete prijs of prijsindicatie noemde bij een dienst, ` +
      `verwerk die ALTIJD zichtbaar in de omschrijving (bijv. "Vanaf €39" of "€110 per behandeling"). ` +
      `Laat opgegeven prijzen NOOIT weg. Ontbreekt de prijs voor een dienst terwijl ` +
      `show_pricing true is, gebruik dan letterlijk "[INVULLEN: prijs vanaf]" — ` +
      `niet "vraag naar onze prijzen" of "in overleg" als verhullend trucje.`
    : `Prijzen worden niet getoond op deze website. Laat prijzen uit de omschrijving weg.`
}

## Stijl per item (archetype: ${ctx.archetype})
${styleByArchetype[ctx.archetype]}

## Regels per item
- Titel = naam van de dienst/product, zoals de ondernemer hem noemde
- Subtitel = max 15 woorden, concreter wat het is
- Omschrijving = ${options.isFullPage ? '80-130 woorden' : '40-60 woorden'}, per archetype-stijl
- CTA = max 5 woorden, past bij de gebruiks-context (homepage soft, pagina meer richting actie)

## Item-CTA's — VARIEER (op verdiepingspagina, ABSOLUUT cruciaal)
${
  options.isFullPage
    ? 'Op de verdiepingspagina krijgt elk item een cta_text. De CTA-teksten ' +
      'MOETEN onderling ALLEMAAL VERSCHILLEND zijn — niet één paar gelijke, ' +
      'niet drie gelijke, ALLEMAAL uniek per item. ' +
      'Kies per item uit een mix als: "Boek een afspraak", "Plan een ' +
      'kennismaking", "Neem contact op", "Meer weten?", "Bekijk de details", ' +
      '"Vraag een offerte aan", "Plan deze behandeling", "Bekijk dit pakket", ' +
      '"Reserveer een plek". ' +
      'DRIE IDENTIEKE CTA-TEKSTEN ONDER ELKAAR IS EEN FOUT. ' +
      'VIER IDENTIEKE CTA-TEKSTEN IS EEN GROVERE FOUT. ' +
      'Voordat je de tool aanroept: controleer je service-CTA-teksten. Staan er twee ' +
      'of meer hetzelfde? Pas dan minstens één aan voordat je verstuurt.'
    : 'Op de homepage gebruik je een zachte info-CTA per item ("Meer over dit ' +
      'traject", "Lees verder"). Verschillende items mogen hier varianten hebben.'
}

## SECTIE-TITEL — uniek per pagina (cruciaal)
${
  options.isFullPage
    ? 'Dit is de diensten-VERDIEPINGSPAGINA (Behandelingen, Diensten, Pakketten, ' +
      'Aanbod, Portfolio, etc.). De sectie-titel MOET specifiek zijn voor het ' +
      'aanbod van dit bedrijf en MAG NIET dezelfde zijn als de diensten-titel op ' +
      'de homepage. Voorbeelden: "Behandelingen en prijzen", "Alle wandelingen ' +
      'op een rij", "Onze diensten in detail", "Wat ik allemaal aanbied". ' +
      'Gebruik NOOIT "Zo kan ik je helpen" of een andere generieke kop die ook op ' +
      'de homepage zou kunnen staan.'
    : 'Dit is de homepage-versie van de diensten-sectie. Een korte, ' +
      'herkenbare titel volstaat ("Zo kan ik je helpen", "Onze diensten"). De ' +
      'verdiepingspagina krijgt een andere, specifiekere titel.'
}

${accuracyBlock(ctx)}

${styleBlock(ctx, { isFullPage: options.isFullPage })}
`.trim();

  const user = `
## Diensten van dit bedrijf (uit het interview, per dienst)
${servicesBlock(ctx)}

## Doelgroep + probleem dat ze oplossen
${ans(ctx, 'p1q4', 'p1q5', 'p2q1', 'p2q5')}

## Wat verandert er voor klanten
${ans(ctx, 'p5q5')}
`.trim();

  return callTool<ServicesOutput>({
    systemPrompt: system,
    messages: [{ role: 'user', content: user }],
    tool: SERVICES_TOOL,
    maxTokens: 2048,
    purpose: 'content/services',
  });
}

// ---------------------------------------------------------------------------
// 5. Ervaringen / reviews  — Prompt 7
// ---------------------------------------------------------------------------

const TESTIMONIALS_TOOL = {
  name: 'write_testimonials',
  description: 'Schrijf de ervaringen/reviews sectie.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        description: 'Bijv. "Wat klanten zeggen", "Ervaringen", "Projecten".',
      },
      intro: { type: 'string', description: '30-50 woorden.' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description:
                'VERPLICHT. Korte koptekst (3-7 woorden) die de transformatie of kern van de ervaring vat. Bijv. "Van ziekmelding naar regie".',
            },
            subtitle: {
              type: 'string',
              description:
                'VERPLICHT — naam + context. Bijv. "Lisa, 38 jaar" of "Teamleider, Amsterdam". Nooit leeg.',
            },
            quote: {
              type: 'string',
              description: 'De testimonial in de eerste persoon (40-80 woorden homepage / 80-120 verdiepingspagina).',
            },
            cta_text: {
              type: 'string',
              description:
                'Alleen op de verdiepingspagina, dan in lijn met de primaire CTA. Op de homepage NIET tonen — laat dan leeg.',
            },
          },
          required: ['title', 'subtitle', 'quote', 'cta_text'],
          additionalProperties: false,
        },
      },
      section_footer_cta_text: {
        type: 'string',
        description:
          'CTA-tekst onderaan de sectie die naar de volledige ervaringen-pagina leidt. Bijv. "Bekijk alle ervaringen". Alleen op de homepage; op de verdiepingspagina laat je deze leeg.',
      },
    },
    required: ['title', 'intro', 'items', 'section_footer_cta_text'],
    additionalProperties: false,
  },
};

export interface TestimonialItem {
  title: string;
  subtitle: string;
  quote: string;
  cta_text: string;
}
export interface TestimonialsOutput {
  title: string;
  intro: string;
  items: TestimonialItem[];
  section_footer_cta_text: string;
}

export async function generateTestimonials(
  ctx: GenContext,
  options: { count: number; isFullPage?: boolean }
): Promise<TestimonialsOutput> {
  const styleByArchetype: Record<Archetype, string> = {
    service_zzp: 'Transformatie-quotes (van problem naar resultaat).',
    lokale_ambacht: 'Korte, krachtige reviews. Concreet en feitelijk.',
    visueel_portfolio: 'Projectbeschrijving + klantquote.',
    horeca: 'Gastreviews over sfeer, eten, gastvrijheid.',
    webshop: 'Productervaringen, vaak met sterren.',
    boeking_gedreven: 'Before/after + klantquote.',
  };

  const system = `
Je schrijft de ervaringen/reviews/portfolio sectie.

## Aantal items
${options.count} items.

## Intro-lengte
${
  options.isFullPage
    ? 'Dit is de volledige ervaringen-pagina. De intro is LANGER en RIJKER dan ' +
      'op de homepage: 3-4 zinnen. Vertel waarom klantervaringen belangrijk zijn ' +
      'voor dít specifieke bedrijf, geef context bij wat lezers gaan vinden. ' +
      'Dit is een uitzondering op de algemene "intro max 2 zinnen" regel.'
    : 'Dit is de homepage-versie van de ervaringen-sectie. Intro = 1-2 zinnen, ' +
      'kort en uitnodigend. De diepere intro hoort op de volledige ervaringen-pagina.'
}

## Sectie-titel — UNIEK PER PAGINA (cruciaal)
${
  options.isFullPage
    ? 'Dit is de Ervaringen-PAGINA. De titel MOET ANDERS zijn dan de titel die ' +
      'op de homepage boven de ervaringen-sectie staat. De homepage gebruikt ' +
      'meestal iets als "Wat klanten zeggen" of "Ervaringen"; kies hier een ' +
      'titel die bij de PAGINA past en het bedrijf concreet maakt. Voorbeelden: ' +
      '"Ervaringen van onze klanten", "Verhalen van stellen die voor ons kozen", ' +
      '"Zo kijken klanten terug op onze samenwerking". NOOIT exact dezelfde ' +
      'tekst als op de homepage.'
    : 'Dit is de homepage-sectie. Houd de titel kort en herkenbaar ("Wat ' +
      'klanten zeggen", "Ervaringen"). De Ervaringen-pagina krijgt een andere, ' +
      'pagina-specifieke titel.'
}

## Item-CTA's — VARIEER (op verdiepingspagina, ABSOLUUT cruciaal)
${
  options.isFullPage
    ? 'Op de verdiepingspagina krijgt elk item een cta_text. De CTA-teksten ' +
      'MOETEN onderling ALLEMAAL VERSCHILLEND zijn — niet één paar gelijke, ' +
      'niet drie gelijke, ALLEMAAL uniek per item. Kies per item uit een mix ' +
      'als: "Plan een kennismaking", "Boek een afspraak", "Bekijk dit pakket", ' +
      '"Vraag het programma op", "Lees het hele verhaal", "Neem contact op", ' +
      '"Ontdek de werkwijze", "Meer weten?". ' +
      'DRIE IDENTIEKE CTA-TEKSTEN ONDER ELKAAR IS EEN FOUT. ' +
      'ZES IDENTIEKE CTA-TEKSTEN IS GROVE NALATIGHEID. ' +
      'Voordat je de tool aanroept: kijk je item-CTAs door. Staan er twee of meer ' +
      'hetzelfde? Pas dan minstens één aan voordat je verstuurt.'
    : 'Op de homepage laat je item cta_text leeg.'
}

## Stijl per item (archetype: ${ctx.archetype})
${styleByArchetype[ctx.archetype]}

## TESTIMONIALS — STRIKTE POLICY (cruciaal)

Genereer ALLEEN testimonials op basis van quotes, verhalen of voorbeelden
die de ondernemer zelf in het interview heeft aangeleverd.

Verzin NOOIT:
- Klantnamen (geen Lisa, Sophie, Mark, Sandra, etc. uit eigen koker)
- Leeftijden ("38 jaar", "begin vijftig")
- Beroepen of woonplaatsen die niet in het interview stonden
- Quotes ("Ze waren super behulpzaam...")

### Hoe je items vult per geval

Er zijn vier soorten klantverhalen die je in het interview kunt aantreffen.
Kies per item zorgvuldig de juiste case — het verschil tussen A en A½ is
cruciaal en wordt vaak fout gedaan.

CASE A — Ondernemer leverde een LETTERLIJKE QUOTE van de klant.
Herkenbaar aan aanhalingstekens of formuleringen als "de klant zei...",
"hij schreef me...", "ze stuurde een berichtje:...". Gebruik de quote
exact (of bijna exact, alleen kleine taalcorrecties). Behoud naam en
context zoals genoemd. Eén quote = één item.

CASE A½ — Ondernemer BESCHRIJFT een klantverhaal maar geeft GEEN
letterlijke quote.
Bijv. "een vaste klant uit Utrecht, zorgmedewerker, was eerder bij een
keten en altijd ontevreden, komt nu om de tien weken bij mij". Dit is
GEEN quote — het is een beschrijving in de woorden van de ondernemer.
Vul dan in:

- title: korte koptekst die de transformatie of kern vat. Geen
  aanhalingstekens, geen first-person formulering.
- subtitle: de klant-context zoals beschreven door de ondernemer, in
  DERDE PERSOON (bijv. "Vaste klant, zorgmedewerker uit Utrecht"). Dit is
  veilig want het komt rechtstreeks uit het interview.
- quote: VERPLICHT een placeholder, OOK als je het verhaal kent:
  "[INVULLEN: vraag deze klant om een eigen quote van ${options.isFullPage ? '80-120' : '40-80'}
  woorden over haar ervaring. Context: ${'<1 zin samenvatting uit het interview>'}]"

CASE A½ is een placeholder-case voor de quote. Het verschil met CASE B is
alleen dat je voor de subtitle wél echte context hebt — de quote zelf
blijft altijd een placeholder.

ABSOLUUT VERBODEN bij CASE A½:
- First-person quotes ("Ik ging jarenlang naar...", "Ik was zo blij...").
- Third-person navertellingen die je tussen aanhalingstekens zet of als
  quote-veld vult. Een navertelling hoort in subtitle, niet in quote.
- Per pagina een andere formulering kiezen (op Home third person, op de
  ervaringen-pagina first person). Kies één case-classificatie per casus
  en pas die identiek toe op alle pagina's waar de testimonial verschijnt.

CASE B — Ondernemer noemde wel klanten / aantallen / sterren maar geen
specifieke casus of quote.
Gebruik dat aantal of sterren in de intro, en zet voor elk item:
- title: korte placeholder, bijv. "Ervaring 1"
- subtitle: "[INVULLEN: naam + context, bijv. Lisa, 38 jaar of Teamleider in Amsterdam]"
- quote: "[INVULLEN: echte klantquote — vraag een vaste klant om een review
  van ${options.isFullPage ? '80-120' : '40-80'} woorden]"

CASE C — Ondernemer zei "nee" / "nog geen klantverhalen" / "ik ben net begonnen".
Vul de hele set als placeholders zoals in CASE B, met intro:
"De eerste klantervaringen volgen binnenkort." Voeg deze notitie als
title van het EERSTE item toe:
"[NOTITIE VOOR ONDERNEMER: Vul hier echte klantervaringen in. Verzonnen
reviews zijn juridisch en reputationeel riskant.]"

### Ankerregel voor quotes — STRIKT
Schrijf NOOIT een first-person quote tenzij de ondernemer die specifieke
woorden LETTERLIJK heeft aangeleverd als woorden van de klant. Een
beschrijving door de ondernemer ("ze was nooit blij in een keten") is
GEEN quote — die hoort onder CASE A½ met een placeholder voor de quote.
"Geïnspireerd op een echte casus" rechtvaardigt niet dat je iets tussen
aanhalingstekens zet.

### Quote-lengte
${options.isFullPage ? '80-120 woorden per echte quote' : '40-80 woorden per echte quote'}.
Placeholders blijven kort — alleen de invul-instructie tussen [INVULLEN: ...].

### Consistentie tussen pagina's
Eén set klantverhalen telt voor de hele website. Gebruik EXACT dezelfde
namen en quotes overal waar testimonials voorkomen. Verzin niet per
pagina nieuwe varianten.

${accuracyBlock(ctx)}

${styleBlock(ctx, { isFullPage: options.isFullPage })}
`.trim();

  const user = `
## Klant-cases en ervaringen uit het interview
${ans(ctx, 'p5q1', 'p5q2', 'p5q3', 'p5q4', 'p5q5', 'p5q6', 'p5q7')}

## Doelgroep voor context
${ans(ctx, 'p1q4', 'p1q5')}
`.trim();

  return callTool<TestimonialsOutput>({
    systemPrompt: system,
    messages: [{ role: 'user', content: user }],
    tool: TESTIMONIALS_TOOL,
    maxTokens: 2048,
    purpose: 'content/testimonials',
  });
}

// ---------------------------------------------------------------------------
// 6. Opt-in (alleen als relevant)  — Prompt 8
// ---------------------------------------------------------------------------

const OPTIN_TOOL = {
  name: 'write_optin',
  description: 'Schrijf de opt-in / lead magnet sectie.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string', description: 'Killer koptekst.' },
      subtitle: { type: 'string', description: 'Wat krijgt de bezoeker? 20-40 woorden.' },
      cta_text: { type: 'string', description: 'Max 4 woorden.' },
    },
    required: ['title', 'subtitle', 'cta_text'],
    additionalProperties: false,
  },
};

export interface OptInOutput {
  title: string;
  subtitle: string;
  cta_text: string;
}

export async function generateOptIn(ctx: GenContext): Promise<OptInOutput> {
  const system = `
Je schrijft een opt-in / lead-magnet sectie.

## TITEL — kies een KILLER koptekst, geen flauwe samenvatting
Pak de aandacht via één van deze formules. Wees concreet, niet algemeen:

- How-To: "Hoe je [resultaat] zonder [obstakel]"
  Voorbeeld: "Hoe je herstelt van burn-out zonder je carrière op te geven"
- Opsomming: "[N] [signalen/manieren/redenen] [voor/om] [resultaat]"
  Voorbeeld: "5 signalen dat je op een burn-out afstevent"
- Vraag: pakkende vraag waar de doelgroep zich in herkent
  Voorbeeld: "Loop jij ook op je tandvlees?"
- Hoe Zonder: "Hoe [doelgroep] [resultaat] zonder [probleem]"
  Voorbeeld: "Hoe ondernemers grip krijgen op hun cijfers zonder boekhoud-stress"

Als de ondernemer al een naam voor het e-book/checklist gaf, gebruik
die als basis maar maak hem scherper volgens een formule. Een
beschrijvende titel ("E-book over burn-out") is GEEN killer koptekst.

## CTA
Specifiek voor lead-magnets: "Download nu", "Verkrijg toegang",
"Stuur 'm op", "Meld je aan". NIET de website-brede primaire CTA.

${accuracyBlock(ctx)}

${styleBlock(ctx)}
`.trim();

  const user = `
## Doelgroep en probleem (gebruik dit als basis voor de opt-in)
${ans(ctx, 'p1q3', 'p1q4', 'p1q5', 'p2q1', 'p2q5', 'p2q7')}

## Mission en resultaat
${ans(ctx, 'p7q1', 'p5q5')}
`.trim();

  return callTool<OptInOutput>({
    systemPrompt: system,
    messages: [{ role: 'user', content: user }],
    tool: OPTIN_TOOL,
    maxTokens: 384,
    purpose: 'content/optin',
  });
}

// ---------------------------------------------------------------------------
// 7. Footer  — Prompt 9
// ---------------------------------------------------------------------------

const FOOTER_TOOL = {
  name: 'write_footer',
  description: 'Schrijf de footer bedrijfsomschrijving.',
  input_schema: {
    type: 'object' as const,
    properties: {
      description: {
        type: 'string',
        description:
          'Max 30 woorden. Format: "[Bedrijfsnaam], [wat je doet] in [regio]" of "[Specialist] voor [doelgroep] in [regio]".',
      },
    },
    required: ['description'],
    additionalProperties: false,
  },
};

export interface FooterOutput {
  description: string;
}

export async function generateFooter(ctx: GenContext): Promise<FooterOutput> {
  const system = `
Je schrijft de footer-bedrijfsomschrijving (max 30 woorden).
Eén compacte zin die zegt: wie ben je, wat doe je, voor wie, in welke regio.

${accuracyBlock(ctx)}

${styleBlock(ctx)}
`.trim();

  const user = `
## Bedrijf
${ctx.business_name ?? '(naam onbekend)'}

## Wat het bedrijf doet en voor wie
${ans(ctx, 'p1q1', 'p1q3', 'p1q4')}
`.trim();

  return callTool<FooterOutput>({
    systemPrompt: system,
    messages: [{ role: 'user', content: user }],
    tool: FOOTER_TOOL,
    maxTokens: 256,
    purpose: 'content/footer',
  });
}

// ---------------------------------------------------------------------------
// 8. Contact pagina  — Prompt 10
// ---------------------------------------------------------------------------

const CONTACT_TOOL = {
  name: 'write_contact',
  description: 'Schrijf de teksten voor de contactpagina.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string' },
      intro: { type: 'string', description: '20-40 woorden, uitnodigend.' },
      form_trigger: {
        type: 'string',
        description: 'Bijv. "Stel hier je vraag" of "Stuur ons een bericht".',
      },
      confirmation_message: {
        type: 'string',
        description: 'Bevestigingsbericht na verzenden formulier.',
      },
      form_fields: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Lijst van benodigde formuliervelden voor dit archetype, in NL.',
      },
    },
    required: ['title', 'intro', 'form_trigger', 'confirmation_message', 'form_fields'],
    additionalProperties: false,
  },
};

export interface ContactOutput {
  title: string;
  intro: string;
  form_trigger: string;
  confirmation_message: string;
  form_fields: string[];
}

export async function generateContactPage(ctx: GenContext): Promise<ContactOutput> {
  const titles: Record<Archetype, string> = {
    service_zzp: '"Laten we kennismaken"',
    lokale_ambacht: '"Direct contact"',
    visueel_portfolio: '"Neem contact op"',
    horeca: '"Contact & Reserveren"',
    webshop: '"Klantenservice"',
    boeking_gedreven: '"Contact"',
  };
  const intros: Record<Archetype, string> = {
    service_zzp: 'Vrijblijvende kennismaking benadrukken.',
    lokale_ambacht: 'Snelle responstijd benadrukken; telefoon prominent.',
    visueel_portfolio: 'Uitnodigend, persoonlijk.',
    horeca: 'Meerdere contactmogelijkheden bieden (reserveren, bellen).',
    webshop: 'Servicegericht; openingstijden van klantenservice.',
    boeking_gedreven: 'Direct, met verwijzing naar online boeken.',
  };
  const fieldsByArchetype: Record<Archetype, string[]> = {
    service_zzp: ['Naam', 'E-mail', 'Waar kan ik je mee helpen?'],
    lokale_ambacht: ['Naam', 'Telefoon (verplicht)', 'Omschrijving probleem', 'Foto upload (optioneel)'],
    visueel_portfolio: ['Naam', 'E-mail', 'Type project', 'Datum/periode', 'Bericht'],
    horeca: ['Naam', 'E-mail', 'Telefoon', 'Bericht'],
    webshop: ['Naam', 'E-mail', 'Bestelnummer (optioneel)', 'Bericht'],
    boeking_gedreven: ['Naam', 'Telefoon', 'Bericht'],
  };

  const system = `
Je schrijft de teksten voor de contactpagina.

## Intro-lengte — uitzondering op de algemene regel
Op de contactpagina mag de intro 2-3 zinnen zijn (i.p.v. de standaard max 2).
Een goede contact-intro combineert context + uitnodiging + actie en heeft
daarvoor vaak één extra zin nodig. Houd het wel kort en spreektaal.

## Titel-suggestie voor archetype ${ctx.archetype}
${titles[ctx.archetype]} — pas aan als beter past.

## Focus van de intro voor dit archetype
${intros[ctx.archetype]}

## Standaard formuliervelden voor dit archetype
${fieldsByArchetype[ctx.archetype].join(', ')}
Pas aan op basis van het interview als nodig (bijv. type contactvoorkeur uit q10).

${accuracyBlock(ctx)}

${styleBlock(ctx, { isFullPage: true })}
`.trim();

  const user = `
## Bedrijf
${ctx.business_name ?? '(naam onbekend)'}

## Contact-flow uit interview
${ans(ctx, 'p10q1', 'p10q2', 'p10q3', 'p10q4', 'p10q5')}

## Klantproces (achtergrond)
${ans(ctx, 'p3q3')}

## Contactgegevens (NAW + zichtbaarheid)
${ans(ctx, 'p10q6', 'p10q7')}
`.trim();

  return callTool<ContactOutput>({
    systemPrompt: system,
    messages: [{ role: 'user', content: user }],
    tool: CONTACT_TOOL,
    maxTokens: 1024,
    purpose: 'content/contact',
  });
}

// ---------------------------------------------------------------------------
// 9. Blog pagina  — Prompt 11
// ---------------------------------------------------------------------------

const BLOG_TOOL = {
  name: 'write_blog',
  description: 'Schrijf de teksten voor de blog overzichtspagina.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        description: 'Bijv. "Blog", "Kennisbank", "Inspiratie", "Inzichten", "Verhalen".',
      },
      intro: { type: 'string', description: '20-30 woorden.' },
      author_bio: {
        type: 'string',
        description: '40-50 woorden voor de zijbalk: wie, wat, waarom schrijft diegene hierover. Niet korter dan 40.',
      },
    },
    required: ['title', 'intro', 'author_bio'],
    additionalProperties: false,
  },
};

export interface BlogOutput {
  title: string;
  intro: string;
  author_bio: string;
}

export async function generateBlogPage(ctx: GenContext): Promise<BlogOutput> {
  const system = `
Je schrijft de teksten voor de blog overzichtspagina.
Weinig tekst nodig: blogposts zelf vullen de pagina. Focus op een goede
intro en een zijbalk-bio van 40-50 woorden (niet korter).

${accuracyBlock(ctx)}

${styleBlock(ctx, { isFullPage: true })}
`.trim();

  const user = `
## Bedrijf en auteur
${ctx.business_name ?? '(naam onbekend)'}
${ans(ctx, 'p1q1', 'p1q2', 'p1q3', 'p6q1', 'p6q3', 'p6q5', 'p7q1')}

## Blog-onderwerpen (alleen aanwezig als gebruiker DEEL 9 heeft beantwoord)
${ans(ctx, 'p9q1', 'p9q2', 'p9q3', 'p9q5')}
`.trim();

  return callTool<BlogOutput>({
    systemPrompt: system,
    messages: [{ role: 'user', content: user }],
    tool: BLOG_TOOL,
    maxTokens: 512,
    purpose: 'content/blog',
  });
}

// ---------------------------------------------------------------------------
// 10. FAQ pagina (ook gebruikt voor Klantenservice bij webshops)
// ---------------------------------------------------------------------------

const FAQ_TOOL = {
  name: 'write_faq',
  description: 'Schrijf de FAQ-pagina (of Klantenservice voor webshop).',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string' },
      intro: { type: 'string', description: '20-40 woorden, kort en duidelijk.' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string', description: 'De vraag, zoals een klant hem zou stellen.' },
            answer: { type: 'string', description: 'Het antwoord, 40-100 woorden, helder en concreet.' },
          },
          required: ['question', 'answer'],
          additionalProperties: false,
        },
      },
    },
    required: ['title', 'intro', 'items'],
    additionalProperties: false,
  },
};

export interface FaqItem {
  question: string;
  answer: string;
}
export interface FaqOutput {
  title: string;
  intro: string;
  items: FaqItem[];
}

export async function generateFaqPage(ctx: GenContext): Promise<FaqOutput> {
  const topicsByArchetype: Record<Archetype, string> = {
    service_zzp:
      'Werkwijze, wat te verwachten van een traject, kosten, kennismaking, locatie/online, vergoeding en tijdsduur.',
    lokale_ambacht:
      'Werkwijze, tarieven en voorrijkosten, spoed, garantie, regio, betaling.',
    visueel_portfolio:
      'Pakketten, vooruitbetaling, eigendom van foto\'s, planning, bestand-levering.',
    horeca:
      'Reserveren, dieetwensen, allergenen, kindvriendelijkheid, parkeren, openingstijden.',
    webshop:
      'Verzending (kosten, snelheid, internationaal), retourneren, betalen, garantie, account, klachten.',
    boeking_gedreven:
      'Annuleringsbeleid, te laat komen, afspraak verzetten, cadeaubonnen, abonnementen, wachtlijst.',
  };

  const titleSuggest =
    ctx.archetype === 'webshop'
      ? '"Klantenservice"'
      : '"Veelgestelde vragen" of een vergelijkbare titel.';

  const system = `
Je schrijft een FAQ-pagina${ctx.archetype === 'webshop' ? ' (Klantenservice voor een webshop)' : ''}.

## Aanpak
Genereer 6-10 realistische, concrete vragen die klanten van dit type bedrijf
daadwerkelijk stellen. Geen generieke vragen ("Wat doen jullie?"). De vragen
moeten oplossingen bieden voor reële drempels.

## Onderwerpen voor dit archetype
${topicsByArchetype[ctx.archetype]}

## Titel
${titleSuggest}

## Antwoorden
- Concreet, geen vaagheid.
- 40-100 woorden per antwoord.
- Eindig waar passend met een verwijzing of CTA.

${accuracyBlock(ctx)}

${styleBlock(ctx, { isFullPage: true })}
`.trim();

  const user = `
## Bedrijf
${ctx.business_name ?? '(naam onbekend)'}

## FAQ-context uit interview (vragen die ondernemer hoort + twijfels)
${ans(ctx, 'p8q1', 'p8q2', 'p8q3', 'p8q4', 'p8q5')}

## Werkwijze + contactproces (handig voor "hoe werkt het"-vragen)
${ans(ctx, 'p3q1', 'p3q3', 'p10q1', 'p10q3', 'p10q5')}

## Diensten (voor pakket/prijs/verzendings-vragen)
${servicesBlock(ctx)}
`.trim();

  return callTool<FaqOutput>({
    systemPrompt: system,
    messages: [{ role: 'user', content: user }],
    tool: FAQ_TOOL,
    maxTokens: 2048,
    purpose: 'content/faq',
  });
}
