import { callTool } from '../lib/anthropic.js';
import type { Archetype, Part } from '../data/questions.js';

// ---------------------------------------------------------------------------
// Per-turn decision: doorvragen, archetype-extra inserten, skippen, of
// doorgaan naar volgende geplande vraag.
// ---------------------------------------------------------------------------

const INTERVIEW_SYSTEM_PROMPT = `
Je bent een vriendelijke, professionele website-strateeg die een ondernemer
interviewt om informatie te verzamelen voor de teksten op hun website.

## Per beurt
Je krijgt: het deelnummer, de zojuist beantwoorde vraag, eventuele
archetype-hints, en de eerstvolgende geplande vraag. Je kiest één van vier
acties via de respond-tool.

## Acties

### followup
Stel een korte, concrete doorvraag op de zojuist gegeven vraag.
Stel een doorvraag ALLEEN als ten minste één van deze waar is:
- het antwoord is korter dan ~25 woorden EN er ontbreekt een belangrijk detail
- het antwoord is écht vaag of abstract
- het antwoord raakt geen van de doelen van de vraag

GEEN doorvraag als:
- het antwoord >50 woorden is en de hoofdpunten raakt — ook als niet alles
  is afgedekt
- de hint suggereert iets dat al elders genoemd is
- twijfel: kies altijd voor doorgaan

### extra_archetype
Stel EXTRA, een archetype-specifieke vraag (uit de hints) IN PLAATS van de
volgende geplande vraag. De volgende geplande vraag blijft gewoon op de
queue voor de beurt erna. Gebruik dit alleen als de hint een onderwerp
raakt dat NIET in de eerstvolgende geplande vraag al gedekt wordt en dat
voor dit archetype écht relevant is.

### skip_planned
De eerstvolgende geplande vraag is in eerdere antwoorden al beantwoord
(eventueel als doorvraag of in een ander deel). Sla hem dan over en geef
in de acknowledgement aan: "Dit heb je eigenlijk al beantwoord, dan gaan
we door." (of vergelijkbaar). De server slaat dan over naar de volgende
geplande vraag.

### advance
Standaard: ga door naar de volgende geplande vraag. De server gebruikt de
exacte tekst van die vraag; je hoeft hem niet te genereren.

## Stijl
- Acknowledgement: max 10 woorden, warm maar niet overdreven.
  Bijvoorbeeld "Helder.", "Mooi.", "Goed om te weten.", "Dankjewel."
- Doorvraag of extra: één korte concrete vraag, max 20 woorden.
- Spreek de gebruiker aan met "je".
- Schrijf in het Nederlands.
- Praat menselijk. "Funnel" mag (Fullfront-terminologie). Vermijd termen
  als "archetype", "value proposition" of "doelgroep-segment".
- Niet napraten of samenvatten. Geen "Geweldig!" of "Bedankt voor je
  antwoord."

## Output
Gebruik altijd de respond-tool. Geen losse tekst.
`.trim();

const RESPOND_TOOL = {
  name: 'respond',
  description:
    'Beslis of je een doorvraag stelt, een archetype-extra invoegt, de geplande vraag overslaat, of doorgaat.',
  input_schema: {
    type: 'object' as const,
    properties: {
      acknowledgement: {
        type: 'string',
        description: 'Korte bevestiging op het antwoord (max 10 woorden).',
      },
      action: {
        type: 'string',
        enum: ['followup', 'extra_archetype', 'skip_planned', 'advance'],
      },
      followup_question: {
        type: ['string', 'null'],
        description: 'Alleen bij action=followup.',
      },
      extra_question: {
        type: ['string', 'null'],
        description: 'Alleen bij action=extra_archetype.',
      },
    },
    required: ['acknowledgement', 'action', 'followup_question', 'extra_question'],
    additionalProperties: false,
  },
};

export type TurnAction = 'followup' | 'extra_archetype' | 'skip_planned' | 'advance';

export interface InterviewDecision {
  acknowledgement: string;
  action: TurnAction;
  followup_question: string | null;
  extra_question: string | null;
}

export interface PriorTurn {
  role: 'user' | 'assistant';
  text: string;
}

export async function decideInterviewTurn(input: {
  /** Currently active part (the just-answered question's part). */
  part: Part;
  /** The just-answered question text. */
  justAnsweredText: string;
  /** The user's most recent answer. */
  latestAnswer: string;
  /** Recent uitwisseling on the just-answered question (for followup context). */
  recentTurns: PriorTurn[];
  /** Number of doorvragen already asked for the just-answered question. */
  followupsAlreadyAsked: number;
  /** Per-part doorvraag-cap. */
  maxFollowups: number;
  /** The next planned question (after this turn) — server sets the text. */
  nextPlannedText: string | null;
  /** Goal of the next planned question, optional. */
  nextPlannedGoal?: string;
  /** Archetype hints relevant to the current part (may be empty). */
  archetypeHints: string[];
  /** Compact summary of all major answers so far, used for skip-detection. */
  priorAnswersSummary: string;
}): Promise<InterviewDecision> {
  const followupsLeft = input.maxFollowups - input.followupsAlreadyAsked;

  const recentBlock =
    input.recentTurns.length > 0
      ? input.recentTurns.map((t) => `[${t.role}] ${t.text}`).join('\n')
      : '(nog geen uitwisseling op deze vraag)';

  const hintsBlock =
    input.archetypeHints.length > 0
      ? input.archetypeHints.map((h) => `- ${h}`).join('\n')
      : '(geen archetype-hints voor dit deel)';

  const userMessage = `
## Huidig deel
DEEL ${input.part}

## Zojuist beantwoorde vraag
"${input.justAnsweredText}"

## Antwoord van de gebruiker
"${input.latestAnswer}"

## Recente uitwisseling op deze vraag
${recentBlock}

## Doorvragen al gesteld voor deze vraag
${input.followupsAlreadyAsked} van ${input.maxFollowups} max. Resterend: ${followupsLeft}.
${followupsLeft <= 0 ? 'LET OP: max bereikt, action mag NIET "followup" zijn.' : ''}

## Eerstvolgende geplande vraag (door server gekozen)
${input.nextPlannedText ? `"${input.nextPlannedText}"` : '(geen — interview is bijna klaar)'}
${input.nextPlannedGoal ? `Doel: ${input.nextPlannedGoal}` : ''}

## Archetype-hints voor dit deel (mag je verweven via extra_archetype)
${hintsBlock}

## Samenvatting van eerdere antwoorden (voor skip-detectie)
${input.priorAnswersSummary || '(nog niet veel)'}

Beslis nu via de respond-tool.
`.trim();

  const decision = await callTool<InterviewDecision>({
    systemPrompt: INTERVIEW_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
    tool: RESPOND_TOOL,
    maxTokens: 384,
    purpose: 'interview/turn',
  });

  // Belt-and-braces enforcement
  if (followupsLeft <= 0 && decision.action === 'followup') {
    decision.action = 'advance';
    decision.followup_question = null;
  }
  if (decision.action === 'followup' && !decision.followup_question?.trim()) {
    decision.action = 'advance';
  }
  if (decision.action === 'extra_archetype' && !decision.extra_question?.trim()) {
    decision.action = 'advance';
  }
  if (!input.nextPlannedText && decision.action === 'skip_planned') {
    decision.action = 'advance';
  }

  return decision;
}

// ---------------------------------------------------------------------------
// Archetype detection (one call after DEEL 1)
// ---------------------------------------------------------------------------

const ARCHETYPE_SYSTEM_PROMPT = `
Je classificeert het bedrijfstype van een ondernemer op basis van hun
antwoorden in DEEL 1 van het interview.

## Bedrijfstypes (intern gebruikt; toon nooit aan de gebruiker)

1. service_zzp — coach, consultant, trainer, therapeut, accountant, advocaat,
   boekhouder. Lang beslistraject, persoonlijk merk centraal.

2. lokale_ambacht — loodgieter, elektricien, schilder, dakdekker,
   slotenmaker. Hoge urgentie, lokale vindbaarheid.

3. visueel_portfolio — fotograaf, hovenier, interieurdesigner, aannemer
   (projecten), designer.

4. horeca — restaurant, café, lunchroom, bistro, foodtruck, catering.

5. webshop — e-commerce, productverkoop, niche-webshops.

6. boeking_gedreven — kapper, salon, personal trainer, yogastudio,
   dansschool. Online boeken standaard.

## Combinaties
Aannemer = lokale_ambacht (primary) + visueel_portfolio (sub).
Personal trainer = boeking_gedreven (primary) + service_zzp (sub).
Geef altijd een primary; geef alleen een sub als die echt sterk meespeelt.

## Output
Gebruik de classify-tool. Geen losse tekst.
`.trim();

const CLASSIFY_TOOL = {
  name: 'classify',
  description: 'Classificeer het primaire bedrijfstype en eventueel een sub-type.',
  input_schema: {
    type: 'object' as const,
    properties: {
      primary: {
        type: 'string',
        enum: ['service_zzp', 'lokale_ambacht', 'visueel_portfolio', 'horeca', 'webshop', 'boeking_gedreven'],
      },
      sub: {
        type: ['string', 'null'],
        enum: ['service_zzp', 'lokale_ambacht', 'visueel_portfolio', 'horeca', 'webshop', 'boeking_gedreven', null],
      },
      reason: { type: 'string', description: 'Korte motivatie in één zin.' },
    },
    required: ['primary', 'sub', 'reason'],
    additionalProperties: false,
  },
};

export interface ArchetypeClassification {
  primary: Archetype;
  sub: Archetype | null;
  reason: string;
}

export async function classifyArchetype(
  part1Answers: Array<{ question_text: string; answer_text: string }>
): Promise<ArchetypeClassification> {
  const transcript = part1Answers
    .map((a) => `Vraag: ${a.question_text}\nAntwoord: ${a.answer_text}`)
    .join('\n\n');

  return callTool<ArchetypeClassification>({
    systemPrompt: ARCHETYPE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `## DEEL 1 antwoorden\n\n${transcript}\n\nClassificeer via de classify-tool.`,
      },
    ],
    tool: CLASSIFY_TOOL,
    maxTokens: 256,
    purpose: 'interview/archetype',
  });
}

// ---------------------------------------------------------------------------
// Tiny classifiers used by the state machine
// ---------------------------------------------------------------------------

const YES_NO_TOOL = {
  name: 'classify_intent',
  description: 'Bepaal of het antwoord ja of nee betekent.',
  input_schema: {
    type: 'object' as const,
    properties: {
      yes: { type: 'boolean', description: 'true als de gebruiker iets bevestigt of doorgaat; false als ze afwijzen of stoppen.' },
    },
    required: ['yes'],
    additionalProperties: false,
  },
};

export async function classifyMoreServices(answer: string): Promise<boolean> {
  const result = await callTool<{ yes: boolean }>({
    systemPrompt:
      'Je krijgt een antwoord op de vraag "Heb je nog een andere dienst om te bespreken?". ' +
      'Antwoord true als de gebruiker een andere dienst noemt of doorwil, false als ze "nee", "geen", "klaar" of vergelijkbaar antwoorden. Bij twijfel: false.',
    messages: [{ role: 'user', content: `Antwoord: "${answer}"` }],
    tool: YES_NO_TOOL,
    maxTokens: 64,
    purpose: 'interview/yesno-services',
  });
  return result.yes;
}

export async function classifyBlogOptin(answer: string): Promise<boolean> {
  const result = await callTool<{ yes: boolean }>({
    systemPrompt:
      'Je krijgt een antwoord op de vraag "Wil je een blog op je website?". ' +
      'Antwoord true als ze ja zeggen, een blog willen of erover twijfelen-maar-het-erbij-hebben; false als ze "nee", "geen blog", of dergelijk antwoorden. Bij twijfel: false (geen blog).',
    messages: [{ role: 'user', content: `Antwoord: "${answer}"` }],
    tool: YES_NO_TOOL,
    maxTokens: 64,
    purpose: 'interview/yesno-blog',
  });
  return result.yes;
}
