/**
 * Seed script for Henk van Dijk — loodgieter, Amsterdam (lokale_ambacht).
 *
 * Skips the interview by directly seeding interview_answers + archetype,
 * then runs only strategy + content generation via the API.
 *
 *   cd backend && npx tsx scripts/test-content-only-henk.ts
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

interface SeedAnswer {
  question_id: string;
  question_text: string;
  answer_text: string;
  phase: number;
}

const SEED_ANSWERS: SeedAnswer[] = [
  // ---------- DEEL 1 ----------
  ['p1q1', 'Kun je in je eigen woorden vertellen wat je doet?',
    'Ik ben Henk van Dijk, eigenaar van Henk Loodgietersbedrijf. Loodgieter in Amsterdam en regio Amstelland. Ik doe spoedklussen, cv-ketelonderhoud en complete badkamerrenovaties. 22 jaar ervaring, eenmanszaak met af en toe een hulp.', 1],
  ['p1q2', 'Waarom doe je dit werk?',
    'Ik heb het van mijn vader geleerd. Hij was loodgieter en ik liep al van jongs af mee. Vakmanschap, eerlijk werk, trots op wat je oplevert. Dat zit erin gebakken.', 1],
  ['p1q3', 'Hoe leg je dit uit aan iemand die je nog niet kent?',
    'Als er thuis water uit het plafond komt, of de cv-ketel ligt eruit, dan ben ik degene die je belt. Ik kom snel, ik leg uit wat er aan de hand is, en ik los het op.', 1],
  ['p1q4', 'Voor wie doe je dit specifiek?',
    'Particulieren in Amsterdam en Amstelland. Huiseigenaren die hun huis goed willen onderhouden. Geen aannemers of grote bouwprojecten.', 1],
  ['p1q5', 'Wie is jouw ideale klant?',
    'Iemand die woont in Amsterdam-Zuid, Oud-West of Amstelveen, een eigen huis heeft, en wil dat het werk meteen goed gebeurt. Iemand die bereid is om iets meer te betalen voor kwaliteit.', 1],
  ['p1q6', 'Wie juist niet?',
    'Mensen die alleen op prijs gaan en drie offertes opvragen. En aannemers die met zes onderaannemers werken. Dat is mijn ding niet.', 1],
  ['p1q7', 'Met wat voor klanten werk je het liefst?',
    'Vaste klanten die me bellen voor onderhoud, kleine spoed, en op een gegeven moment de hele badkamer laten verbouwen. Een soort huisarts voor je huis.', 1],
  ['p1q8', 'Wat maakt deze klanten fijn om mee te werken?',
    'Ze vertrouwen me. Geven me een sleutel als ze niet thuis zijn. Bellen me terug voor de volgende klus. Dat is goud waard.', 1],
  ['p1q9', 'Met wat voor klanten liever niet?',
    'Mensen die zelf eerst hebben staan klooien en het erger hebben gemaakt. En dan op mij rekenen om de schade te beperken voor het oude tarief.', 1],
  ['p1q10', 'Wat gaat er dan meestal mis?',
    'Kapotte leidingen, water in de fundering, een veel grotere klus dan nodig was. En soms boze klanten die het gevoel hebben dat ze meer moeten betalen door hun eigen actie.', 1],

  // ---------- DEEL 2 ----------
  ['p2q1', 'Welke problemen zie je bij klanten voordat ze bij jou komen?',
    'Ze zitten met een lekkage of een kapotte ketel en weten niet wie ze moeten bellen. Iedereen lijkt hetzelfde, en ze zijn bang voor torenhoge facturen achteraf.', 2],
  ['p2q2', 'Hoe uit zich dit probleem in de praktijk?',
    'Het is meestal acuut. Water op de vloer, geen warm water, ketel die foutmelding geeft. Ze googelen "loodgieter Amsterdam spoed" en bellen de eerste die opneemt.', 2],
  ['p2q3', 'Wat hebben ze vaak al geprobeerd?',
    'Ze hebben drie loodgieters gebeld, twee namen niet op, één kwam pas over twee dagen. Of ze hebben zelf naar YouTube gekeken en het erger gemaakt.', 2],
  ['p2q4', 'Waarom werkte dat niet?',
    'Omdat de meeste loodgieters overvol zitten en spoed alleen tegen krankzinnige tarieven doen. Of ze sturen jonge knechten die het probleem niet zien.', 2],
  ['p2q5', 'Wat frustreert hen het meest?',
    'Het gevoel dat ze afgezet worden. Onduidelijke facturen, voorrijkosten van 95 euro voor 5 minuten werk, en geen uitleg over wat er precies gebeurd is.', 2],
  ['p2q6', 'Wat kost dit hen aan tijd, geld of energie?',
    'Bij een lekkage kost elk uur dat ze wachten meer schade. Vloeren, plafonds, soms de buren. Niet kunnen douchen, geen verwarming. Echte impact op je dagelijks leven.', 2],
  ['p2q7', 'Wat gebeurt er als ze niets doen?',
    'Dan kiezen ze de eerste die opneemt, betalen veel te veel, en denken: dit doe ik nooit meer zo. Of ze laten het slepen en het wordt alleen maar duurder.', 2],

  // ---------- DEEL 3 ----------
  ['p3q1', 'Hoe help jij klanten precies?',
    'Je belt me, ik ben er meestal binnen het uur als het spoed is. Ik kijk wat er aan de hand is, leg uit wat de oplossing is en wat het gaat kosten. Geen verrassingen achteraf.', 3],
  ['p3q2', 'Waar begin je altijd mee?',
    'Met de telefoon. Eerst een paar vragen om te begrijpen wat er aan de hand is. Soms kan ik aan de telefoon al zeggen of het echt spoed is of dat het tot morgen kan wachten.', 3],
  ['p3q3', 'Hoe ziet een traject of samenwerking eruit?',
    'Klant belt of stuurt WhatsApp, ik reageer meestal binnen 15 minuten. Spoed is binnen het uur ter plaatse. Ik los op, factureer direct via mail, klaar. Voor renovaties: opname, offerte, planning, uitvoering.', 3],
  ['p3q4', 'Kun je dit stap voor stap uitleggen?',
    'Spoed: bel, ik kom, ik los op, je krijgt de factuur per mail. CV-onderhoud: ik plan een afspraak, het duurt ongeveer een uur, je krijgt een rapport. Renovatie: opname op locatie, gedetailleerde offerte met fasering, na akkoord plan ik in en regel ik alles van afvoer tot tegelzetter.', 3],
  ['p3q5', 'Wat maakt jouw aanpak anders dan anderen?',
    'Ik ben echt 24/7 bereikbaar, geen voicemail of antwoorddienst. Ik leg uit wat ik doe en waarom. En ik geef altijd vooraf een prijs door, geen open einde. Spoed buiten kantoortijden heeft een vaste toeslag van 95 euro, geen rariteiten.', 3],
  ['p3q6', 'Waarom werkt dit wel?',
    'Omdat klanten weten waar ze aan toe zijn. Geen onduidelijkheid, geen onverwachte facturen, geen kwakwerk. Ze bellen me terug omdat het werk gewoon klopt.', 3],
  ['p3q7', 'Wat zeggen klanten hierover?',
    'Ze zeggen: eindelijk eens een loodgieter die opneemt, op tijd komt en ook nog eens uitlegt wat hij doet. En de prijs klopt achteraf met wat afgesproken was.', 3],

  // ---------- DEEL 4 — Service 1: Spoedservice ----------
  ['p4_s1_q1', 'Hoe heet deze dienst en wat houdt die in?',
    '24/7 Spoedservice. Lekkages, verstoppingen, kapotte ketels. Ik ben binnen het uur ter plaatse, ook \'s avonds en in het weekend. Buiten kantoortijden 95 euro spoedtoeslag.', 4],
  ['p4_s1_q2', 'Waarom heb je deze dienst zo ingericht?',
    'Omdat een lekkage of een storing in de ketel niet kan wachten. Ik hou een aantal slots vrij in mijn agenda zodat ik altijd kan komen.', 4],
  ['p4_s1_q3', 'Voor wie is deze dienst bedoeld?',
    'Mensen met een acuut probleem. Lekkage, verstopping die niet weggaat, ketel die uitvalt midden in de winter.', 4],
  ['p4_s1_q4', 'In welke situatie zit iemand dan?',
    'Acuut. Ze willen het probleem nu opgelost, niet morgen, en zeker geen wachttijd van twee dagen.', 4],
  ['p4_s1_q5', 'Welk probleem lost deze dienst op?',
    'Schade beperken bij lekkage, en zorgen dat ze gewoon kunnen douchen, koken en verwarmen vandaag nog.', 4],
  ['p4_s1_q6', 'Wat verandert er concreet?',
    'Het probleem is binnen één bezoek opgelost. Geen vervolgafspraken nodig voor het standaardwerk.', 4],
  ['p4_s1_q7', 'Wat levert het op?',
    'Spoedoplossing met vooraf afgesproken prijs. Werk plus materiaal op één factuur, betaling per tikkie of overschrijving.', 4],
  ['p4_s1_q8', 'Wat merkt de klant als eerste?',
    'De rust dat het opgelost is en dat de schade niet erger wordt.', 4],

  // ---------- DEEL 4 — Service 2: CV-ketel onderhoud ----------
  ['p4_s2_q1', 'Hoe heet deze dienst en wat houdt die in?',
    'CV-ketel onderhoud. Jaarlijkse keuring en onderhoudsbeurt voor je cv-ketel, inclusief afstellen, schoonmaken en check op veiligheid. 89 euro voor een standaard beurt.', 4],
  ['p4_s2_q2', 'Waarom heb je deze dienst zo ingericht?',
    'Een goed onderhouden cv-ketel gaat 4 tot 6 jaar langer mee en gebruikt minder gas. En je voorkomt 80 procent van de spoedstoringen.', 4],
  ['p4_s2_q3', 'Voor wie is deze dienst bedoeld?',
    'Iedereen met een cv-ketel die ouder is dan 2 jaar. Vooral mensen die in de winter geen risico willen lopen.', 4],
  ['p4_s2_q4', 'In welke situatie zit iemand dan?',
    'Ketel werkt nog, maar er staat al even een storingscode of de cv heeft moeite om op te starten in de ochtend.', 4],
  ['p4_s2_q5', 'Welk probleem lost deze dienst op?',
    'Voorkomen dat de ketel midden in de winter uitvalt. Lagere energiekosten. Veiligheid van je gezin.', 4],
  ['p4_s2_q6', 'Wat verandert er concreet?',
    'Ze hebben een ketel die het hele jaar zonder gemor draait, lagere stookrekening, en een keuringsrapport voor de verzekering.', 4],
  ['p4_s2_q7', 'Wat levert het op?',
    'Een schone, veilige, efficiënte ketel plus een keuringsrapport. Ik geef garantie van 6 maanden op het werk.', 4],
  ['p4_s2_q8', 'Wat merkt de klant als eerste?',
    'Dat de ketel stiller draait en de eerste paar weken na het onderhoud zichtbaar minder gas gebruikt.', 4],

  // ---------- DEEL 4 — Service 3: Badkamerrenovatie ----------
  ['p4_s3_q1', 'Hoe heet deze dienst en wat houdt die in?',
    'Complete badkamerrenovatie. Van slopen tot tegelzetten en afmonteren. Ik regel alles: tegelzetter, elektricien, afvoer. Eén aanspreekpunt, vaste prijs, vaste opleverdatum. Vanaf 8.500 euro voor een standaard badkamer.', 4],
  ['p4_s3_q2', 'Waarom heb je deze dienst zo ingericht?',
    'Omdat klanten geen zin hebben om zelf zes verschillende vakmannen aan te sturen. Ik neem dat hele gedoe over.', 4],
  ['p4_s3_q3', 'Voor wie is deze dienst bedoeld?',
    'Mensen met een gedateerde badkamer die toe is aan vervanging. Vaak is de cv-ketel of de leidingen ook aan vernieuwing toe, dat pak ik dan meteen mee.', 4],
  ['p4_s3_q4', 'In welke situatie zit iemand dan?',
    'Hun badkamer is 15 tot 25 jaar oud. Het werkt nog, maar het ziet eruit als 1995 en ze willen iets moderns. Of er is sprake van schimmel of slecht functionerende afvoer.', 4],
  ['p4_s3_q5', 'Welk probleem lost deze dienst op?',
    'Een gedoe-vrije renovatie. Eén aanspreekpunt, transparante prijs, geen verrassingen, en een opleverdatum die klopt.', 4],
  ['p4_s3_q6', 'Wat verandert er concreet?',
    'Ze hebben een nieuwe badkamer waar ze trots op zijn, in 2 tot 3 weken klaar, voor een prijs die ze vooraf wisten.', 4],
  ['p4_s3_q7', 'Wat levert het op?',
    'Een complete badkamerrenovatie inclusief afvoer, water, elektra, tegelwerk en sanitair. 5 jaar garantie op mijn werk.', 4],
  ['p4_s3_q8', 'Wat merkt de klant als eerste?',
    'De rust dat het allemaal door één persoon gecoördineerd wordt. Geen wirwar van vakmensen die elkaar tegenwerken.', 4],

  // ---------- DEEL 5 ----------
  ['p5q1', 'Kun je een of meerdere klanten beschrijven?',
    'Mevrouw De Vries uit Amstelveen. Lekkage achter de muur, water dat naar beneden liep tot in de keuken eronder. Ze had al twee loodgieters gebeld, een kwam niet, de ander wilde 350 euro voorrijkosten.', 5],
  ['p5q2', 'Hoe kwamen ze bij jou binnen?',
    'Via Google. Ze zocht "loodgieter Amsterdam spoed" en zag mijn bedrijf bovenaan staan.', 5],
  ['p5q3', 'Wat was hun situatie voor de samenwerking?',
    'Paniek. Water dat al een uur naar beneden druppelde, vloer onder water, geen idee hoe ze het moest stoppen.', 5],
  ['p5q4', 'Waar liepen ze op vast?',
    'Ze wist niet welke loodgieter te vertrouwen na de twee mislukte pogingen. En ze was bang voor de rekening.', 5],
  ['p5q5', 'Wat is er veranderd na de samenwerking?',
    'Ik was er binnen 35 minuten. Heb de hoofdkraan dichtgedraaid, het lek gelokaliseerd, en in 2 uur opgelost. Ze had eindrekening van 285 euro inclusief materiaal.', 5],
  ['p5q6', 'Kun je dit concreet maken?',
    'Mevrouw De Vries belt me nu voor alles, heeft ook haar zus en haar buurman aanbevolen. Drie nieuwe vaste klanten uit één spoedklus.', 5],
  ['p5q7', 'Heb je cijfers, voorbeelden of quotes die je wilt delen?',
    'Op Google staat 4.8 sterren met 47 reviews. De meest recente: "Henk kwam binnen het uur, loste het op, en gaf een eerlijke factuur. Een zeldzaamheid in deze branche."', 5],

  // ---------- DEEL 6 ----------
  ['p6q1', 'Hoe ben je dit werk gaan doen?',
    'Ik ben begonnen op mijn 16e als leerling-monteur bij een groot installatiebedrijf. Daar leerde ik de basis. Met 24 ben ik voor mezelf begonnen omdat ik genoeg had van de manier waarop grote bedrijven met klanten omgaan.', 6],
  ['p6q2', 'Wat was de aanleiding?',
    'Een klant van mijn toenmalige werkgever. Bejaarde meneer, simpele klus, maar mijn werkgever rekende vier uur waar ik er één had gedaan. Toen wist ik: dit doe ik niet meer zo.', 6],
  ['p6q3', 'Waarom bestaat jouw bedrijf?',
    'Omdat ik geloof dat een loodgieter er moet zijn voor mensen, niet voor zijn eigen factuur. Snel, eerlijk, vakkundig. Daar krijg je vaste klanten van.', 6],
  ['p6q4', 'Welk probleem wil je oplossen in de wereld?',
    'Het wantrouwen tussen klanten en loodgieters wegnemen. Mensen verdienen iemand die hun probleem oplost zonder ze te plukken.', 6],
  ['p6q5', 'Waar geloof jij sterk in binnen jouw vak?',
    'Eerlijke prijzen, vaste afspraken, en altijd uitleggen wat ik doe. Een klant die snapt waarom ik iets doe is een tevreden klant.', 6],
  ['p6q6', 'Wat doe jij bewust anders?',
    'Ik geef altijd een prijs vooraf. Ik werk 24/7 zelf, geen onderaannemers die jouw lekkage proberen op te lossen. En ik blijf betrokken: een jaar later check ik nog of het allemaal nog goed werkt.', 6],

  // ---------- DEEL 7 ----------
  ['p7q1', 'Wat wil je betekenen voor je klanten?',
    'Hun loodgieter zijn. Niet die ene gast die ze één keer belden, maar degene die ze opslaan in hun telefoon onder "mijn loodgieter".', 7],
  ['p7q2', 'Wat moeten ze aan jou overhouden?',
    'Een huis dat goed onderhouden is. En het gevoel dat ze altijd iemand hebben om te bellen als er iets is.', 7],
  ['p7q3', 'Waar wil je over 5 jaar staan?',
    'Een vast klantenbestand van 800 huishoudens in Amsterdam en Amstelland. Een vaste medewerker zodat ik kan opschalen zonder kwaliteit in te leveren.', 7],
  ['p7q4', 'Wat is je grotere ambitie?',
    'Het standaardbeeld van de loodgieter veranderen. Niet die boze man die je probeert te plukken, maar een vakman die je vertrouwt.', 7],
  ['p7q5', 'Welke waarden zijn voor jou niet onderhandelbaar?',
    'Eerlijkheid. Vakmanschap. Op tijd komen. Geen verborgen kosten. En altijd opnemen als de telefoon gaat. VCA-gecertificeerd, aangesloten bij Techniek Nederland en BouwGarant.', 7],
  ['p7q6', 'Hoe merken klanten dit?',
    'Doordat ze het zelf merken. Ze bellen een volgende keer terug. Ze geven mijn nummer aan vrienden. En ze klagen niet over de factuur.', 7],

  // ---------- DEEL 8 ----------
  ['p8q1', 'Welke vragen krijg je het vaakst van klanten?',
    'Wat kost een spoedklus? Reken je voorrijkosten? Wat is je tarief in het weekend? Heb je garantie?', 8],
  ['p8q2', 'Wanneer stellen ze deze vragen?',
    'Bijna altijd in het eerste telefoongesprek. Mensen willen weten waar ze aan toe zijn voordat ze me laten komen.', 8],
  ['p8q3', 'Waar twijfelen mensen over voordat ze instappen?',
    'Of ze niet meer betalen dan nodig is. En of ze niet later nog een rekening krijgen die ze niet hadden verwacht.', 8],
  ['p8q4', 'Wat stellen ze vaak niet hardop?',
    'Of ik wel echt loodgieter ben en geen klusjesman die zich zo noemt. En of ik gecertificeerd ben.', 8],
  ['p8q5', 'Welke misverstanden bestaan er over jouw werk?',
    'Dat alle loodgieters duur zijn en je proberen op te lichten. En dat spoedklussen altijd minimaal 500 euro kosten.', 8],

  // ---------- DEEL 10 ----------
  ['p10q1', 'Wanneer moeten mensen volgens jou contact opnemen?',
    'Bij elk lekkend apparaat, een ketel die uitvalt, of als ze hun badkamer willen renoveren. Of voor jaarlijks onderhoud.', 10],
  ['p10q2', 'In welke fase zitten ze dan?',
    'Spoed: paniek, willen direct iemand. Onderhoud: rustig, planmatig. Renovatie: oriënterend, vergelijkend.', 10],
  ['p10q3', 'Wat gebeurt er als iemand contact opneemt?',
    'Telefoon: ik neem op, ook \'s avonds en in het weekend. Mail of WhatsApp: binnen 15 minuten antwoord tijdens kantooruren, anders de volgende ochtend.', 10],
  ['p10q4', 'Hoe ziet dat proces eruit?',
    'Spoed: bellen, ik kom. Onderhoud: bellen of mailen, we plannen een datum. Renovatie: bellen voor opname, ik kom langs, je krijgt offerte binnen 3 dagen.', 10],
  ['p10q5', 'Wat wil je dat iemand voelt bij het opnemen van contact?',
    'Vertrouwen. Dat ze denken: deze man neemt zijn werk serieus en ik wordt geholpen.', 10],
  ['p10q6', 'Wat zijn je contactgegevens?',
    'Telefoon: 06-12345678 (24/7). E-mail: henk@henkloodgieter.nl. Adres: Werkplaats Henk, Industrieweg 24, 1014 Amsterdam. WhatsApp via hetzelfde nummer. Geen Instagram of Facebook.', 10],
  ['p10q7', 'Wil je dat je telefoonnummer en e-mail zichtbaar zijn op de website?',
    'Ja, telefoon en mail mogen prominent zichtbaar zijn. Liefst op elke pagina. Direct bellen is veruit de beste actie.', 10],
  ['p10q8', 'Heb je al een bedrijfsnaam, logo en huisstijlkleuren?',
    'Henk Loodgietersbedrijf. Ik heb een logo (hamer met druppel), kleuren zijn donkerblauw en oranje. Ik heb VCA-certificaat, ben aangesloten bij Techniek Nederland en heb het BouwGarant-keurmerk.', 10],
  ['p10q9', 'Heb je al teksten of content die je wilt hergebruiken?',
    'Nee, alles moet nieuw.', 10],
  ['p10q10', 'Zijn er juridische pagina\'s nodig?',
    'Privacyverklaring is verplicht. Algemene voorwaarden voor de renovatieklussen.', 10],
  ['p10q11', 'Hoe wil je overkomen op je website? Spreek je klanten aan met "je" of "u"?',
    'Direct, vakkundig, geen poespas. Spreek klanten aan met u, dat past bij mijn doelgroep van 35-65 jarige huiseigenaren.', 10],
  ['p10q12', 'Welke pagina\'s wil je op je website?',
    'Home, Diensten (met daaronder spoed, onderhoud, renovatie), Over Henk, Ervaringen, Contact.', 10],
  ['p10q13', 'Is er nog iets dat je kwijt wilt over je bedrijf of je website?',
    'Nee, dat was het.', 10],
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

async function main() {
  const t0 = Date.now();
  const stamp = (label: string) =>
    console.log(`[+${Math.round((Date.now() - t0) / 1000)}s] ${label}`);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  test-content-only-henk — loodgieter (lokale_ambacht)');
  console.log(`  API: ${API_URL}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Test user
  const testEmail = `test-henk-${Date.now()}@webtekst-test.local`;
  const testPassword = 'TestRun-Pa55word!ABC';

  stamp(`Creating test user ${testEmail}…`);
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });
  if (createErr || !created?.user) throw new Error(`createUser failed: ${createErr?.message ?? 'no user'}`);
  const userId = created.user.id;

  const { data: signed, error: signErr } = await pub.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  if (signErr || !signed.session?.access_token) throw new Error(`signIn failed: ${signErr?.message ?? 'no session'}`);
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
      { name: 'Henk Loodgietersbedrijf - Test' }
    );
    const projectId = project.id;
    stamp(`✓ Project ${projectId}`);

    // 3. Seed answers + archetype
    stamp(`Seeding ${SEED_ANSWERS.length} interview answers + archetype lokale_ambacht…`);
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
        archetype: 'lokale_ambacht',
        sub_archetype: null,
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
      throw new Error(`Generation did not complete (status=${status}).`);
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
    if (KEEP) console.log('\n  KEEP=1 set — leaving test user + project intact.');
    else await cleanup();
  } catch (err) {
    console.error('\n✗ FAILED:', err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) console.error(err.stack);
    await cleanup();
    process.exit(1);
  }
}

void main();
