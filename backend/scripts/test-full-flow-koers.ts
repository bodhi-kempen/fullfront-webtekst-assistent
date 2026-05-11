/**
 * End-to-end smoke test — Adviesbureau Koers (service_zzp / service mode).
 *
 * Tests how the interview handles a B2B service business with three
 * substantial offerings, each with detailed pricing and timeline. The
 * service-loop in DEEL 4 should ask 8 questions per service across all
 * three; service-mode wording should stay throughout.
 *
 * Run from backend/:
 *   API_URL=https://webtekst.fullfront.nl KEEP=1 \
 *     npx tsx scripts/test-full-flow-koers.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const KEEP = process.env.KEEP === '1';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env vars.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const pub = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Adviesbureau Koers — service_zzp B2B, drie consultancy-trajecten.
// ---------------------------------------------------------------------------

const ANSWERS_BY_PART: Record<number, string[]> = {
  1: [
    'Ik ben Jeroen de Groot, marketing-strateeg met 15 jaar ervaring. Adviesbureau Koers helpt mkb-bedrijven van 10 tot 50 medewerkers om hun positionering en groei strategisch op orde te krijgen. Drie kerntrajecten: merkstrategie, contentstrategie en groeiplannen. Werken vanuit Amsterdam, klanten door heel Nederland.',
    'Omdat te veel goede bedrijven zonder duidelijke koers werken. Ze hebben een product dat klopt en een team dat hard werkt, maar ze missen de strategische heldere lijn. Het verschil tussen kop loop en doelgericht groeien is vaak een kwestie van een paar weken aandachtige denkhulp.',
    'Een onafhankelijk strategisch klankbord voor mkb-directies. Ik help met merkstrategie, contentstrategie en groeiplannen. Drie trajecten van enkele weken die samen of los kunnen worden afgenomen. Geen retainer, geen "nog wat extra werk er bovenop" — duidelijke afspraken, duidelijke deliverables.',
    'Mkb-bedrijven met 10 tot 50 medewerkers en een omzet tussen 1 en 15 miljoen. Vaak family-businesses, ondernemers met een product dat al werkt maar die de volgende fase willen ingaan. Sectoren: industrie, professionele dienstverlening, B2B-services.',
    'Een directeur of marketing-verantwoordelijke die zichzelf eerlijk afvraagt: weten we genoeg over onze markt? Klopt onze positionering nog? Iemand die durft te investeren in denkwerk en geen genoegen neemt met "we doen al wel iets met marketing".',
    'Bedrijven die een quick fix zoeken en denken dat een week consulting hun problemen oplost. Of grote corporates met te veel stakeholders waar ik geen impact kan maken zonder maandenlang stakeholder-management.',
    'Klanten die ruimte geven voor het werk en de tijd nemen om input te leveren. Die hun team meenemen in het proces en niet vergaderen om te vergaderen. En die op het einde van een traject ook werkelijk doorvoeren wat we hebben uitgewerkt.',
    'Ze nemen het denkwerk serieus, leveren tijdig de informatie aan die ik nodig heb, en gaan in dialoog over de strategische keuzes. Ze vragen om eerlijke feedback en zijn bereid om vastgeroeste aannames los te laten.',
    'Klanten die in elke meeting nieuwe stakeholders meebrengen, of die na vier weken werk fundamenteel ander uitgangspunt willen. Ook bedrijven waar de directeur het traject delegeert aan iemand die er geen mandaat bij heeft.',
    'Het traject loopt vast omdat de besluitvorming verspreid is. Ik lever uitstekende strategische plannen op die niet worden uitgevoerd omdat de directie er niet aan tafel zat. Voor mij geen zinvol werk en voor hen geen rendement.',
  ],
  2: [
    'Ze hebben hard gewerkt om hun bedrijf op te bouwen maar voelen dat de groei stagneert of dat ze in cirkels lopen. Ze zien concurrenten die ze eerder voorbij waren, en weten niet zeker meer wat hun écht onderscheidende kant is. Vaak is de positionering organisch ontstaan zonder bewust strategisch besluit.',
    'Marketing-budget gaat op aan losse campagnes zonder duidelijk verhaal. Verkoop-team verkoopt op prijs in plaats van op waarde. Het management vraagt zich af: wat is onze strategie, en is dit nog wel het juiste pad?',
    'Vaak hebben ze al wat geprobeerd. Een nieuwe website, een aantal LinkedIn-campagnes, een interne brainstorm met de marketing-medewerker. Ze hebben misschien een trainee-onderzoek laten doen of een marketingbureau aangenomen voor de uitvoering.',
    'Omdat de basis niet klopt. Een nieuwe website zonder strategie is gewoon een nieuwe website met dezelfde teksten. LinkedIn-campagnes zonder positioneringsverhaal vallen bij de concurrentie in het niet. En een marketingbureau voor de uitvoering kan geen positionering bepalen — daar moet de directie zelf over.',
    'De gedachte dat ze hard werken en weinig zien terugkomen. Dat ze in vergaderingen rondjes draaien. En het gevoel dat anderen de markt sneller doorzien dan zij — terwijl zij vaak al jaren op die markt zitten en het beter zouden moeten weten.',
    'Bedrijven die strategisch verdwalen verliezen 6 tot 18 maanden aan onnodige tactiek voor er iets verandert. Dat is voor een mkb-bedrijf van 5 miljoen omzet al snel een verlies van enkele honderdduizenden aan verloren effectiviteit.',
    'Ze blijven hangen in operationeel werk en verliezen marktaandeel aan concurrenten die hun verhaal helderder hebben. De afstand tussen wat het bedrijf doet en wat de markt nodig heeft groeit.',
  ],
  3: [
    'Ik begin altijd met een verkenning van waar het bedrijf nu staat: huidige positionering, marktbeeld, concurrentie. Dan stellen we samen vast welk traject het meeste oplevert — soms is dat merkstrategie, soms eerst een groeiplan, soms een complete combinatie.',
    'Met luisteren. Eerst een uur met de directie waarin ik vooral vraag en zij vertellen waar ze stuk lopen. Daarna doe ik een analyse van hun website, hun marktcommunicatie, en de concurrenten — voordat ik überhaupt advies geef.',
    'Verkenning (1 uur, gratis), offerte met afbakening en planning, kick-off met directie en sleutelmensen, week-tot-week werkfases met tussentijdse afstemming, eindpresentatie en oplevering, en een evaluatiegesprek 6 weken na oplevering om te kijken wat er staat.',
    'Stap 1: kennismaking en eerste verkenning (1 uur). Stap 2: offerte met scope en planning. Stap 3: kick-off met directie. Stap 4: deskresearch en interviews. Stap 5: tussenresultaten met directie afstemmen. Stap 6: doorwerking en finalisering. Stap 7: presentatie aan team. Stap 8: oplevering en evaluatie.',
    'Ik werk altijd alleen met de directie. Dat is bewust — strategie hoort op directieniveau te worden gemaakt en gedragen, niet gedelegeerd naar een marketing-medewerker. Verder werk ik volgens een vaste methodiek (Koers Framework), opgebouwd in 15 jaar praktijk.',
    'Omdat strategie alleen werkt als de mensen die hem moeten dragen er ook zelf bij betrokken zijn. Bedrijven die mij delegeren naar een junior krijgen een goed plan, maar het komt niet tot uitvoering. Bedrijven waar de directie aan tafel zit krijgen een plan dat ze ook kunnen verdedigen.',
    'Klanten zeggen dat ik hen helpt zien wat ze zelf al wisten maar niet konden formuleren. En dat ze na een traject met meer rust beslissingen nemen omdat de strategische lijn helder is.',
  ],
  5: [
    'Bonnefooi BV, een mkb-installatiebedrijf in Eindhoven met 35 medewerkers en 6 miljoen omzet. Familiebedrijf in tweede generatie, hadden last van prijsdruk van grote concurrenten en groeistagnatie.',
    'Via een aanbeveling van hun accountant. Hun directeur Wim wilde geen marketingbureau, hij wilde iemand die hem strategisch zou helpen.',
    'Ze waren een goed bedrijf zonder duidelijk verhaal. Hun website was generiek ("wij installeren installaties"), hun verkoop draaide op offertewerk, en ze verloren steeds meer aanbestedingen op prijs.',
    'Ze konden hun toegevoegde waarde niet helder uitleggen. Wim wist het zelf wel ("wij komen op tijd, leveren netjes op, en ons werk hangt 25 jaar"), maar het stond nergens. Verkopers verkochten op uurtje-factuurtje.',
    'Met een merkstrategie- en groeiplan-traject hebben we hun positionering verfijnd ("De installatie die je niet meer hoort, voor 25 jaar zonder zorg") en een groeistrategie opgesteld richting projectontwikkelaars en housing corporations. Hun marketing-budget is gehalveerd, hun groei is verdubbeld.',
    'Wim schreef ons na 6 maanden: "We hebben voor het eerst in vijf jaar een prijsverhoging doorgevoerd zonder dat één klant ons heeft verlaten. Het verschil zit in dat we nu eindelijk weten waarom mensen voor ons kiezen. Bedankt." Ze hebben sindsdien drie nieuwe medewerkers aangenomen en een uitbreiding gepland.',
    'We hebben 4.9 sterren op Google met 34 reviews. Ongeveer 70 procent van onze klanten boekt een vervolg-traject binnen 12 maanden, en 60 procent komt via doorverwijzing van eerdere klanten. We werken met 12 tot 15 klanten per jaar, dat is bewust zo gehouden.',
  ],
  6: [
    'Ik ben strategisch consultant geworden via een omweg. Eerst marketing studeren, daarna 8 jaar bij een groot communicatiebureau in Amsterdam, vervolgens 5 jaar marketing-directeur bij een mkb-leverancier in de techniek. Daar leerde ik de mkb-realiteit van binnenuit kennen, en zag ik wat er mis ging als strategie ontbrak.',
    'Een directeur die mij in 2018 vroeg of ik niet vrij wilde komen om hem strategisch bij te staan. Op dat moment werkte ik nog parttime, maar binnen drie maanden had ik genoeg klanten om volledig over te schakelen.',
    'Omdat goed advies aan mkb-bedrijven impact heeft. Niet alleen voor de bedrijven zelf, maar ook voor de tientallen of honderden mensen die er werken. Strategie die op tijd komt redt banen en bouwt duurzame bedrijven.',
    'De gedachte dat strategisch advies alleen voor multinationals zou zijn. Het mkb verdient ook strategische diepgang, en het is mijn ambitie om dat tegen redelijke prijzen toegankelijk te houden.',
    'Heldere taal, geen jargon, en strategie die uitvoerbaar is. Ik heb een hekel aan adviesrapporten die in een la verdwijnen. Mijn werk staat of valt bij wat de klant er na zes maanden mee heeft gedaan.',
    'Ik werk alleen met de directie zelf, en ik werk altijd binnen een vooraf afgesproken scope en termijn. Geen openeinde-trajecten waarbij we onmerkbaar in een retainer terechtkomen. En ik geef altijd ruimte voor een second opinion van de klant — als ze twijfelen, hoor ik dat liever vroeg dan laat.',
  ],
  7: [
    'Een stille kracht achter de schermen die mkb-bedrijven hun koers laat hervinden. Niemand kijkt naar mij; iedereen kijkt naar wat het bedrijf bereikt. Dat is hoe het hoort.',
    'Een gevoel dat ze meester zijn over hun strategie en niet meer reactief reageren op de markt. Dat ze bewust kiezen waar ze tijd en geld aan besteden.',
    'Een vast referentiepunt voor strategisch advies in het Nederlandse mkb. Met een eigen Koers-methode die andere consultants ook leren toe te passen, mogelijk via een korte opleiding voor strategisch consultants.',
    'Aantonen dat strategie geen luxe is voor mkb maar een noodzaak. En een nieuwe generatie strategisch consultants opleiden die met diezelfde rust en helderheid werken.',
    'Onafhankelijkheid van uitvoeringspartijen — ik raad nooit een uitvoerende partij aan waarmee ik commerciële banden heb. Eerlijke afbakening van scope. En geen bullshit in deliverables.',
    'Aan de tijd die ik steek in het vooraf goed afbakenen van het traject. Aan dat ik geen aanvullende facturen stuur voor "extra werk". En aan dat ik op het einde van een traject afscheid neem in plaats van te lobbyen voor een vervolg.',
  ],
  8: [
    'Hoe lang duurt zo\'n traject? Wat als we halverwege zien dat we eigenlijk een andere richting op moeten? Werkt u ook met onze bestaande marketing-medewerkers? Wat is het verschil tussen u en een marketingbureau?',
    'Vaak in het kennismakingsgesprek of in de offerte-fase. Soms ook tijdens het traject zelf, als zaken anders blijken te liggen dan eerst gedacht.',
    'Twijfel of de investering zich terugverdient. Een merkstrategie-traject van 4500 euro is voor een mkb-bedrijf een serieuze investering. Mensen vragen zich af of ze niet beter een marketingbureau kunnen inhuren voor uitvoering.',
    'Of ze "rijp genoeg" zijn voor strategische adviezen. Sommige directeuren denken dat hun bedrijf te klein is, of te traditioneel, voor strategie-werk.',
    'Dat strategisch advies abstract en theoretisch is. Mijn deliverables zijn juist heel concreet: een positioneringsstatement van twee zinnen, een groeiplan met meetbare KPI\'s, een contentkalender met 12 onderwerpen. Niets is vaag.',
  ],
  10: [
    'Op het moment dat een directeur of het managementteam zich afvraagt: zijn we nog op koers? Vaak is dat na een jaar van stagnerende omzet, na een nieuwe concurrent in de markt, of na een verandering in de marktomgeving (bijvoorbeeld een nieuwe wet of trend).',
    'Vaak in een fase waarin het bedrijf op zich gezond is maar waarin de directie strategisch ergens aan twijfelt. Geen brand of crisis, eerder een onderbuikgevoel dat de huidige aanpak niet meer voldoet voor de komende drie jaar.',
    'Mail of telefoon: ik antwoord persoonlijk binnen één werkdag. We plannen een verkenningsgesprek van een uur — gratis en vrijblijvend — en bepalen samen of een traject zinvol is. Pas daarna komt er een offerte.',
    'Mail of telefoon → terugbelling binnen één werkdag → 1-uurs verkenningsgesprek → offerte met scope en tijdslijn → kick-off → werkfases → oplevering → evaluatie na 6 weken.',
    'Vertrouwen, rust en helderheid. Ze moeten het idee hebben: hier is iemand die naar mijn bedrijf luistert voordat hij een mening heeft. Niet een verkooppraat, eerder een gesprek tussen twee professionals.',
    'Telefoon: 020-7654321. E-mail: jeroen@adviesbureaukoers.nl. Adres: Herengracht 500, 1017 CB Amsterdam. Website: adviesbureaukoers.nl. LinkedIn: jeroen-de-groot-adviesbureau-koers. Geen Instagram of andere consumer-platforms.',
    'Ja, alles mag zichtbaar op de website: telefoon, e-mail, adres, LinkedIn-profiel.',
    'Adviesbureau Koers. Logo: stilistische kompas-roos in donkergrijs op crèmewitte achtergrond. Huisstijlkleuren: donkergrijs (bijna zwart), crèmewit, en goud-geel als accentkleur. Lettertype: een serif voor de titels (gravitas), een eenvoudige sans-serif voor de lopende tekst.',
    'Op de huidige website staat al wat tekst, maar die voelt te corporate en te wij-vorm. Mag opnieuw geschreven worden. Op LinkedIn heb ik wel een paar artikelen die de toon en denkwijze goed laten zien.',
    'Privacyverklaring nodig. Algemene voorwaarden (afbakening scope, betalingstermijn 30 dagen, vertrouwelijkheidsclausule). Beide moeten op de website staan.',
    'Professioneel maar niet stijf. Helder en concreet, geen consultancy-jargon. Spreek lezers aan met "je", niet met "u" — dat past beter bij de mkb-doelgroep waar we mee werken. Eerder warm en betrokken dan formeel.',
    'Ja, dat klinkt prima.',
    'Nee, ik denk dat we alles hebben gehad. Het belangrijkste is: laat de teksten klinken zoals iemand die zijn vak kent en het in heldere taal vertelt, zonder consulting-bullshit.',
  ],
};

// p4 — drie consultancy-trajecten met uitgebreide antwoorden
const SERVICES = [
  {
    name: 'Merkstrategie',
    answers: [
      'Merkstrategie-traject. We werken aan vier elementen: merkidentiteit (wie ben je), positionering (welke plek in de markt), merkarchitectuur (hoe verhouden je producten of diensten zich), en visuele identiteit (vertaling naar uitstraling). Traject van 6 tot 8 weken, prijs 4.500 euro exclusief btw, inclusief alle interviews, deskresearch, sessies en eindpresentatie.',
      'Merkstrategie is de basis voor alle communicatie en verkoop. Zonder een heldere positionering bouw je marketing op drijfzand. Daarom is dit vaak het eerste traject dat ik adviseer als een bedrijf bij me komt zonder duidelijk verhaal.',
      'Voor mkb-directies die voelen dat hun positionering niet meer klopt of nooit bewust is bepaald. Vaak bedrijven met meerdere productlijnen of diensten die nu door elkaar lopen, of met een commodity-product dat verkoopt op prijs.',
      'Het bedrijf is op zich gezond maar de marketing-resultaten lopen achteruit. Of er is een grote investering nodig (nieuwe website, een rebranding) en de directie wil eerst de basis hebben.',
      'De wens om met meer rust en helderheid de markt op te kunnen. Niet meer iedereen-verkopen-aan-iedereen, maar weloverwogen kiezen waar je je inzet.',
      'Een tweegezindheid in de directie wordt opgelost. Verkoop kan met meer overtuiging een prijs verdedigen. Marketing-budget gaat naar de juiste boodschap. En binnen 6 maanden zien we vaak een meetbare impact op de conversie van offertes.',
      'Een positioneringsstatement van twee zinnen, een merkidentiteits-document met de strategische keuzes, een merkarchitectuur-overzicht voor productlijnen, en een visuele identiteits-richtlijn (logo, kleuren, typografie, beeldtaal) klaar voor uitvoering door een vormgever.',
      'De helderheid. Klanten beschrijven na de kick-off al dat ze "hebben opgehelderd wat ze al wisten maar niet konden zeggen". Dat is het moment waarop ik weet dat het traject z\'n waarde gaat opleveren.',
    ],
  },
  {
    name: 'Contentstrategie',
    answers: [
      'Contentstrategie-traject. We werken aan een contentplan voor 12 maanden, een tone of voice-document, een keuze voor de juiste kanalen (LinkedIn, branche-bladen, eigen website, mailings), en een contentkalender met concrete onderwerpen voor het komende jaar. Traject van 4 tot 6 weken, prijs 3.200 euro exclusief btw.',
      'Veel mkb-bedrijven publiceren losse content zonder strategie — een LinkedIn-post als ze ergens aan denken, een nieuwsbrief als ze iets nieuws hebben. Dat levert geen autoriteit op. Met een goede contentstrategie geef je je marketingactiviteiten richting en ritme.',
      'Voor bedrijven die een merkstrategie hebben staan (al dan niet bij ons opgesteld) en die nu de stap willen zetten naar consistent content-werk. Vaak directies die hun thought leadership willen versterken in een gespecialiseerde markt.',
      'Het bedrijf heeft een goede positie maar wordt te weinig zichtbaar in de markt. Of de marketing-medewerker doet wel veel maar zonder dat er een lijn in zit. Of er is geen kennisdeling met de markt terwijl er expertise zit waar de doelgroep iets mee zou kunnen.',
      'De wens om expertise zichtbaar te maken zonder dat het in losse posts blijft hangen. Een richting voor wat te delen, met wie, en in welk ritme.',
      'Marketing-medewerkers krijgen handvatten in plaats van vrije veld. De directeur ziet binnen drie maanden zinvolle reacties op LinkedIn-posts. En de tone of voice raakt vastgelegd zodat verschillende mensen op consistente manier kunnen schrijven.',
      'Een contentstrategie-document, een tone of voice-richtlijn met voorbeelden, een kanaalkeuze met onderbouwing, een contentkalender met 12 specifieke onderwerpen voor de komende 12 maanden, en een meetstructuur voor wat werkt.',
      'De rust. Een marketing-medewerker die elke week opnieuw moet bedenken wat er gepost wordt, krijgt een halfjaar lang vooruit overzicht. Daar verandert direct het tempo en de kwaliteit van wat gedeeld wordt.',
    ],
  },
  {
    name: 'Groeiplan',
    answers: [
      'Groeiplan-traject. We werken aan vier delen: een marktanalyse (waar liggen de kansen), een groeistrategie (welke markten of segmenten ga je bedienen), een implementatieplan (hoe en wanneer ga je dat doen), en een KPI-dashboard (waar stuur je op). Traject van 8 tot 12 weken, prijs 5.500 euro exclusief btw.',
      'Een groeiplan vraagt meer tijd dan een merk- of contentstrategie omdat de marktanalyse aandacht moet krijgen. Daarom is dit het meest uitgebreide traject in onze drie aanbiedingen.',
      'Voor bedrijven met een gezonde basis die de volgende fase willen ingaan. Vaak na een paar jaar van organische groei waarna de groei stagneert, of voor bedrijven die nieuwe markten willen verkennen.',
      'Vaak een directie die op zich tevreden is met de huidige situatie maar weet dat stilstand achteruitgang is. Soms ook na een grote investering (nieuwe machine, nieuwe locatie) waarvan het rendement omhoog moet.',
      'De wens om met meer doelgerichtheid te groeien. Niet "we doen wat we kunnen en hopen dat het werkt", maar "we kiezen drie segmenten en investeren daar gericht in".',
      'De directie weet binnen drie maanden waar ze in zal investeren en waar niet. Het bedrijf wordt selectiever in de markten die ze bedienen. En het management heeft een dashboard waar ze maandelijks op sturen.',
      'Een marktanalyse met segmenten en kansen onderbouwd, een groeistrategie van 5 tot 7 pagina\'s met heldere keuzes, een implementatieplan voor 12 maanden met fases en mijlpalen, en een KPI-dashboard met 5 tot 8 cijfers waar de directie maandelijks op stuurt.',
      'De combinatie van het strategisch denken en de uitvoerbaarheid. Klanten zeggen vaak dat ze al strategieën hadden gezien, maar dat dit de eerste was waar ze ook concreet morgen mee aan de slag konden.',
    ],
  },
];

const META_BLOG_OPTIN_ANSWER = 'Ja, een blog of artikelen-sectie zou zinvol zijn. Ik schrijf ook regelmatig op LinkedIn en die artikelen kunnen mooi samenkomen op een eigen plek.';

const GENERIC_FALLBACKS = [
  'Daar denk ik regelmatig over na. Mijn aanpak komt voort uit 15 jaar werk met mkb-bedrijven en uit de gedachte dat strategie iets is dat door de directie zelf gedragen moet worden, niet gedelegeerd. Ik werk altijd binnen vooraf afgesproken scope, geen openeinde-trajecten.',
  'Dat is een goede vraag, maar wat ik eerder al zei vat het eigenlijk al goed samen. Ik werk volgens een vaste methodiek met heldere deliverables, prijzen vooraf bekend, en geen jargon. Verkenningsgesprek is gratis en vrijblijvend.',
  'Daar zou ik niet veel meer aan toe willen voegen dan ik al heb verteld. Mijn werk staat of valt bij wat klanten er na een paar maanden concreet mee gedaan hebben. Daar laat ik me op afrekenen, niet op mooie rapporten.',
];

let fallbackIdx = 0;
function nextFallback(): string {
  const v = GENERIC_FALLBACKS[fallbackIdx % GENERIC_FALLBACKS.length]!;
  fallbackIdx++;
  return v;
}

function chooseAnswer(questionId: string): string {
  if (questionId.includes('_followup_') || questionId.includes('_extra_')) {
    return nextFallback();
  }
  if (questionId === 'meta_blog_optin') return META_BLOG_OPTIN_ANSWER;
  const moreMatch = questionId.match(/^p4_more_s(\d+)$/);
  if (moreMatch) {
    const sNum = Number(moreMatch[1]);
    return sNum < SERVICES.length
      ? 'Ja, ik heb nog een dienst om te bespreken.'
      : 'Nee, dit zijn de drie kerntrajecten.';
  }
  const sqMatch = questionId.match(/^p4_s(\d+)_q(\d+)$/);
  if (sqMatch) {
    const sIdx = Number(sqMatch[1]) - 1;
    const qIdx = Number(sqMatch[2]) - 1;
    return SERVICES[sIdx]?.answers[qIdx] ?? nextFallback();
  }
  const pqMatch = questionId.match(/^p(\d+)q(\d+)$/);
  if (pqMatch) {
    const part = Number(pqMatch[1]);
    const qIdx = Number(pqMatch[2]) - 1;
    return ANSWERS_BY_PART[part]?.[qIdx] ?? nextFallback();
  }
  return nextFallback();
}

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
  console.log('  Webtekst-assistent — Adviesbureau Koers (service_zzp / service)');
  console.log(`  API: ${API_URL}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const testEmail = `koers-${Date.now()}@webtekst-test.local`;
  const testPassword = 'TestRun-Pa55word!ABC';

  stamp(`Creating test user ${testEmail}…`);
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });
  if (createErr || !created?.user) throw new Error(`createUser failed: ${createErr?.message}`);
  const userId = created.user.id;
  stamp(`✓ User ${userId}`);

  const { data: signed, error: signErr } = await pub.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  if (signErr || !signed.session?.access_token) throw new Error(`signIn: ${signErr?.message}`);
  bearerToken = signed.session.access_token;

  let cleanupDone = false;
  const cleanup = async () => {
    if (cleanupDone || KEEP) return;
    cleanupDone = true;
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch {}
  };
  process.on('SIGINT', () => void cleanup().then(() => process.exit(130)));

  try {
    const { project } = await api<{ project: { id: string } }>(
      'POST',
      '/api/projects',
      { name: 'Adviesbureau Koers - Test' }
    );
    const projectId = project.id;
    stamp(`✓ Project ${projectId}`);

    let step = await api<InterviewStep>(
      'POST',
      `/api/projects/${projectId}/interview/start`
    );
    console.log(`  → first question [${step.current_question?.question_id}]`);

    let turn = 0;
    let lastReportedPart = 0;
    let archetypePrinted = false;
    const MAX_TURNS = 250;

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
          `\n        Q: ${truncate(q.text, 110)}` +
          `\n        A: ${truncate(answer, 110)}`
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

      if (!archetypePrinted && step.progress.archetype) {
        archetypePrinted = true;
        console.log(
          `\n  ◆ Archetype detected: ${step.progress.archetype}` +
            (step.progress.sub_archetype ? ` + ${step.progress.sub_archetype}` : '')
        );
      }
      if (turn > MAX_TURNS) throw new Error(`Aborted: more than ${MAX_TURNS} turns`);
    }
    stamp(`\n✓ Interview complete in ${turn} turns`);

    stamp('\nGenerating strategy…');
    const stratRes = await api<{ strategy: unknown }>(
      'POST',
      `/api/projects/${projectId}/strategy/generate`
    );
    console.log(JSON.stringify(stratRes.strategy, null, 2));

    await api('POST', `/api/projects/${projectId}/strategy/approve`);

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
        throw new Error('status reverted — content gen failed.');
      }
    }
    if (status !== 'review' && status !== 'completed') {
      throw new Error(`Generation did not complete (status=${status}).`);
    }

    const pagesRes = await api<{
      pages: Array<{ title: string; slug: string; sections: unknown }>;
    }>('GET', `/api/projects/${projectId}/pages`);
    console.log(`\n═══ ${pagesRes.pages.length} PAGES ═══════════════════════════════\n`);
    for (const p of pagesRes.pages) {
      console.log(`◆ ${p.title}  (/${p.slug})`);
    }

    const { data: usage } = await admin
      .from('claude_usage')
      .select('purpose, cost_usd')
      .eq('project_id', projectId);
    if (usage && usage.length > 0) {
      let totalCost = 0;
      const by = new Map<string, { c: number; u: number }>();
      for (const u of usage) {
        const c = Number(u.cost_usd ?? 0);
        totalCost += c;
        const cur = by.get(u.purpose) ?? { c: 0, u: 0 };
        cur.c += c;
        cur.u += 1;
        by.set(u.purpose, cur);
      }
      console.log(`\nUsage: ${usage.length} calls, $${totalCost.toFixed(4)}`);
      for (const [p, agg] of [...by.entries()].sort((a, b) => b[1].c - a[1].c)) {
        console.log(`  ${p.padEnd(28)} ${String(agg.u).padStart(3)}x $${agg.c.toFixed(4)}`);
      }
    }

    stamp('\n✓ DONE.');
    console.log(`Project: ${projectId}`);
    if (!KEEP) await cleanup();
  } catch (err) {
    console.error('\n✗ FAILED:', err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) console.error(err.stack);
    await cleanup();
    process.exit(1);
  }
}

void main();
