/**
 * Interview-framework v2 — bron: docs/interview-framework-v2-compleet.md.
 *
 * Tien delen met ~73 vaste vragen + AI-doorvragen.
 * - DEEL 4 herhaalt 8 vragen per dienst (state machine handelt de loop af).
 * - DEEL 9 is optioneel (alleen als gebruiker een blog wil).
 * - Archetype-specifieke vragen worden NIET als apart blok gesteld; de AI
 *   weeft ze in via de hints per deel (zie `archetype_hints`).
 */

export type Part = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
// Backwards-compat alias for code that still imports Phase.
export type Phase = Part;

export type Archetype =
  | 'service_zzp'
  | 'lokale_ambacht'
  | 'visueel_portfolio'
  | 'horeca'
  | 'webshop'
  | 'boeking_gedreven';

export interface FixedQuestion {
  /** 1-based position within the part (excluding service-loop ordering). */
  index: number;
  text: string;
  goal?: string;
}

export interface PartDef {
  number: Part;
  title: string;
  goal: string;
  /** The fixed questions, in order. For part 4 these form a TEMPLATE that is
   *  repeated per service. */
  questions: FixedQuestion[];
  /** Hints for archetype-specific questions the AI may weave in here. */
  archetype_hints?: Partial<Record<Archetype, string[]>>;
  /** Default doorvraag-cap; overridden in `MAX_FOLLOWUPS_PER_PART` when needed. */
  max_followups: number;
  /** True for DEEL 4 — questions repeat per service. */
  is_per_service?: boolean;
  /** Skippable parts (DEEL 9 if no blog wanted). */
  skippable?: boolean;
}

// Per-part doorvraag caps per spec ("In deel 9 en 10: max 1 doorvraag per vraag").
export const MAX_FOLLOWUPS_PER_PART: Record<Part, number> = {
  1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 1, 10: 1,
};

export const PARTS: Record<Part, PartDef> = {
  1: {
    number: 1,
    title: 'Wat je doet & voor wie',
    goal: 'Fundament + archetype-detectie',
    max_followups: 2,
    questions: [
      { index: 1,  text: 'Kun je in je eigen woorden vertellen wat je doet?' },
      { index: 2,  text: 'Waarom doe je dit werk?' },
      { index: 3,  text: 'Hoe leg je dit uit aan iemand die je nog niet kent?' },
      { index: 4,  text: 'Voor wie doe je dit specifiek?' },
      { index: 5,  text: 'Wie is jouw ideale klant?' },
      { index: 6,  text: 'Wie juist niet?' },
      { index: 7,  text: 'Met wat voor klanten werk je het liefst?' },
      { index: 8,  text: 'Wat maakt deze klanten fijn om mee te werken?' },
      { index: 9,  text: 'Met wat voor klanten liever niet?' },
      { index: 10, text: 'Wat gaat er dan meestal mis?' },
    ],
  },

  2: {
    number: 2,
    title: 'Het probleem van je klant',
    goal: 'Pijnpunten voor hero, diensten-teksten, CTA\'s',
    max_followups: 2,
    questions: [
      { index: 1, text: 'Welke problemen zie je bij klanten voordat ze bij jou komen?' },
      { index: 2, text: 'Hoe uit zich dit probleem in de praktijk?' },
      { index: 3, text: 'Wat hebben ze vaak al geprobeerd?' },
      { index: 4, text: 'Waarom werkte dat niet?' },
      { index: 5, text: 'Wat frustreert hen het meest?' },
      { index: 6, text: 'Wat kost dit hen aan tijd, geld of energie?' },
      { index: 7, text: 'Wat gebeurt er als ze niets doen?' },
    ],
  },

  3: {
    number: 3,
    title: 'Jouw oplossing & werkwijze',
    goal: 'Werkwijze-sectie, USP\'s, overtuiging',
    max_followups: 2,
    archetype_hints: {
      lokale_ambacht: [
        'Bied je spoeddiensten aan? Ben je 24/7 bereikbaar?',
      ],
      boeking_gedreven: [
        'Gebruik je een online boekingssysteem? Welke tool?',
      ],
      service_zzp: [
        'Heb je een specifieke methode of aanpak? Ben je daarin gecertificeerd?',
      ],
      horeca: [
        'Gebruik je een reserveringssysteem?',
      ],
    },
    questions: [
      { index: 1, text: 'Hoe help jij klanten precies?' },
      { index: 2, text: 'Waar begin je altijd mee?' },
      { index: 3, text: 'Hoe ziet een traject of samenwerking eruit?' },
      { index: 4, text: 'Kun je dit stap voor stap uitleggen?' },
      { index: 5, text: 'Wat maakt jouw aanpak anders dan anderen?' },
      { index: 6, text: 'Waarom werkt dit wel?' },
      { index: 7, text: 'Wat zeggen klanten hierover?' },
    ],
  },

  4: {
    number: 4,
    title: 'Diensten of aanbod',
    goal: 'Diensten-teksten (homepage + verdiepingspagina). Vragen herhalen per dienst.',
    max_followups: 2,
    is_per_service: true,
    archetype_hints: {
      visueel_portfolio: [
        'Werk je met vaste pakketten en prijzen?',
      ],
      lokale_ambacht: [
        'Hoe werken je tarieven? Reken je voorrijkosten?',
      ],
      boeking_gedreven: [
        'Wat zijn de prijzen per behandeling?',
      ],
      webshop: [
        'Hoe werken verzending en retouren bij dit product?',
      ],
    },
    questions: [
      { index: 1, text: 'Hoe heet deze dienst en wat houdt die in?' },
      { index: 2, text: 'Waarom heb je deze dienst zo ingericht?' },
      { index: 3, text: 'Voor wie is deze dienst bedoeld?' },
      { index: 4, text: 'In welke situatie zit iemand dan?' },
      { index: 5, text: 'Welk probleem lost deze dienst op?' },
      { index: 6, text: 'Wat verandert er concreet?' },
      { index: 7, text: 'Wat levert het op?' },
      { index: 8, text: 'Wat merkt de klant als eerste?' },
    ],
  },

  5: {
    number: 5,
    title: 'Resultaten & ervaringen',
    goal: 'Testimonials, ervaringen-pagina, social proof',
    max_followups: 2,
    archetype_hints: {
      visueel_portfolio: [
        'Hoeveel projecten wil je tonen? Heb je professionele foto\'s?',
      ],
      lokale_ambacht: [
        'Heb je keurmerken? Bijvoorbeeld VCA, Techniek Nederland, BouwGarant?',
      ],
      service_zzp: [
        'Heb je certificeringen, diploma\'s of lidmaatschappen?',
      ],
      webshop: [
        'Heb je keurmerken? Bijvoorbeeld Thuiswinkel Waarborg of Webshop Keurmerk?',
      ],
    },
    questions: [
      { index: 1, text: 'Kun je een of meerdere klanten beschrijven?' },
      { index: 2, text: 'Hoe kwamen ze bij jou binnen?' },
      { index: 3, text: 'Wat was hun situatie voor de samenwerking?' },
      { index: 4, text: 'Waar liepen ze op vast?' },
      { index: 5, text: 'Wat is er veranderd na de samenwerking?' },
      { index: 6, text: 'Kun je dit concreet maken?' },
      { index: 7, text: 'Heb je cijfers, voorbeelden of quotes die je wilt delen?' },
    ],
  },

  6: {
    number: 6,
    title: 'Jouw verhaal (Over ons)',
    goal: 'Over mij-pagina (Origin Story / FAQ / Team)',
    max_followups: 2,
    questions: [
      { index: 1, text: 'Hoe ben je dit werk gaan doen?' },
      { index: 2, text: 'Wat was de aanleiding?' },
      { index: 3, text: 'Waarom bestaat jouw bedrijf?' },
      { index: 4, text: 'Welk probleem wil je oplossen in de wereld?' },
      { index: 5, text: 'Waar geloof jij sterk in binnen jouw vak?' },
      { index: 6, text: 'Wat doe jij bewust anders?' },
    ],
  },

  7: {
    number: 7,
    title: 'Missie, visie & waarden',
    goal: 'Tone of voice, hero-subtitel, footer, bedrijfsomschrijving',
    max_followups: 2,
    questions: [
      { index: 1, text: 'Wat wil je betekenen voor je klanten?' },
      { index: 2, text: 'Wat moeten ze aan jou overhouden?' },
      { index: 3, text: 'Waar wil je over 5 jaar staan?' },
      { index: 4, text: 'Wat is je grotere ambitie?' },
      { index: 5, text: 'Welke waarden zijn voor jou niet onderhandelbaar?' },
      { index: 6, text: 'Hoe merken klanten dit?' },
    ],
  },

  8: {
    number: 8,
    title: 'Twijfels & veelgestelde vragen',
    goal: 'FAQ-content, bezwaar-wegnemen in diensten-teksten',
    max_followups: 2,
    questions: [
      { index: 1, text: 'Welke vragen krijg je het vaakst van klanten?' },
      { index: 2, text: 'Wanneer stellen ze deze vragen?' },
      { index: 3, text: 'Waar twijfelen mensen over voordat ze instappen?' },
      { index: 4, text: 'Wat stellen ze vaak niet hardop?' },
      { index: 5, text: 'Welke misverstanden bestaan er over jouw werk?' },
    ],
  },

  9: {
    number: 9,
    title: 'Content & expertise',
    goal: 'Blog-onderwerpen (alleen als de gebruiker een blog wil)',
    max_followups: 1,
    skippable: true,
    questions: [
      { index: 1, text: 'Welke vragen beantwoord jij steeds opnieuw?' },
      { index: 2, text: 'Waar gaat veel uitleg in zitten?' },
      { index: 3, text: 'Welke fouten zie je vaak in jouw vakgebied?' },
      { index: 4, text: 'Wat gaat daardoor mis?' },
      { index: 5, text: 'Wat zou je klanten willen meegeven, ook als ze niet met je werken?' },
    ],
  },

  10: {
    number: 10,
    title: 'Contact & praktisch',
    goal: 'Contact-pagina, branding, juridisch, afsluiting',
    max_followups: 1,
    questions: [
      { index: 1,  text: 'Wanneer moeten mensen volgens jou contact opnemen?' },
      { index: 2,  text: 'In welke fase zitten ze dan?' },
      { index: 3,  text: 'Wat gebeurt er als iemand contact opneemt?' },
      { index: 4,  text: 'Hoe ziet dat proces eruit?' },
      { index: 5,  text: 'Wat wil je dat iemand voelt bij het opnemen van contact? Bijvoorbeeld vertrouwen, rust of opluchting.' },
      { index: 6,  text: 'Wat zijn je contactgegevens? Telefoon, e-mail, adres, social media.' },
      { index: 7,  text: 'Wil je dat je telefoonnummer en e-mail zichtbaar zijn op de website?' },
      { index: 8,  text: 'Heb je al een bedrijfsnaam, logo en huisstijlkleuren?' },
      { index: 9,  text: 'Heb je al teksten of content die je wilt hergebruiken?' },
      { index: 10, text: 'Zijn er juridische pagina\'s nodig? Bijvoorbeeld privacyverklaring of algemene voorwaarden.' },
      { index: 11, text: 'Hoe wil je overkomen op je website? Spreek je klanten aan met "je" of "u"?' },
      { index: 12, text: 'Welke pagina\'s wil je op je website?' },
      { index: 13, text: 'Is er nog iets dat je kwijt wilt over je bedrijf of je website?' },
    ],
  },
};

// ---------------------------------------------------------------------------
// Question id helpers
// ---------------------------------------------------------------------------

export const META_BLOG_OPTIN_ID = 'meta_blog_optin';
export const META_BLOG_OPTIN_TEXT =
  'We hebben optioneel een deel over content & blog-onderwerpen. Wil je een blog op je website? Zo ja, dan stel ik daar nog een paar vragen over. Anders gaan we door naar de afsluiting.';

/** True if this id refers to a planned (vs. inserted/follow-up) question. */
export function isPlannedId(id: string): boolean {
  return /^p\d+q\d+$/.test(id) || /^p4_s\d+_q\d+$/.test(id) || /^p4_more_s\d+$/.test(id) || id === META_BLOG_OPTIN_ID;
}

/** Build the question id for a non-part-4 planned question. */
export function plannedId(part: Part, qIndex: number): string {
  return `p${part}q${qIndex}`;
}

/** Build the question id for a part-4 service question. */
export function serviceQuestionId(serviceN: number, qIndex: number): string {
  return `p4_s${serviceN}_q${qIndex}`;
}

export function moreServicesId(serviceN: number): string {
  return `p4_more_s${serviceN}`;
}

/** Lookup planned question by id; returns text + part. */
export function getPlannedQuestion(id: string): { text: string; part: Part; goal?: string } | null {
  const m = id.match(/^p(\d+)q(\d+)$/);
  if (m) {
    const part = Number(m[1]) as Part;
    const qIndex = Number(m[2]);
    const def = PARTS[part];
    if (!def) return null;
    const q = def.questions.find((x) => x.index === qIndex);
    if (!q) return null;
    return { text: q.text, part, goal: q.goal };
  }
  const sm = id.match(/^p4_s(\d+)_q(\d+)$/);
  if (sm) {
    const qIndex = Number(sm[2]);
    const q = PARTS[4].questions.find((x) => x.index === qIndex);
    if (!q) return null;
    return { text: q.text, part: 4, goal: q.goal };
  }
  if (/^p4_more_s\d+$/.test(id)) {
    return {
      text: 'Heb je nog een andere dienst om te bespreken? Zo ja, hoe heet hij en wat houdt hij in? Anders kun je gewoon "nee" antwoorden.',
      part: 4,
    };
  }
  if (id === META_BLOG_OPTIN_ID) {
    return { text: META_BLOG_OPTIN_TEXT, part: 8 };
  }
  return null;
}
