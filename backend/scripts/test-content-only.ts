/**
 * Fast variant of test-full-flow.ts that SKIPS the interview by directly
 * seeding interview_answers with v2-format IDs and pre-setting the archetype.
 * Then runs only the strategy + content-generation steps via the API.
 *
 * Saves ~80 Claude calls (the interview turns) so we can iterate on the
 * content-generation pipeline cheaply.
 *
 *   cd backend && npx tsx scripts/test-content-only.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const KEEP = process.env.KEEP === '1';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env vars (run from backend/ with .env present).');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const pub = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Eva's canned answers, mapped to v2 question_ids
// ---------------------------------------------------------------------------

interface SeedAnswer {
  question_id: string;
  question_text: string;
  answer_text: string;
  phase: number;
}

const SEED_ANSWERS: SeedAnswer[] = [
  // DEEL 1 — Wat je doet & voor wie
  ['p1q1', 'Kun je in je eigen woorden vertellen wat je doet?',
    'Ik ben Eva van den Berg, bruidsfotograaf. Ik maak documentaire bruiloftsfotografie in heel Nederland. Echte momenten, echte emoties, zonder geposeerde shots. 7 jaar ervaring, 35 bruiloften per jaar.', 1],
  ['p1q2', 'Waarom doe je dit werk?',
    'Op de kunstacademie ontdekte ik tijdens een stage bij een bruiloft dat dit het was. Die ene dag vastleggen, de emotie, het verhaal. Dat gevoel is na 7 jaar nog hetzelfde.', 1],
  ['p1q3', 'Hoe leg je dit uit aan iemand die je nog niet kent?',
    'Ik ben een vlieg op de muur op je trouwdag. Ik loop mee en leg alles vast zonder dat je het merkt. De lach van je oma, de tranen van je vader.', 1],
  ['p1q4', 'Voor wie doe je dit specifiek?',
    'Stellen tussen 25 en 40 die trouwen en waarde hechten aan mooie, ongedwongen foto\'s. Vaak creatieve types die bewust kiezen voor kwaliteit.', 1],
  ['p1q5', 'Wie is jouw ideale klant?',
    'Een stel dat hun trouwdag ziet als viering van hun liefde, niet als show. Die mij vertrouwen om hun verhaal te vertellen.', 1],
  ['p1q6', 'Wie juist niet?',
    'Stellen die een hele lijst met geposeerde groepsfoto\'s willen of verwachten dat ik de dag regisseer.', 1],
  ['p1q7', 'Met wat voor klanten werk je het liefst?',
    'Relaxte stellen die genieten van hun dag. Die lef hebben om iets anders te kiezen.', 1],
  ['p1q8', 'Wat maakt deze klanten fijn om mee te werken?',
    'Ze vertrouwen me volledig en laten me vrij. Dan krijg ik de mooiste momenten.', 1],
  ['p1q9', 'Met wat voor klanten liever niet?',
    'Mensen die alleen op prijs vergelijken of te veel controle willen.', 1],
  ['p1q10', 'Wat gaat er dan meestal mis?',
    'Ze verwachten geposeerde perfectie en ik lever documentair werk. Mismatch in verwachtingen.', 1],

  // DEEL 2 — Het probleem van je klant
  ['p2q1', 'Welke problemen zie je bij klanten voordat ze bij jou komen?',
    'Ze zijn overweldigd door alle keuzes. Elke fotograaf zegt geweldig te zijn maar ze kunnen het verschil niet zien. En ze zijn bang dat ze de verkeerde kiezen.', 2],
  ['p2q2', 'Hoe uit zich dit probleem in de praktijk?',
    'Ze scrollen eindeloos door Instagram, vergelijken 20 portfolios, vragen offertes op maar durven niet te kiezen.', 2],
  ['p2q3', 'Wat hebben ze vaak al geprobeerd?',
    'Vrienden om advies gevraagd, Google reviews gelezen, maar iedereen zegt iets anders.', 2],
  ['p2q4', 'Waarom werkte dat niet?',
    'Omdat ze niet weten waar ze op moeten letten. Stijl, persoonlijkheid, werkwijze, dat zie je niet in een review.', 2],
  ['p2q5', 'Wat frustreert hen het meest?',
    'Dat ze niet zeker weten of de fotograaf hun dag echt begrijpt en voelt.', 2],
  ['p2q6', 'Wat kost dit hen aan tijd, geld of energie?',
    'Als ze de verkeerde kiezen, hebben ze foto\'s waar ze niet blij mee zijn. Dat kun je niet overdoen. Je trouwdag is eenmalig.', 2],
  ['p2q7', 'Wat gebeurt er als ze niets doen?',
    'Dan kiezen ze op prijs of op basis van een mooie website en hopen ze maar dat het goed komt.', 2],

  // DEEL 3 — Jouw oplossing & werkwijze
  ['p3q1', 'Hoe help jij klanten precies?',
    'Het begint altijd met een kennismakingsgesprek, liefst met koffie. Ik wil weten wie jullie zijn, hoe jullie dag eruitziet, wat belangrijk is.', 3],
  ['p3q2', 'Waar begin je altijd mee?',
    'Met luisteren. Ik vraag naar het verhaal achter de bruiloft, niet naar de shotlist.', 3],
  ['p3q3', 'Hoe ziet een traject of samenwerking eruit?',
    'Kennismaking, boeking, voorgesprek 4 weken voor de bruiloft, de dag zelf (8-12 uur), selectie en bewerking (6-8 weken), online galerij met 400-600 foto\'s.', 3],
  ['p3q4', 'Kun je dit stap voor stap uitleggen?',
    'Eerste stap is het kennismakingsgesprek. Daarna stuur ik een offerte met pakketkeuze. Bij akkoord plannen we een voorgesprek 4 weken vooraf om de dag door te nemen. Op de dag zelf ben ik 8 tot 12 uur aanwezig. Daarna selecteer en bewerk ik in 6 tot 8 weken. De foto\'s komen in een online galerij waar je ze kunt downloaden en delen.', 3],
  ['p3q5', 'Wat maakt jouw aanpak anders dan anderen?',
    'Mijn documentaire stijl. Ik maak geen geposeerde foto\'s. En ik investeer veel tijd in de kennismaking zodat ik weet wat echt belangrijk is voor het stel.', 3],
  ['p3q6', 'Waarom werkt dit wel?',
    'Omdat stellen zich op hun gemak voelen. Ze vergeten dat ik er ben en dan ontstaan de mooiste beelden.', 3],
  ['p3q7', 'Wat zeggen klanten hierover?',
    'Ze zeggen altijd: we wisten niet dat je er was, en toch heb je alles gevangen. Dat is het mooiste compliment.', 3],

  // DEEL 4 — Diensten (3 services × 8 vragen)
  ['p4_s1_q1', 'Hoe heet deze dienst en wat houdt die in?',
    'Volledige bruiloftsreportage. De hele dag vastgelegd, van getting ready tot het feest. 8-12 uur aanwezig, 400-600 foto\'s in online galerij, allemaal bewerkt in mijn stijl. 2.450 euro.', 4],
  ['p4_s1_q2', 'Waarom heb je deze dienst zo ingericht?',
    'Omdat een bruiloft een verhaal is met een begin, midden en eind. Je kunt niet halverwege stoppen.', 4],
  ['p4_s1_q3', 'Voor wie is deze dienst bedoeld?',
    'Stellen die hun complete dag willen vastleggen.', 4],
  ['p4_s1_q4', 'In welke situatie zit iemand dan?',
    'Ze zijn verloofd en zoeken een fotograaf die de hele dag meegaat.', 4],
  ['p4_s1_q5', 'Welk probleem lost deze dienst op?',
    'Ze willen dat elk moment bewaard wordt, ook de momenten die ze zelf missen.', 4],
  ['p4_s1_q6', 'Wat verandert er concreet?',
    'Ze hebben een compleet beeldverhaal van hun dag dat ze voor altijd kunnen herbeleven.', 4],
  ['p4_s1_q7', 'Wat levert het op?',
    '400-600 professioneel bewerkte foto\'s in een online galerij die ze kunnen delen en downloaden.', 4],
  ['p4_s1_q8', 'Wat merkt de klant als eerste?',
    'De emotie als ze de galerij openen en hun dag terugzien.', 4],

  ['p4_s2_q1', 'Hoe heet deze dienst en wat houdt die in?',
    'Halve dag reportage. 4-5 uur fotografie, ideaal voor intieme bruiloften of ceremonies. 200-300 foto\'s in online galerij. 1.650 euro.', 4],
  ['p4_s2_q2', 'Waarom heb je deze dienst zo ingericht?',
    'Niet elke bruiloft heeft een heel dagprogramma. Sommige stellen trouwen klein en intiem.', 4],
  ['p4_s2_q3', 'Voor wie is deze dienst bedoeld?',
    'Stellen met een intieme bruiloft of een stadhuisceremonie.', 4],
  ['p4_s2_q4', 'In welke situatie zit iemand dan?',
    'Kleiner budget of een korter programma.', 4],
  ['p4_s2_q5', 'Welk probleem lost deze dienst op?',
    'Ze willen wel mooie foto\'s maar hebben geen heel dagprogramma.', 4],
  ['p4_s2_q6', 'Wat verandert er concreet?',
    'Ze krijgen dezelfde kwaliteit als een volledige reportage maar dan compacter.', 4],
  ['p4_s2_q7', 'Wat levert het op?',
    '200-300 bewerkte foto\'s.', 4],
  ['p4_s2_q8', 'Wat merkt de klant als eerste?',
    'Dat de foto\'s er precies zo uitzien als bij een volledige reportage.', 4],

  ['p4_s3_q1', 'Hoe heet deze dienst en wat houdt die in?',
    'Loveshoot of verlovingssessie. Een ontspannen fotoshoot op een mooie locatie, 1-2 uur, 50-80 foto\'s. Perfect als kennismaking voor de trouwdag. 350 euro.', 4],
  ['p4_s3_q2', 'Waarom heb je deze dienst zo ingericht?',
    'Zodat stellen wennen aan de camera en aan mij. Dan zijn ze op de trouwdag veel relaxter.', 4],
  ['p4_s3_q3', 'Voor wie is deze dienst bedoeld?',
    'Verloofde stellen die eerst willen ervaren hoe het is om door mij gefotografeerd te worden.', 4],
  ['p4_s3_q4', 'In welke situatie zit iemand dan?',
    'Net verloofd en benieuwd naar mijn stijl.', 4],
  ['p4_s3_q5', 'Welk probleem lost deze dienst op?',
    'Ze zijn camera-schuw of weten niet of documentaire fotografie bij hen past.', 4],
  ['p4_s3_q6', 'Wat verandert er concreet?',
    'Ze ontdekken dat het helemaal niet eng is en krijgen prachtige foto\'s als bonus.', 4],
  ['p4_s3_q7', 'Wat levert het op?',
    '50-80 bewerkte foto\'s en het vertrouwen dat de trouwdag goed komt.', 4],
  ['p4_s3_q8', 'Wat merkt de klant als eerste?',
    'Dat ze zich direct op hun gemak voelen.', 4],

  // DEEL 5 — Resultaten & ervaringen
  ['p5q1', 'Kun je een of meerdere klanten beschrijven?',
    'Laura en Tim, trouwden vorig jaar in een kas in het Westland. Ze waren allebei zenuwachtig en camera-schuw. Na de kennismaking waren ze helemaal gerustgesteld.', 5],
  ['p5q2', 'Hoe kwamen ze bij jou binnen?',
    'Via Instagram, ze vonden mijn stijl meteen mooi.', 5],
  ['p5q3', 'Wat was hun situatie voor de samenwerking?',
    'Ze hadden al 3 fotografen gesproken maar voelden geen klik.', 5],
  ['p5q4', 'Waar liepen ze op vast?',
    'Ze wisten niet of documentaire fotografie echt bij hen paste.', 5],
  ['p5q5', 'Wat is er veranderd na de samenwerking?',
    'Ze zeiden achteraf: dit zijn de mooiste foto\'s die we ooit van onszelf hebben gezien. Ze hebben een groot canvas in hun woonkamer hangen.', 5],
  ['p5q6', 'Kun je dit concreet maken?',
    'Laura stuurde me een bericht: "Elke keer als ik de foto\'s bekijk huil ik weer van geluk. Je hebt ons verhaal precies gevangen."', 5],
  ['p5q7', 'Heb je cijfers, voorbeelden of quotes die je wilt delen?',
    '4.9 sterren op Google met 62 reviews. Op The Knot heb ik een Editor\'s Choice award gekregen.', 5],

  // DEEL 6 — Jouw verhaal
  ['p6q1', 'Hoe ben je dit werk gaan doen?',
    'Op de kunstacademie studeerde ik fotografie. Tijdens een stage bij een bruiloft wist ik: dit is het. Die ene dag, die emotie, dat je alles vastlegt.', 6],
  ['p6q2', 'Wat was de aanleiding?',
    'Die eerste bruiloft. Ik stond achter mijn camera en voelde voor het eerst dat ik precies deed waarvoor ik bedoeld was.', 6],
  ['p6q3', 'Waarom bestaat jouw bedrijf?',
    'Omdat ik geloof dat echte momenten mooier zijn dan geposeerde perfectie. En omdat elke liefdesgeschiedenis het waard is om vastgelegd te worden.', 6],
  ['p6q4', 'Welk probleem wil je oplossen in de wereld?',
    'Dat stellen foto\'s krijgen die echt bij hen passen. Niet de standaard trouwfoto maar hun eigen verhaal.', 6],
  ['p6q5', 'Waar geloof jij sterk in binnen jouw vak?',
    'In eerlijkheid en echtheid. In ongeposeerde momenten. In de traan die spontaan komt, niet die je regisseert.', 6],
  ['p6q6', 'Wat doe jij bewust anders?',
    'Ik regisseer niet. Ik volg. Ik laat de dag gebeuren en vang het.', 6],

  // DEEL 7 — Missie/visie/waarden
  ['p7q1', 'Wat wil je betekenen voor je klanten?',
    'Dat ze hun dag kunnen herbeleven door de foto\'s. Dat ze zich gezien en begrepen voelen.', 7],
  ['p7q2', 'Wat moeten ze aan jou overhouden?',
    'Foto\'s die ze over 30 jaar nog steeds met tranen bekijken.', 7],
  ['p7q3', 'Waar wil je over 5 jaar staan?',
    'Een wachtlijst van een jaar, een boek uitbrengen met mijn mooiste bruiloftsverhalen, en workshops geven aan jonge fotografen.', 7],
  ['p7q4', 'Wat is je grotere ambitie?',
    'De standaard in bruiloftsfotografie veranderen. Minder geposeerd, meer echt.', 7],
  ['p7q5', 'Welke waarden zijn voor jou niet onderhandelbaar?',
    'Eerlijkheid, persoonlijke aandacht, en vakmanschap. Ik lever nooit iets af waar ik niet 100% achter sta.', 7],
  ['p7q6', 'Hoe merken klanten dit?',
    'Ik neem de tijd voor de kennismaking. Ik jaag niet door een shotlist. En als iets niet bij mij past, zeg ik dat eerlijk.', 7],

  // DEEL 8 — FAQ/twijfels
  ['p8q1', 'Welke vragen krijg je het vaakst van klanten?',
    'Hoeveel foto\'s krijgen we? Kun je ook groepsfoto\'s maken? Wat als het regent? Wat is je bewerkingsstijl?', 8],
  ['p8q2', 'Wanneer stellen ze deze vragen?',
    'Meestal in het kennismakingsgesprek of via mail voor de boeking.', 8],
  ['p8q3', 'Waar twijfelen mensen over voordat ze instappen?',
    'Of documentaire fotografie wel genoeg "mooie" foto\'s oplevert. En of de investering het waard is.', 8],
  ['p8q4', 'Wat stellen ze vaak niet hardop?',
    'Of ze er wel goed uitzien op foto\'s. Camera-angst.', 8],
  ['p8q5', 'Welke misverstanden bestaan er over jouw werk?',
    'Dat documentair betekent dat ik niks doe. Ik ben de hele dag actief bezig met composities, licht en timing. Ik pose alleen niet.', 8],

  // DEEL 10 — Contact & praktisch (DEEL 9 overgeslagen, geen blog)
  ['p10q1', 'Wanneer moeten mensen volgens jou contact opnemen?',
    'Als ze verloofd zijn en een fotograaf zoeken. Liefst 8-12 maanden voor de bruiloft.', 10],
  ['p10q2', 'In welke fase zitten ze dan?',
    'Net verloofd, enthousiast, aan het oriënteren.', 10],
  ['p10q3', 'Wat gebeurt er als iemand contact opneemt?',
    'Ik reageer binnen 24 uur, stel een kennismakingsgesprek voor bij mij in de studio of bij een koffietentje.', 10],
  ['p10q4', 'Hoe ziet dat proces eruit?',
    'Mail of formulier, ik reageer, kennismakingsgesprek, boeking bevestigen, voorgesprek, trouwdag, galerij.', 10],
  ['p10q5', 'Wat wil je dat iemand voelt bij het opnemen van contact?',
    'Rust. Dat ze denken: hier ben ik goed. Geen verkooppraatje maar een echt gesprek.', 10],
  ['p10q6', 'Wat zijn je contactgegevens?',
    'Telefoon: 06-87654321, e-mail: eva@evafotografie.nl, adres: Studio Eva, Herengracht 200, 1016 Amsterdam. Instagram: @evafotografie, website: evafotografie.nl', 10],
  ['p10q7', 'Wil je dat je telefoonnummer en e-mail zichtbaar zijn op de website?',
    'Ja, alles mag zichtbaar zijn op de website.', 10],
  ['p10q8', 'Heb je al een bedrijfsnaam, logo en huisstijlkleuren?',
    'Eva Fotografie. Ik heb een logo, kleuren zijn zwart, wit en zacht roze.', 10],
  ['p10q9', 'Heb je al teksten of content die je wilt hergebruiken?',
    'Nee, alles nieuw.', 10],
  ['p10q10', 'Zijn er juridische pagina\'s nodig?',
    'Privacyverklaring is nodig.', 10],
  ['p10q11', 'Hoe wil je overkomen op je website? Spreek je klanten aan met "je" of "u"?',
    'Persoonlijk en warm, alsof je met een vriendin praat. Spreek klanten aan met je.', 10],
  ['p10q12', 'Welke pagina\'s wil je op je website?',
    'Home, Over mij, Portfolio, Pakketten en prijzen, Ervaringen, Contact', 10],
  ['p10q13', 'Is er nog iets dat je kwijt wilt over je bedrijf of je website?',
    'Nee, alles is gezegd.', 10],
].map((row): SeedAnswer => ({
  question_id: row[0] as string,
  question_text: row[1] as string,
  answer_text: row[2] as string,
  phase: row[3] as number,
}));

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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const t0 = Date.now();
  const stamp = (label: string) => {
    console.log(`[+${Math.round((Date.now() - t0) / 1000)}s] ${label}`);
  };

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  test-content-only — strategy + content (no interview API loop)');
  console.log(`  API: ${API_URL}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Test user
  const testEmail = `test-content-${Date.now()}@webtekst-test.local`;
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

  const { data: signed, error: signErr } = await pub.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  if (signErr || !signed.session?.access_token) {
    throw new Error(`signIn failed: ${signErr?.message ?? 'no session'}`);
  }
  bearerToken = signed.session.access_token;

  let cleanupDone = false;
  const cleanup = async () => {
    if (cleanupDone || KEEP) return;
    cleanupDone = true;
    try {
      await admin.auth.admin.deleteUser(userId);
      stamp('Cleaned up test user (project cascaded).');
    } catch (err) {
      console.error('Cleanup failed:', err);
    }
  };

  try {
    // 2. Create project
    stamp('Creating project…');
    const { project } = await api<{ project: { id: string } }>(
      'POST',
      '/api/projects',
      { name: 'Eva Fotografie - Content Test' }
    );
    const projectId = project.id;
    stamp(`✓ Project ${projectId}`);

    // 3. Bulk-insert seed answers + set archetype + status='strategy'
    stamp(`Seeding ${SEED_ANSWERS.length} interview answers + archetype…`);
    const rows = SEED_ANSWERS.map((a, i) => ({
      project_id: projectId,
      question_id: a.question_id,
      question_text: a.question_text,
      answer_text: a.answer_text,
      answer_source: 'typed' as const,
      phase: a.phase,
      sequence_order: i + 1,
      is_followup: false,
      parent_question_id: null,
    }));
    const { error: insErr } = await admin.from('interview_answers').insert(rows);
    if (insErr) throw new Error(`Failed to seed answers: ${insErr.message}`);

    const { error: updErr } = await admin
      .from('projects')
      .update({
        archetype: 'visueel_portfolio',
        sub_archetype: 'boeking_gedreven',
        status: 'strategy',
        interview_meta: {
          current_part: 10,
          current_part_q: 13,
          current_service: 3,
          current_service_q: 9,
          blog_optin: false,
          pending: null,
        },
      })
      .eq('id', projectId);
    if (updErr) throw new Error(`Failed to set archetype: ${updErr.message}`);
    stamp('✓ Seeded.');

    // 4. Strategy
    stamp('Generating strategy…');
    const stratRes = await api<{ strategy: unknown }>(
      'POST',
      `/api/projects/${projectId}/strategy/generate`
    );
    console.log(JSON.stringify(stratRes.strategy, null, 2));

    // 5. Approve
    stamp('Approving strategy → content generation…');
    await api('POST', `/api/projects/${projectId}/strategy/approve`);

    // 6. Poll
    stamp('Polling project status every 5s…');
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
        throw new Error('status reverted to "strategy" — content gen failed; check backend logs.');
      }
    }
    if (status !== 'review' && status !== 'completed') {
      throw new Error(`Generation did not complete after 5 minutes (status=${status}).`);
    }

    // 7. Pages
    stamp('Fetching pages with content…');
    const pagesRes = await api<{
      pages: Array<{ id: string; title: string; slug: string; sections: unknown }>;
    }>('GET', `/api/projects/${projectId}/pages`);

    console.log(`\n═══ ${pagesRes.pages.length} PAGES ═══════════════════════════════\n`);
    for (const p of pagesRes.pages) {
      console.log(`◆ ${p.title}  (/${p.slug})`);
      console.log(JSON.stringify(p.sections, null, 2));
      console.log('───────────────────────────────────────────────────────────\n');
    }

    stamp('✓ DONE.');
    console.log(`\n  Test user: ${testEmail}`);
    console.log(`  Project:   ${projectId}`);
    if (KEEP) {
      console.log('\n  KEEP=1 set — leaving test user + project intact.');
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
