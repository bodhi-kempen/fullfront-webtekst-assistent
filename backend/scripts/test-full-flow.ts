/**
 * End-to-end smoke test for the entire interview → strategy → content flow.
 *
 * Creates a throw-away test user, signs in, runs Eva Fotografie's interview
 * with canned answers, generates strategy, approves it, polls until content
 * generation finishes, and prints all pages.
 *
 * Run from the backend directory:
 *   npx tsx scripts/test-full-flow.ts
 *
 * Env required (loaded from backend/.env):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
 *   API_URL (optional; defaults to http://localhost:4000)
 *
 * The script intentionally does NOT delete the project at the end so you can
 * inspect the result. It does delete the test user (cascades the project).
 * To keep both for inspection, set KEEP=1 in the env.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const KEEP = process.env.KEEP === '1';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env vars. Run from backend/ with .env present.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const pub = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Canned answers — Eva Fotografie (visueel_portfolio)
// ---------------------------------------------------------------------------

const ANSWERS_BY_PART: Record<number, string[]> = {
  1: [
    'Ik ben Eva van den Berg, bruidsfotograaf. Ik maak documentaire bruiloftsfotografie in heel Nederland. Echte momenten, echte emoties, zonder geposeerde shots. 7 jaar ervaring, 35 bruiloften per jaar.',
    'Op de kunstacademie ontdekte ik tijdens een stage bij een bruiloft dat dit het was. Die ene dag vastleggen, de emotie, het verhaal. Dat gevoel is na 7 jaar nog hetzelfde.',
    'Ik ben een vlieg op de muur op je trouwdag. Ik loop mee en leg alles vast zonder dat je het merkt. De lach van je oma, de tranen van je vader.',
    'Stellen tussen 25 en 40 die trouwen en waarde hechten aan mooie, ongedwongen foto\'s. Vaak creatieve types die bewust kiezen voor kwaliteit.',
    'Een stel dat hun trouwdag ziet als viering van hun liefde, niet als show. Die mij vertrouwen om hun verhaal te vertellen.',
    'Stellen die een hele lijst met geposeerde groepsfoto\'s willen of verwachten dat ik de dag regisseer.',
    'Relaxte stellen die genieten van hun dag. Die lef hebben om iets anders te kiezen.',
    'Ze vertrouwen me volledig en laten me vrij. Dan krijg ik de mooiste momenten.',
    'Mensen die alleen op prijs vergelijken of te veel controle willen.',
    'Ze verwachten geposeerde perfectie en ik lever documentair werk. Mismatch in verwachtingen.',
  ],
  2: [
    'Ze zijn overweldigd door alle keuzes. Elke fotograaf zegt geweldig te zijn maar ze kunnen het verschil niet zien. En ze zijn bang dat ze de verkeerde kiezen.',
    'Ze scrollen eindeloos door Instagram, vergelijken 20 portfolios, vragen offertes op maar durven niet te kiezen.',
    'Vrienden om advies gevraagd, Google reviews gelezen, maar iedereen zegt iets anders.',
    'Omdat ze niet weten waar ze op moeten letten. Stijl, persoonlijkheid, werkwijze, dat zie je niet in een review.',
    'Dat ze niet zeker weten of de fotograaf hun dag echt begrijpt en voelt.',
    'Als ze de verkeerde kiezen, hebben ze foto\'s waar ze niet blij mee zijn. Dat kun je niet overdoen. Je trouwdag is eenmalig.',
    'Dan kiezen ze op prijs of op basis van een mooie website en hopen ze maar dat het goed komt.',
  ],
  3: [
    'Het begint altijd met een kennismakingsgesprek, liefst met koffie. Ik wil weten wie jullie zijn, hoe jullie dag eruitziet, wat belangrijk is.',
    'Met luisteren. Ik vraag naar het verhaal achter de bruiloft, niet naar de shotlist.',
    'Kennismaking, boeking, voorgesprek 4 weken voor de bruiloft, de dag zelf (8-12 uur), selectie en bewerking (6-8 weken), online galerij met 400-600 foto\'s.',
    'Dat heb ik net beschreven: kennismaking, boeking, voorgesprek, de dag, bewerking, galerij.',
    'Mijn documentaire stijl. Ik maak geen geposeerde foto\'s. En ik investeer veel tijd in de kennismaking zodat ik weet wat echt belangrijk is voor het stel.',
    'Omdat stellen zich op hun gemak voelen. Ze vergeten dat ik er ben en dan ontstaan de mooiste beelden.',
    'Ze zeggen altijd: we wisten niet dat je er was, en toch heb je alles gevangen. Dat is het mooiste compliment.',
  ],
  5: [
    'Laura en Tim, trouwden vorig jaar in een kas in het Westland. Ze waren allebei zenuwachtig en camera-schuw. Na de kennismaking waren ze helemaal gerustgesteld.',
    'Via Instagram, ze vonden mijn stijl meteen mooi.',
    'Ze hadden al 3 fotografen gesproken maar voelden geen klik.',
    'Ze wisten niet of documentaire fotografie echt bij hen paste.',
    'Ze zeiden achteraf: dit zijn de mooiste foto\'s die we ooit van onszelf hebben gezien. Ze hebben een groot canvas in hun woonkamer hangen.',
    'Laura stuurde me een bericht: "Elke keer als ik de foto\'s bekijk huil ik weer van geluk. Je hebt ons verhaal precies gevangen."',
    '4.9 sterren op Google met 62 reviews. Op The Knot heb ik een Editor\'s Choice award gekregen.',
  ],
  6: [
    'Op de kunstacademie studeerde ik fotografie. Tijdens een stage bij een bruiloft wist ik: dit is het. Die ene dag, die emotie, dat je alles vastlegt.',
    'Die eerste bruiloft. Ik stond achter mijn camera en voelde voor het eerst dat ik precies deed waarvoor ik bedoeld was.',
    'Omdat ik geloof dat echte momenten mooier zijn dan geposeerde perfectie. En omdat elke liefdesgeschiedenis het waard is om vastgelegd te worden.',
    'Dat stellen foto\'s krijgen die echt bij hen passen. Niet de standaard trouwfoto maar hun eigen verhaal.',
    'In eerlijkheid en echtheid. In ongeposeerde momenten. In de traan die spontaan komt, niet die je regisseert.',
    'Ik regisseer niet. Ik volg. Ik laat de dag gebeuren en vang het.',
  ],
  7: [
    'Dat ze hun dag kunnen herbeleven door de foto\'s. Dat ze zich gezien en begrepen voelen.',
    'Foto\'s die ze over 30 jaar nog steeds met tranen bekijken.',
    'Een wachtlijst van een jaar, een boek uitbrengen met mijn mooiste bruiloftsverhalen, en workshops geven aan jonge fotografen.',
    'De standaard in bruiloftsfotografie veranderen. Minder geposeerd, meer echt.',
    'Eerlijkheid, persoonlijke aandacht, en vakmanschap. Ik lever nooit iets af waar ik niet 100% achter sta.',
    'Ik neem de tijd voor de kennismaking. Ik jaag niet door een shotlist. En als iets niet bij mij past, zeg ik dat eerlijk.',
  ],
  8: [
    'Hoeveel foto\'s krijgen we? Kun je ook groepsfoto\'s maken? Wat als het regent? Wat is je bewerkingsstijl?',
    'Meestal in het kennismakingsgesprek of via mail voor de boeking.',
    'Of documentaire fotografie wel genoeg "mooie" foto\'s oplevert. En of de investering het waard is.',
    'Of ze er wel goed uitzien op foto\'s. Camera-angst.',
    'Dat documentair betekent dat ik niks doe. Ik ben de hele dag actief bezig met composities, licht en timing. Ik pose alleen niet.',
  ],
  10: [
    'Als ze verloofd zijn en een fotograaf zoeken. Liefst 8-12 maanden voor de bruiloft.',
    'Net verloofd, enthousiast, aan het oriënteren.',
    'Ik reageer binnen 24 uur, stel een kennismakingsgesprek voor bij mij in de studio of bij een koffietentje.',
    'Mail of formulier, ik reageer, kennismakingsgesprek, boeking bevestigen, voorgesprek, trouwdag, galerij.',
    'Rust. Dat ze denken: hier ben ik goed. Geen verkooppraatje maar een echt gesprek.',
    'Telefoon: 06-87654321, e-mail: eva@evafotografie.nl, adres: Studio Eva, Herengracht 200, 1016 Amsterdam. Instagram: @evafotografie, website: evafotografie.nl',
    'Ja, alles mag zichtbaar zijn op de website.',
    'Eva Fotografie. Ik heb een logo, kleuren zijn zwart, wit en zacht roze.',
    'Nee, alles nieuw.',
    'Privacyverklaring is nodig.',
    'Persoonlijk en warm, alsof je met een vriendin praat. Spreek klanten aan met je.',
    'Home, Over mij, Portfolio, Pakketten en prijzen, Ervaringen, Contact',
    'Nee, alles is gezegd.',
  ],
};

// p4 — 3 services × 8 questions each
const SERVICES = [
  {
    name: 'Volledige bruiloftsreportage',
    answers: [
      'Volledige bruiloftsreportage. De hele dag vastgelegd, van getting ready tot het feest. 8-12 uur aanwezig, 400-600 foto\'s in online galerij, allemaal bewerkt in mijn stijl. 2.450 euro.',
      'Omdat een bruiloft een verhaal is met een begin, midden en eind. Je kunt niet halverwege stoppen.',
      'Stellen die hun complete dag willen vastleggen.',
      'Ze zijn verloofd en zoeken een fotograaf die de hele dag meegaat.',
      'Ze willen dat elk moment bewaard wordt, ook de momenten die ze zelf missen.',
      'Ze hebben een compleet beeldverhaal van hun dag dat ze voor altijd kunnen herbeleven.',
      '400-600 professioneel bewerkte foto\'s in een online galerij die ze kunnen delen en downloaden.',
      'De emotie als ze de galerij openen en hun dag terugzien.',
    ],
  },
  {
    name: 'Halve dag reportage',
    answers: [
      'Halve dag reportage. 4-5 uur fotografie, ideaal voor intieme bruiloften of ceremonies. 200-300 foto\'s in online galerij. 1.650 euro.',
      'Niet elke bruiloft heeft een heel dagprogramma. Sommige stellen trouwen klein en intiem.',
      'Stellen met een intieme bruiloft of een stadhuisceremonie.',
      'Kleiner budget of een korter programma.',
      'Ze willen wel mooie foto\'s maar hebben geen heel dagprogramma.',
      'Ze krijgen dezelfde kwaliteit als een volledige reportage maar dan compacter.',
      '200-300 bewerkte foto\'s.',
      'Dat de foto\'s er precies zo uitzien als bij een volledige reportage.',
    ],
  },
  {
    name: 'Loveshoot / verlovingssessie',
    answers: [
      'Loveshoot of verlovingssessie. Een ontspannen fotoshoot op een mooie locatie, 1-2 uur, 50-80 foto\'s. Perfect als kennismaking voor de trouwdag. 350 euro.',
      'Zodat stellen wennen aan de camera en aan mij. Dan zijn ze op de trouwdag veel relaxter.',
      'Verloofde stellen die eerst willen ervaren hoe het is om door mij gefotografeerd te worden.',
      'Net verloofd en benieuwd naar mijn stijl.',
      'Ze zijn camera-schuw of weten niet of documentaire fotografie bij hen past.',
      'Ze ontdekken dat het helemaal niet eng is en krijgen prachtige foto\'s als bonus.',
      '50-80 bewerkte foto\'s en het vertrouwen dat de trouwdag goed komt.',
      'Dat ze zich direct op hun gemak voelen.',
    ],
  },
];

const META_BLOG_OPTIN_ANSWER = 'Nee, ik wil geen blog op mijn website.';

// Long generic fallback for AI doorvragen / archetype-extras (>50 words so the
// "skip doorvraag" rule kicks in and we don't get stuck in a loop).
const GENERIC_FALLBACKS = [
  'Daar denk ik regelmatig over na. Mijn aanpak komt voort uit zeven jaar ervaring met heel veel verschillende stellen. Ik heb gemerkt dat oprechtheid en aandacht voor de mens achter het stel het verschil maken. Mijn intuïtie heeft me nog nooit in de steek gelaten en daar vertrouw ik op.',
  'Dat is een goede vraag, maar wat ik eerder al zei vat het eigenlijk al goed samen. Mijn werk draait om eerlijkheid, om echte momenten, en om vertrouwen tussen mij en het stel. Pakketten en prijzen staan duidelijk op mijn website en ik kies bewust voor transparantie zonder verborgen kosten.',
  'Daar zou ik niet veel meer aan toe willen voegen dan ik al heb verteld. Mijn werk staat voor zich. Ik laat klanten in mijn portfolio zien wat ze van mij mogen verwachten, en in de kennismaking gaan we daar uitgebreid op in. Liever te veel afstemmen dan te weinig.',
];

let fallbackIdx = 0;
function nextFallback(): string {
  const v = GENERIC_FALLBACKS[fallbackIdx % GENERIC_FALLBACKS.length]!;
  fallbackIdx++;
  return v;
}

// ---------------------------------------------------------------------------
// Answer chooser
// ---------------------------------------------------------------------------

function chooseAnswer(questionId: string): string {
  // Followups + extras → long generic so AI moves on
  if (questionId.includes('_followup_') || questionId.includes('_extra_')) {
    return nextFallback();
  }

  if (questionId === 'meta_blog_optin') return META_BLOG_OPTIN_ANSWER;

  // p4_more_s{N} — meta-more-services after each service
  const moreMatch = questionId.match(/^p4_more_s(\d+)$/);
  if (moreMatch) {
    const sNum = Number(moreMatch[1]);
    return sNum < SERVICES.length
      ? 'Ja, ik heb nog een andere dienst om te bespreken.'
      : 'Nee, dit zijn mijn drie pakketten.';
  }

  // p4_s{X}_q{Y}
  const sqMatch = questionId.match(/^p4_s(\d+)_q(\d+)$/);
  if (sqMatch) {
    const sIdx = Number(sqMatch[1]) - 1;
    const qIdx = Number(sqMatch[2]) - 1;
    return SERVICES[sIdx]?.answers[qIdx] ?? nextFallback();
  }

  // Standard p{N}q{M}
  const pqMatch = questionId.match(/^p(\d+)q(\d+)$/);
  if (pqMatch) {
    const part = Number(pqMatch[1]);
    const qIdx = Number(pqMatch[2]) - 1;
    return ANSWERS_BY_PART[part]?.[qIdx] ?? nextFallback();
  }

  return nextFallback();
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

let bearerToken = '';

async function api<T = unknown>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface InterviewStep {
  done: boolean;
  assistant_message: string;
  current_question: {
    question_id: string;
    parent_question_id: string | null;
    is_followup: boolean;
    part: number;
    text: string;
  } | null;
  progress: {
    part: number;
    parts_total: number;
    answered: number;
    archetype: string | null;
    sub_archetype: string | null;
    service_index?: number;
  };
}

async function main() {
  const t0 = Date.now();
  const stamp = (label: string) => {
    const sec = Math.round((Date.now() - t0) / 1000);
    console.log(`[+${sec}s] ${label}`);
  };

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Webtekst-assistent — full-flow smoke test');
  console.log(`  API: ${API_URL}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Auth: create test user + sign in
  const testEmail = `test-${Date.now()}@webtekst-test.local`;
  const testPassword = 'TestRun-Pa55word!ABC';

  stamp(`Creating test user ${testEmail}…`);
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });
  if (createErr || !created?.user) {
    throw new Error(`createUser failed: ${createErr?.message ?? 'no user'}`);
  }
  const userId = created.user.id;
  stamp(`✓ User ${userId}`);

  stamp('Signing in…');
  const { data: signed, error: signErr } = await pub.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  if (signErr || !signed.session?.access_token) {
    throw new Error(`signIn failed: ${signErr?.message ?? 'no session'}`);
  }
  bearerToken = signed.session.access_token;
  stamp(`✓ Token (${bearerToken.length} chars)`);

  // Cleanup hook (always tries to delete user unless KEEP=1)
  let cleanupDone = false;
  const cleanup = async () => {
    if (cleanupDone || KEEP) return;
    cleanupDone = true;
    try {
      await admin.auth.admin.deleteUser(userId);
      stamp(`Cleaned up test user (project cascaded).`);
    } catch (err) {
      console.error('Cleanup failed (manual delete needed):', err);
    }
  };
  process.on('SIGINT', () => {
    void cleanup().then(() => process.exit(130));
  });

  try {
    // 2. Create project
    stamp('\nCreating project…');
    const { project } = await api<{ project: { id: string } }>(
      'POST',
      '/api/projects',
      { name: 'Eva Fotografie - Test' }
    );
    const projectId = project.id;
    stamp(`✓ Project ${projectId}`);

    // 3. Start interview
    stamp('\nStarting interview…');
    let step = await api<InterviewStep>(
      'POST',
      `/api/projects/${projectId}/interview/start`
    );
    console.log(`  → first question [${step.current_question?.question_id}]`);
    console.log(`  ${truncate(step.assistant_message, 200)}`);

    // 4. Loop through Q&A
    let turn = 0;
    let lastReportedPart = 0;
    let archetypePrinted = false;
    const MAX_TURNS = 200;

    while (!step.done && step.current_question) {
      const q = step.current_question;
      const answer = chooseAnswer(q.question_id);

      turn++;
      if (q.part > lastReportedPart) {
        console.log(`\n────── DEEL ${q.part} ${q.is_followup ? '' : '(start)'} ──────`);
        lastReportedPart = q.part;
      }
      console.log(
        `  [${String(turn).padStart(3, '0')}] ${q.question_id}` +
          (q.is_followup ? ' (followup)' : '') +
          `\n        Q: ${truncate(q.text, 100)}` +
          `\n        A: ${truncate(answer, 100)}`
      );

      step = await api<InterviewStep>(
        'POST',
        `/api/projects/${projectId}/interview/answer`,
        {
          question_id: q.question_id,
          question_text: q.text,
          answer_text: answer,
          answer_source: 'typed',
        }
      );

      // Print archetype the first time the backend reports it (lazy
      // classification means it's set on the FIRST part-2 turn, not on the
      // transition turn out of part 1).
      if (!archetypePrinted && step.progress.archetype) {
        archetypePrinted = true;
        console.log(
          `\n  ◆ Archetype detected: ${step.progress.archetype}` +
            (step.progress.sub_archetype ? ` + ${step.progress.sub_archetype}` : '')
        );
      }

      if (turn > MAX_TURNS) {
        throw new Error(`Aborted: more than ${MAX_TURNS} turns`);
      }
    }
    stamp(`\n✓ Interview complete in ${turn} turns`);
    console.log(`  Final assistant message: ${truncate(step.assistant_message, 200)}`);

    // 5. Strategy
    stamp('\nGenerating strategy…');
    const stratRes = await api<{ strategy: unknown }>(
      'POST',
      `/api/projects/${projectId}/strategy/generate`
    );
    console.log(JSON.stringify(stratRes.strategy, null, 2));

    // 6. Approve
    stamp('\nApproving strategy → content generation kicks off…');
    await api(
      'POST',
      `/api/projects/${projectId}/strategy/approve`
    );

    // 7. Poll for status=review
    stamp('\nPolling project status every 5s…');
    let status = '';
    for (let attempt = 0; attempt < 60; attempt++) {
      await sleep(5000);
      const res = await api<{ project: { status: string } }>(
        'GET',
        `/api/projects/${projectId}`
      );
      status = res.project.status;
      stamp(`  status=${status} (poll ${attempt + 1})`);
      if (status === 'review' || status === 'completed') break;
      if (status === 'strategy') {
        throw new Error(
          'status reverted to "strategy" — content generation failed; check backend logs.'
        );
      }
    }
    if (status !== 'review' && status !== 'completed') {
      throw new Error(`Generation did not complete after 5 minutes (status=${status}).`);
    }

    // 8. Print all pages
    stamp('\nFetching pages with content…');
    const pagesRes = await api<{
      status: string;
      pages: Array<{ id: string; title: string; slug: string; sections: unknown }>;
    }>('GET', `/api/projects/${projectId}/pages`);

    console.log(
      `\n═══ ${pagesRes.pages.length} PAGES ═══════════════════════════════\n`
    );
    for (const p of pagesRes.pages) {
      console.log(`◆ ${p.title}  (/${p.slug})`);
      console.log(JSON.stringify(p.sections, null, 2));
      console.log('───────────────────────────────────────────────────────────\n');
    }

    stamp('\n✓ DONE.');
    console.log(`\n  Test user: ${testEmail}`);
    console.log(`  User id:   ${userId}`);
    console.log(`  Project:   ${projectId}`);
    if (KEEP) {
      console.log('\n  KEEP=1 set — leaving test user + project intact.');
      console.log(`  Manual delete: SELECT auth.admin.delete_user('${userId}');`);
    } else {
      await cleanup();
    }
  } catch (err) {
    console.error('\n✗ FAILED:', err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) console.error(err.stack);
    await cleanup();
    process.exit(1);
  }
}

void main();
