/**
 * End-to-end smoke test — Loolup (webshop archetype, product mode).
 *
 * Tests the new product-mode wording: DEEL 2 should ask about behoefte/
 * aanleiding (not problemen) and DEEL 4 should ask about products (not
 * services). Page proposal should suggest a Shop page for this webshop.
 *
 * Run from the backend directory:
 *   API_URL=https://webtekst.fullfront.nl KEEP=1 \
 *     npx tsx scripts/test-full-flow-loolup.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

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
// Canned answers — Loolup (webshop / product mode)
// Persona: Mark, ontwerper en interieurliefhebber. Verkoopt 4 decoratieve
// wandpanelen voor toiletten via loolup.nl. Tone: speels, luchtig, humor.
// ---------------------------------------------------------------------------

const ANSWERS_BY_PART: Record<number, string[]> = {
  1: [
    // p1q1 — wat doe je
    'Ik ben Mark, ontwerper en interieurliefhebber. Ik run Loolup, een kleine webshop met decoratieve wandpanelen speciaal voor het toilet. Vier ontwerpen, allemaal in één formaat, allemaal vrolijk. We sturen door heel Nederland, online besteld via loolup.nl en binnen drie werkdagen op de mat.',
    // p1q2 — waarom
    'Omdat de wc de meest verwaarloosde kamer van het huis is. Iedereen besteedt er tijd, niemand maakt er iets moois van. Ik vond dat zonde, en ik werd stiekem zelf moe van die saaie witte muurtjes.',
    // p1q3 — uitleg aan vreemde
    'Stel je een toilet voor met een vrolijke wandbedekking in plaats van die nietszeggende verf van de vorige bewoner. Geen klusproject, geen gedoe, gewoon een paneel dat je zelf ophangt en dat de hele ruimte een glimlach geeft. Dat verkoop ik.',
    // p1q4 — voor wie specifiek
    'Voor mensen die hun huis met liefde inrichten en het zonde vinden dat de wc altijd vergeten wordt. Vaak vrouwen tussen 30 en 55, vaak in een eigen koophuis of een huurhuis waar ze toch iets willen toevoegen zonder grote klus.',
    // p1q5 — ideale klant
    'Iemand met humor en oog voor detail. Iemand die binnenkomt bij een vriendin, het paneel ziet en spontaan moet lachen. Geen perfectionist die op één millimeter rechtheid wacht, gewoon iemand die plezier wil.',
    // p1q6 — wie juist niet
    'Mensen die op de cent letten en vergelijken met IKEA-prints. Of mensen die een complete badkamerverbouwing willen, daar zijn we de partij niet voor.',
    // p1q7 — liefste klanten
    'Klanten die enthousiast zijn, foto\'s van het resultaat sturen, en hun vriendinnen tippen. Dat is voor ons goud waard.',
    // p1q8 — wat maakt deze klanten fijn
    'Ze waarderen het werk dat in het ontwerp zit en zeuren niet om de prijs. Ze snappen dat 35 euro voor iets unieks helemaal niet duur is, en ze gunnen ons de marge.',
    // p1q9 — liever niet
    'Klanten die teruggeven omdat het paneel "te vrolijk" bleek. Of mensen die mailen of we voor 19,95 ook willen leveren. Daar passen wij niet bij.',
    // p1q10 — wat gaat mis
    'Verwachtingen die niet kloppen. Iemand wil bijvoorbeeld een complete badkamer-restyling en denkt dat ons paneel een wand-tegelvervanger is. Dat is het niet, het is een blikvanger boven de wc-rol.',
  ],
  2: [
    // p2q1 — aanleiding (product mode override should kick in)
    'Het toilet voelt vaak een beetje vergeten. Mensen hebben hun woonkamer en slaapkamer mooi ingericht, en dan komen ze op het toilet en ineens is het weer dat blanke nikssegende vlakje. Onze klanten zoeken iets om die ruimte óók een beetje karakter te geven, zonder een complete renovatie.',
    // p2q2 — hoe ziet die behoefte er uit
    'Ze scrollen op Pinterest, zien mooie toiletten in interieurmagazines, en denken: dat wil ik ook. Maar dan de praktijk: behang aan de muur is gedoe, een schilder bellen voor één muurtje overdreven. Iets simpels en moois aan de muur missen ze.',
    // p2q3 — alternatieven
    'Behang proberen, een fotolijst ophangen, of een schilderij zoeken dat klein genoeg is. Sommigen plakken een poster op met dubbelzijdig tape en hopen dat die niet krult.',
    // p2q4 — waarom werkten alternatieven niet
    'Behang krult na een tijdje los door de luchtvochtigheid. Posters verbleken. Schilderijen op die kleine muur zijn vaak te groot of te klein. En écht behangen voor één muurtje is uren werk en lijm in je haar.',
    // p2q5 — wat missen ze in andere producten
    'Speelsheid. De meeste interieurproducten zijn óf saai en functioneel, óf juist heel duur en serieus. Iets wat gewoon vrolijk is en betaalbaar, zonder dat het er goedkoop uitziet, dat is zeldzaam.',
    // p2q6 — situatie zonder Loolup
    'Dan blijft die wc-muur leeg of een beetje onbeholpen versierd. Bezoek komt terug uit het toilet zonder een glimlach. Een gemiste kans om hun huis een persoonlijkheid te geven, juist op een plek waar je een paar minuten alleen bent.',
    // p2q7 — wat gebeurt er als ze niets doen
    'Niets, behalve dat saaie wc. Maar wij geloven dat zo\'n kleine ingreep het verschil maakt tussen een huis en een thuis. Een muurtje dat je laat lachen telkens als je gaat plassen, dat blijft je bij.',
  ],
  3: [
    // p3q1 — hoe help je
    'Heel simpel: je bestelt online, kiest een van de vier ontwerpen, en binnen drie werkdagen ligt het bij je op de mat. Inclusief een instructiekaartje in een toon die je waarschijnlijk laat lachen. Je hangt het zelf op met spijkers of klevende strips.',
    // p3q2 — waar begin je
    'Met de keuze. Ik adviseer altijd: kies het ontwerp dat bij de rest van je interieur past, niet alleen wat het mooist is op de foto. Bij een rustig huis past Bamboe vaak het beste, bij een speels huis Wave of Bloem.',
    // p3q3 — traject
    'Bestellen op loolup.nl, betalen via iDEAL of creditcard, bevestigingsmail, binnen drie werkdagen verzonden. Pakket komt aan, jij hangt op, je stuurt foto naar ons in en wij worden vrolijk.',
    // p3q4 — stap voor stap
    'Stap 1: kies ontwerp. Stap 2: voeg aan winkelmandje toe. Stap 3: betaal. Stap 4: krijg bevestiging. Stap 5: ontvang pakket. Stap 6: hang op (5 minuten). Stap 7: foto delen op Instagram of Pinterest, mag wel of niet.',
    // p3q5 — anders dan anderen
    'Wij richten ons puur op het toilet. Geen overige interieurpanelen, geen wandbedekkingen voor andere kamers. Eén formaat, vier ontwerpen, één doel: die ene saaie muur leuk maken. En de tone of voice waarin we communiceren is anders dan de saaie producttekstjes die je gewend bent.',
    // p3q6 — waarom werkt dit
    'Omdat het laagdrempelig is. Geen kluservaring nodig, geen tegelzetter bellen, geen budget voor een verbouwing. 35 euro, 5 minuten ophangen, klaar. Dat past in een gewone woensdagavond.',
    // p3q7 — wat zeggen klanten
    'Dat ze er zelf elke dag plezier van hebben en dat bezoek het altijd opmerkt. We krijgen regelmatig "Ik moest lachen tijdens het plassen, dat is écht jouw schuld" als bedankje terug.',
  ],
  5: [
    // p5q1 — beschrijf klanten
    'Anouk, 38, woont met haar man en twee kinderen in een tussenwoning in Hilversum. Ze had haar hele huis recent opnieuw ingericht maar bleef hangen op de wc.',
    // p5q2 — hoe binnenkomen
    'Via Pinterest, ze zocht "wc inspiratie" en kwam op onze pagina terecht.',
    // p5q3 — situatie ervoor
    'Wit muurtje, een spiegel die ze niet leuk vond, en een hele saaie WC. Ze had drie keer behang besteld en weer geretourneerd omdat het te druk werd.',
    // p5q4 — alternatieven die niet voldeden
    'Behang dat te druk werd, schilderijen die niet pasten, en posters die binnen een maand begonnen te krullen door de douche-stoom uit de aangrenzende badkamer.',
    // p5q5 — wat veranderde
    'Ze koos het Bloem-ontwerp, hing het op in een uurtje (incl. koffiepauze), en stuurde ons een foto met de tekst "EINDELIJK". Ze heeft inmiddels twee panelen voor vriendinnen besteld als verjaardagscadeau.',
    // p5q6 — concreet
    'Anouk schreef in een Trustpilot-review: "Eindelijk een leuke muur op het toilet, mijn kinderen vragen er nu om vanaf de gang. Loolup, jullie hebben mijn huishouden veranderd zonder dat jullie het weten."',
    // p5q7 — cijfers / quotes
    'We hebben 4.7 sterren op Trustpilot met 134 reviews na anderhalf jaar verkopen. 65 procent van de klanten komt via mond-op-mond, vooral cadeau-aankopen voor verjaardagen en housewarmings. Bestseller is het Bloem-paneel met meer dan 600 verkopen.',
  ],
  6: [
    // p6q1 — hoe ben je dit gaan doen
    'Ik ben opgeleid als grafisch ontwerper en heb jaren bij een interieurstudio gewerkt. Op een dag stond ik bij vrienden op het toilet en zag een echt droevig wandje. Ik dacht: dit MOET beter kunnen.',
    // p6q2 — aanleiding
    'Een kerstvakantie waarin ik in plaats van koekjes bakken vier ontwerpen op papier zette. Mijn vriendin moest lachen om de namen die ik bedacht. Drie maanden later was de eerste batch geprint en lag het bij mij in de schuur.',
    // p6q3 — waarom dit bedrijf
    'Omdat ik geloof dat humor in het interieur ondergewaardeerd wordt. Alles is altijd zo serieus en strak en Pinterest-perfect. Een beetje speelsheid in een kleine ruimte, daar word ik blij van.',
    // p6q4 — probleem in de wereld
    'Saaie toiletten. Klinkt klein, maar er zijn miljoenen van. Ieder huis een mooie wc, dat zou de wereld een beetje vrolijker maken.',
    // p6q5 — geloof in
    'Plezier in iets simpels. Niet elk product hoeft levensveranderend te zijn, maar het mag wel een glimlach geven. En in eerlijk maakwerk: alle panelen zijn in Nederland gedrukt, op stevig materiaal dat tegen luchtvochtigheid kan.',
    // p6q6 — wat doe je bewust anders
    'Ik richt me op één plek in het huis en doe daar één ding heel goed. Geen 50 designs, geen meerdere formaten, geen overcomplicatie. Vier panelen, vier ontwerpen, klaar.',
  ],
  7: [
    // p7q1 — wat wil je betekenen
    'Een kleine vrolijkheid op een onverwachte plek. Het soort cadeau dat je gewoon doet voor jezelf, ook als er geen aanleiding is.',
    // p7q2 — wat wil je dat klanten ervaren of onthouden (was: overhouden)
    'Een glimlach elke keer als ze gaan plassen. En het gevoel dat ze hun huis dat extraatje hebben gegeven dat ze stiekem altijd wilden, zonder gedoe of een grote rekening.',
    // p7q3 — over 5 jaar
    'Loolup als de bekendste merknaam in micro-decoratie voor je toilet. Misschien een tweede productlijn, bijvoorbeeld voor de hal of de bijkeuken. En een paar samenwerkingen met Nederlandse illustratoren.',
    // p7q4 — grotere ambitie
    'Mensen leren dat hun huis ze plezier mag geven, ook in de kleine hoekjes. En tegelijk een merk neerzetten waarvan andere webshops zeggen "wat ze doen is écht hun eigen ding".',
    // p7q5 — waarden
    'Eerlijkheid in materiaal en prijs. Plezier in de communicatie. Geen marketing-bullshit. En kleinschalig blijven; we hoeven geen wereldspeler te zijn.',
    // p7q6 — hoe merken klanten dit
    'Aan de toon van onze e-mails (geen standaard "Beste klant"-onzin), aan de instructiekaartjes in het pakket, en aan dat we soms gewoon iets erbij stoppen, een sticker of een kort grapje. Klanten merken dat we het zelf leuk vinden.',
  ],
  8: [
    // p8q1 — vaakste vragen
    'Past dit op mijn maat muurtje? Hoe hang ik het op? Kan ik het schoonmaken? Geeft het verkleuring door de luchtvochtigheid? En verrassend vaak: kunnen jullie ook andere formaten maken?',
    // p8q2 — wanneer stellen ze deze vragen
    'In de chat op de website voordat ze bestellen, of in de mail in de dagen erna. Soms ook nadat het paneel binnen is en ze nog twijfelen over de plek.',
    // p8q3 — wat houdt mensen tegen om te kopen (was: twijfelen voordat instappen)
    'Twijfel of het wel bij hun interieur past. En voor sommigen: of 35 euro niet "te veel voor één paneel" is. Vooral mensen die niet gewend zijn dat een ontwerp ook geld waard is.',
    // p8q4 — niet hardop
    'Of we niet eigenlijk ook een goedkopere variant hebben. We krijgen die vraag niet vaak gesteld maar je voelt soms dat ze het denken.',
    // p8q5 — misverstanden
    'Dat dit behang is. Het is geen behang, het is een paneel dat je ophangt zoals een schilderij. Ook denken sommigen dat het een sticker is, dat is het ook niet, het is gewoon een stevig bord.',
  ],
  10: [
    // p10q1 — wanneer contact opnemen
    'Eigenlijk gewoon online bestellen, daar is alles voor ingericht. Vragen vooraf? Stuur een bericht via de chat of mail naar info@loolup.nl, dan reageert iemand binnen één werkdag.',
    // p10q2 — fase
    'Vaak inspireren ze net hun toilet of een hoekje van hun huis. Of ze zoeken cadeau voor een vriendin die net is verhuisd. Soms zijn het terugkerende klanten die voor een tweede paneel komen.',
    // p10q3 — wat gebeurt bij contact
    'Bestelling via shop loopt automatisch met bevestigingsmail en track-and-trace. Bij vragen via mail of chat reageert Mark zelf, of een collega, in een persoonlijke en luchtige toon.',
    // p10q4 — proces
    'Online: kies, betaal, bevestiging, verzending, levering, gewoon op je deurmat. Vraag vooraf: mailen of chatten, antwoord binnen werkdag, advies over passend ontwerp, daarna alsnog gewoon online bestellen.',
    // p10q5 — wat wil je dat ze voelen
    'Plezier en vertrouwen. Het mag aanvoelen alsof ze contact hebben met een vriend die toevallig een leuke webshop heeft, niet met "Beste klant, uw vraag is in goede handen".',
    // p10q6 — contactgegevens
    'E-mail: info@loolup.nl. Website: loolup.nl. Instagram: @loolup_nl. Geen telefoonnummer (we hebben geen klantenservice-team), alle vragen lopen via mail of de chat. Adres: alleen voor retouren via e-mail aan te vragen.',
    // p10q7 — zichtbaar op website
    'E-mail mag zichtbaar zijn op de website. Geen telefoonnummer, geen privé-adres.',
    // p10q8 — bedrijfsnaam, logo, kleuren
    'Loolup is de merknaam. Logo is in het wit op een felgekleurde achtergrond, met een speels handgeschreven lettertype. Kleuren: aubergine, oker geel, en zacht koraalroze. Tone heel speels.',
    // p10q9 — bestaande teksten
    'Op loolup.nl staan al wat producttekstjes maar die mogen helemaal opnieuw geschreven worden. Op Instagram heb ik wel een bio en een paar captions die de toon goed vangen.',
    // p10q10 — juridisch
    'Privacyverklaring is nodig (want we werken met klantgegevens en mailinglijst). Algemene voorwaarden ook ja, vooral voor verzending en retouren. Beide moeten op de website komen.',
    // p10q11 — tone of voice
    'Speels, luchtig, met humor. Spreek klanten aan met "je", nooit met "u". Geen verkoperige taal, geen overdreven enthousiasme, gewoon zoals een vriend zou schrijven.',
    // p10q12 — pages — moet door AI voorgesteld worden
    'Ja, klinkt goed, dat ziet er prima uit.',
    // p10q13 — nog iets
    'Nee, ik denk dat we alles hebben gehad. Het belangrijkste is: keep it light, keep it fun, en zorg dat de teksten net zo veel persoonlijkheid hebben als de panelen zelf.',
  ],
};

// p4 — 4 producten × 8 questions each
const SERVICES = [
  {
    name: 'Wave',
    answers: [
      'Wave. Een wandpaneel met golvende lijnen in zachte koraal- en beige tinten. 60 bij 40 cm, gedrukt op stevig materiaal dat tegen luchtvochtigheid kan. Inclusief klevende strips of klein bevestigingssetje. 34,95 euro.',
      'Wave is bedoeld voor mensen die rustige speelsheid zoeken. De golven geven beweging zonder dat het te druk wordt, dat past goed in een wat kleinere wc waar je niet wilt overdrijven.',
      'Voor wie van een natuurlijke lijn houdt en het toilet niet wil overladen met patroon. Vaak mensen met een rustig kleurpalet thuis.',
      'Net verhuisd of net opgeknapt en op zoek naar dat ene laatste detail dat de wc afmaakt. Of cadeau voor iemand die net een huis heeft gekocht.',
      'De behoefte aan iets dat de wc een eigen identiteit geeft, zonder dat het te schreeuwerig is. Wave doet precies dat: rustig, fris, persoonlijk.',
      'De wc voelt opeens veel meer áf, en de zachte tinten maken dat de ruimte ook iets ruimer en lichter lijkt.',
      'Een paneel dat 5 minuten ophangen kost, jaren meegaat, en elke dag een klein vleugje plezier toevoegt aan een routinemoment.',
      'Het verschil als ze de wc binnenkomen: je oog wordt naar de muur getrokken in plaats van weg. Bezoek vraagt vaak waar het vandaan komt.',
    ],
  },
  {
    name: 'Bloem',
    answers: [
      'Bloem. Een vrolijk paneel met grote, geïllustreerde bloemen in oker, aubergine en wit. Onze bestseller. Zelfde formaat (60 bij 40 cm) en bevestiging als de andere panelen. 34,95 euro.',
      'Bloem is voor mensen die durven kiezen voor kleur. Het is een statement, dus we zeggen er ook eerlijk bij dat het niet bij elk interieur past. Maar voor wie het wel past, is het een schot in de roos.',
      'Voor de durfal-decorateurs. Mensen met een huis dat al kleur durft, of mensen die juist op de wc een uitspatting willen die ze in de woonkamer niet aandurven.',
      'Vaak na inspiratie via Pinterest of na een verbouwing waar ze iets mistten. Ook gewild als origineel cadeau voor een housewarming of verjaardag.',
      'De wens om het toilet écht een eigen plek te maken. Niet zomaar functioneel, maar een mini-galerie waar je elke dag even van geniet.',
      'De wc gaat van "saai hokje" naar "lievelingsplekje van de gang". Ook bezoek wijst er vaak op met een lach als ze terugkomen.',
      'Een echte blikvanger met persoonlijkheid die in 5 minuten hangt en blijvend plezier geeft. Ook ideaal als gespreksonderwerp tijdens een verjaardag.',
      'De kleurintensiteit. De bloemen zijn niet flets, je voelt meteen dat het paneel "leeft" en ruimte vult.',
    ],
  },
  {
    name: 'Bamboe',
    answers: [
      'Bamboe. Subtiele bamboestengels in groen-grijze tinten op een witte achtergrond. Het rustigste ontwerp van onze vier. 60 bij 40 cm, zelfde materiaal en bevestiging. 34,95 euro.',
      'Bamboe is voor de minimalistische types die toch iets willen. Het ontwerp werkt rustgevend en past in vrijwel elk interieur, maar valt nog wel op.',
      'Voor mensen die een rustige zen-uitstraling in hun huis hebben. Witte muren, hout, planten, en dan dit paneel als afmaakje.',
      'Vaak mensen die jaren bezig zijn met hun interieur en pas nu aan de wc toekomen. Ze hebben dus al hun smaak gevormd en zoeken iets dat past bij wat er al staat.',
      'De wens naar rust en natuurlijkheid op een plek waar ze even alleen zijn. Geen druk patroon, gewoon iets organisch dat de ruimte tot leven brengt.',
      'De ruimte voelt ineens meer als een doordacht onderdeel van het huis, in plaats van een afgekoppeld functioneel hoekje.',
      'Een rustig accent dat niet schreeuwt maar wel leeft. Past zelfs in een huis waar de eigenaar normaal nooit voor patroon zou kiezen.',
      'De serene sfeer. Mensen worden vaak verrast door hoe ánders het toilet aanvoelt zonder dat het overdreven is veranderd.',
    ],
  },
  {
    name: 'Hout',
    answers: [
      'Hout. Een paneel met een trompe-l\'oeil houtstructuur in warme honingkleurige tinten. Geeft de illusie van houten wandpanelen zonder dat je hoeft te boren of te beitsen. 60 bij 40 cm, 34,95 euro.',
      'Hout is voor de doe-het-zelvers die geen tijd of zin hadden om écht hout te plaatsen. Of voor huurders die natuurlijk niet zomaar in de muur mogen boren.',
      'Vaak huurders, vaak mensen met een wat rustieker interieur die de natuurlijke uitstraling waarderen maar niet de rommel van een verbouwing.',
      'Net verhuisd naar een huurhuis of klein appartement waar grote ingrepen niet kunnen, maar ze willen het toch hun eigen maken.',
      'De wens naar warmte en natuurlijke materialen, zonder de praktische bezwaren van échte houten wandbekleding.',
      'De wc krijgt direct een warmere uitstraling, alsof er duurder hout aan de muur zit dan wat er werkelijk is. Een visuele upgrade voor 35 euro.',
      'Een paneel dat de illusie geeft van een verbouwing van honderden euros, voor minder dan 35 euro en 5 minuten werk.',
      'De warmte. Mensen worden verrast hoe levensecht de houtnerf eruitziet, vooral op afstand.',
    ],
  },
];

const META_BLOG_OPTIN_ANSWER = 'Nee, geen blog. Misschien later, maar nu nog niet.';

const GENERIC_FALLBACKS = [
  'Daar denk ik regelmatig over na. Onze panelen zijn ontstaan vanuit het idee dat humor en interieur best samen kunnen gaan. We willen geen serieuze designstudio worden maar wel kwaliteit leveren waar mensen jaren plezier van hebben.',
  'Dat is een goede vraag, maar wat ik eerder al zei vat het eigenlijk al goed samen. Loolup draait om kleine vrolijkheid op een onverwachte plek. Verzending in heel Nederland binnen drie werkdagen, prijzen op de website, geen verborgen kosten.',
  'Daar zou ik niet veel meer aan toe willen voegen dan wat ik al heb verteld. De producten staan voor zich. In de productpagina vertellen we precies wat je krijgt en hoe je het ophangt, en klanten weten daarna ook waarom we de toon zo aanhouden.',
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
      ? 'Ja, ik heb nog een ander product om te bespreken.'
      : 'Nee, dit zijn alle vier de panelen.';
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
  console.log('  Webtekst-assistent — Loolup smoke test (webshop / product mode)');
  console.log(`  API: ${API_URL}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const testEmail = `loolup-${Date.now()}@webtekst-test.local`;
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
    stamp('\nCreating project…');
    const { project } = await api<{ project: { id: string } }>(
      'POST',
      '/api/projects',
      { name: 'Loolup - Test' }
    );
    const projectId = project.id;
    stamp(`✓ Project ${projectId}`);

    stamp('\nStarting interview…');
    let step = await api<InterviewStep>(
      'POST',
      `/api/projects/${projectId}/interview/start`
    );
    console.log(`  → first question [${step.current_question?.question_id}]`);
    console.log(`  ${truncate(step.assistant_message, 200)}`);

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

      if (turn > MAX_TURNS) {
        throw new Error(`Aborted: more than ${MAX_TURNS} turns`);
      }
    }
    stamp(`\n✓ Interview complete in ${turn} turns`);
    console.log(`  Final assistant message: ${truncate(step.assistant_message, 200)}`);

    stamp('\nGenerating strategy…');
    const stratRes = await api<{ strategy: unknown }>(
      'POST',
      `/api/projects/${projectId}/strategy/generate`
    );
    console.log(JSON.stringify(stratRes.strategy, null, 2));

    stamp('\nApproving strategy → content generation kicks off…');
    await api('POST', `/api/projects/${projectId}/strategy/approve`);

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

    stamp('\nFetching pages with content…');
    const pagesRes = await api<{
      status: string;
      pages: Array<{ id: string; title: string; slug: string; sections: unknown }>;
    }>('GET', `/api/projects/${projectId}/pages`);

    console.log(`\n═══ ${pagesRes.pages.length} PAGES ═══════════════════════════════\n`);
    for (const p of pagesRes.pages) {
      console.log(`◆ ${p.title}  (/${p.slug})`);
      console.log(JSON.stringify(p.sections, null, 2));
      console.log('───────────────────────────────────────────────────────────\n');
    }

    // Usage
    const { data: usage } = await admin
      .from('claude_usage')
      .select('purpose, cost_usd')
      .eq('project_id', projectId);
    if (usage && usage.length > 0) {
      const byPurpose = new Map<string, { calls: number; cost: number }>();
      let totalCost = 0;
      for (const u of usage) {
        const c = Number(u.cost_usd ?? 0);
        const cur = byPurpose.get(u.purpose) ?? { calls: 0, cost: 0 };
        cur.calls += 1;
        cur.cost += c;
        byPurpose.set(u.purpose, cur);
        totalCost += c;
      }
      console.log('\n═══ USAGE ═══════════════════════════════════════════════');
      console.log(`Total: ${usage.length} calls, $${totalCost.toFixed(4)}`);
      for (const [p, agg] of [...byPurpose.entries()].sort((a, b) => b[1].cost - a[1].cost)) {
        console.log(`  ${p.padEnd(28)} ${String(agg.calls).padStart(3)}x   $${agg.cost.toFixed(4)}`);
      }
    }

    stamp('\n✓ DONE.');
    console.log(`\n  Test user: ${testEmail}`);
    console.log(`  User id:   ${userId}`);
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
