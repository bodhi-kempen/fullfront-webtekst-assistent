/**
 * End-to-end smoke test — Sieradenwinkel Luna (webshop / product mode).
 *
 * Tests how the interview handles a webshop with many products (18). The
 * archetype hint in DEEL 4 ('Heb je veel producten? Dan kunnen we beter de
 * belangrijkste categorieën bespreken') should nudge the AI toward a
 * 4-category breakdown (rings/necklaces/bracelets/earrings) rather than
 * 18 individual product loops.
 *
 * Run from backend/:
 *   API_URL=https://webtekst.fullfront.nl KEEP=1 \
 *     npx tsx scripts/test-full-flow-luna.ts
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
// Sieradenwinkel Luna — 18 producten in 4 categorieën, behandeld als
// vier "services" in DEEL 4.
// ---------------------------------------------------------------------------

const ANSWERS_BY_PART: Record<number, string[]> = {
  1: [
    'Ik ben Noor, goudsmid en ontwerper. Sieradenwinkel Luna is mijn webshop met handgemaakte sieraden, ontworpen en deels zelf vervaardigd in mijn atelier. Achttien stuks in vier categorieën: ringen, kettingen, armbanden en oorbellen. We versturen door heel Nederland en België via sieradenluna.nl.',
    'Sieraden vertellen iets over de drager. Ze gaan vaak mee na een belangrijk moment — een verjaardag, een afgesloten studie, een afscheid. Ik wil dat mijn klanten een stuk uit mijn collectie als hún stuk gaan zien. Daarom maak ik dingen die je elke dag wilt dragen, niet alleen op feestjes.',
    'Ik ontwerp en maak handgemaakte sieraden in goud, zilver en met halfedelstenen. Mijn collectie bestaat uit 18 stuks in vier categorieën, elk met een eigen herkenbare stijl: zacht organisch, met een fijne afwerking en niet te zwaar.',
    'Vrouwen tussen 28 en 55 die bewust kiezen wat ze dragen. Vaak iemand met een eigen smaak die niet in trends meeloopt. Veel klanten kopen voor zichzelf maar ook regelmatig als cadeau voor hun zus, moeder of beste vriendin.',
    'Iemand die een sieraad ziet als investering in zichzelf, niet als impulsaankoop. Iemand die mij durft te mailen met een vraag over de exacte tint van een steen, of die wil weten hoe een ring valt op een smalle vinger. Echte interesse, geen prijsjacht.',
    'Mensen die zoeken naar de goedkoopste optie of die met massasieraden van Bijou of soortgelijke ketens vergelijken. Ook klanten die binnen één uur antwoord willen op een mail of die ongeduldig worden bij vragen aan een eenvrouwsbedrijf.',
    'Klanten die terugkomen voor een tweede stuk of die hun stukken samen combineren als een setje. Of mensen die voor een speciale gelegenheid bij me uitkomen — een afstuderen, een huwelijk, een vijftigste. Daar zit de waardering en het persoonlijke contact in.',
    'Ze laten oprechte feedback achter, vaak met een foto van het stuk in gebruik. Ze begrijpen dat handgemaakt iets anders is dan fabrieksmatig en stellen vragen die ertoe doen. En ze gunnen elkaar mijn collectie — veel komt via doorverwijzing.',
    'Klanten die een ring willen passen door drie maten thuis te bestellen en allemaal terug te sturen op het laatste moment. Of mensen die last-minute "kan dit voor morgen" verwachten. Ik werk niet zo, en daar moet ik soms duidelijk in zijn.',
    'Verwachtingen die niet aansluiten op handgemaakt werk. Iemand denkt dat ze binnen 24 uur hun ring krijgen, maar als die nog gemaakt moet worden duurt het 5 tot 10 werkdagen. Of ze begrijpen niet waarom een goudkleurige ring met een echte saffier 110 euro kost.',
  ],
  2: [
    'De wens om iets te dragen wat een verhaal heeft. Mensen kunnen genoeg sieraden bij Zara of bij grote ketens kopen, maar zoeken iets dat anders is — niet de massa, niet de standaard. Ze willen iets dat bij hun stijl past en waarvan ze niet drie vriendinnen hetzelfde stuk zien dragen.',
    'Ze scrollen door Instagram, zien onze stukken op anderen of in een gestylde flatlay, en denken: dat past bij wie ik ben. Soms zoeken ze ook actief — Pinterest-borden vol "delicate goldsmith jewellery" of een Google-zoektocht naar handgemaakt.',
    'Vaak hebben ze al een paar dingen geprobeerd: snel een ring bij een keten, een paar oorbellen op de markt, iets bij een bekende grote sieradenketen. Ook wel zelf maken-pakketten of vrienden vragen die hobbymatig sieraden maken.',
    'Bij ketens missen ze het verhaal en de eigen stijl. De stukken zien er nog leuk uit op de eerste dag, maar binnen drie weken kleurt het zilver of springt er een steentje uit. Bij hobbymatige stukken mist de afwerking. Dat verschilt van wat een goudsmid maakt met de juiste materialen.',
    'Dat ze een sieraad kopen dat na twee maanden alweer kleurt of breekt. En dat ze niet écht iets bezitten dat van henzelf voelt — meer iets generieks dat iedereen kan hebben.',
    'Een mooi sieraad voor een speciale gelegenheid blijft uit, of ze blijven hun oma\'s ketting dragen omdat ze niet weten waar ze iets nieuws moeten kopen dat ze net zo bijzonder vinden.',
    'Ze blijven iets missen in hun outfit. Of ze vergeten een keer aan zichzelf te denken — sieraden zijn voor veel klanten een vorm van zelfzorg.',
  ],
  3: [
    'Je bestelt online via sieradenluna.nl. Bij voorraad staat het binnen drie werkdagen op je deurmat. Werk op maat (zoals een ring met specifieke maat of steen) duurt 5 tot 10 werkdagen. Je kunt me altijd mailen vóór de bestelling als je twijfelt over wat past.',
    'Met luisteren of meekijken. Bij twijfel over een ringmaat of een steen-tint mail ik graag heen-en-weer. Bij grotere bestellingen, bijvoorbeeld voor een huwelijksgeschenk, plan ik soms een videoafspraak in om iets samen te bespreken.',
    'Bestelling, bevestigingsmail met track-and-trace, verzending of fabricage, levering, en een kort persoonlijk berichtje na een paar weken om te vragen of het stuk bevalt. Bij maatwerk staat er ook een gepolijste persoonlijke brief bij.',
    'Stap 1: kies stuk online. Stap 2: betaal via iDEAL of creditcard. Stap 3: krijg bevestiging met geschatte levertijd. Stap 4: ontvang track-and-trace. Stap 5: pakje binnen, mooi verpakt in linnen zakje. Stap 6: optioneel berichtje met foto van hoe je het draagt.',
    'Ik maak het zelf in mijn atelier in Utrecht. Goud en zilver komen van vaste leveranciers in Antwerpen, halfedelstenen koop ik tweejaarlijks zelf in op een vakbeurs in Tucson. Mijn stempel staat op elk stuk, geen massa-import.',
    'Omdat klanten direct contact hebben met de maker. Ze krijgen niet een ondoorzichtige supply chain, maar weten dat hun ring door één persoon is gefelt en gepolijst. Dat zien ze in de afwerking en in hoe het stuk over de jaren blijft staan.',
    'Dat sieraden van Luna écht anders aanvoelen dan wat ze eerder kochten. Dat ze ze elke dag kunnen dragen zonder dat ze ergens haken of verkleuren. En dat ze me persoonlijk kennen — geen klantenservicenummer maar Noor, die vragen direct beantwoordt.',
  ],
  5: [
    'Suzanne, 41, jurist. Kocht eerst een Maanring voor zichzelf, een half jaar later een Maanketting als verjaardagscadeau aan haar zus. Inmiddels haar derde stuk in onze collectie en stuurt me elke nieuwe foto van een outfit waarin ze ze draagt.',
    'Via Instagram, een gestylde foto van een vriendin die ook al klant is. Ze stuurde me een DM met "wie heeft die ring gemaakt?" en kwam zo in de webshop terecht.',
    'Suzanne droeg jarenlang dezelfde sieraden van haar grootmoeder en haar 25-jarige verloving. Mooi maar niet meer haar smaak. Ze had niets nieuws gekocht omdat ze niet wist waar ze iets vergelijkbaars kon vinden.',
    'Ze had bij een paar webshops gekeken maar het voelde steeds als trend-shop, niet als iets blijvends. En ze wilde geen sieraad waar je in week vier het verschil ziet met de eerste dag.',
    'Bij ons koos ze een Maanring die ze elke dag draagt. Ze zegt dat ze haar oma\'s ring nu liever bewaart en de Maanring als een soort "mijn ring" beleeft. Het was de eerste keer in jaren dat ze écht iets nieuws kocht voor zichzelf.',
    'Suzanne schreef in een handgeschreven kaart: "Eindelijk iets wat van mij is en niet van mijn familie. Ik draag hem elke dag, ook met avondkleding, en hij past bij alles." Ze heeft inmiddels haar moeder en zus tegelijk een stuk laten kopen.',
    'We hebben 4.8 sterren op Trustpilot met 98 reviews na drie jaar verkopen. 50 procent van de klanten komt terug binnen het jaar voor een tweede aankoop. Bestseller is de Maanring met meer dan 280 verkopen, gevolgd door de Maanketting.',
  ],
  6: [
    'Ik heb edelsmeden gestudeerd aan de Vakschool Schoonhoven en daarna 5 jaar bij een zilversmid in Antwerpen gewerkt. Daar leerde ik vakmanschap, het ouderwetse soort, met de hand vijlen en solderen. Op mijn 31e wilde ik mijn eigen ding maken en startte Luna vanuit een atelier achter mijn huis.',
    'Een verlies in de familie waarbij iedereen iets persoonlijks van haar wilde houden. Mijn nichten en ik kregen elk een zilveren ring van haar, en hoe verschillend onze stijlen ook waren, die ringen droegen we allemaal. Toen wist ik: er ligt iets in een sieraad dat dieper gaat.',
    'Omdat ik geloof dat handgemaakte sieraden anders blijven hangen bij iemand. Niet alleen als ding op je vinger, maar als een ankerpunt. Ze gaan vaak mee in de mooiste én moeilijkste momenten van een leven.',
    'De gedachte dat sieraden alleen voor speciale gelegenheden zijn, of alleen iets voor wie het breed heeft. Ik wil mijn collectie betaalbaar houden voor wie er een paar keer per jaar in wil investeren en daar voor altijd plezier van heeft.',
    'Vakmanschap dat zichzelf niet hoeft op te dringen. Een goede polijst is niet zichtbaar, alleen merkbaar. Sieraden die mooi opouder en niet binnen een seizoen verouderen.',
    'Ik werk met vaste leveranciers waar ik de herkomst van weet. Geen anonieme stenen uit ondoorzichtige mijnen, geen dump-goud. Mijn stempel staat op elk stuk, en bij elk stuk dat ik verstuur stop ik een handgeschreven briefje. Dat is voor mij een onderdeel van wat het stuk maakt.',
  ],
  7: [
    'Een vaste plek in iemands sieraden-doosje. Het stuk dat ze altijd dragen en altijd opnieuw kiezen, ook al hebben ze er tien anderen.',
    'Een gevoel dat ze iets kostbaars hebben dat ze elke dag mogen dragen. Niet "te mooi om te dragen" maar "te bijzonder om weg te leggen".',
    'Luna is een herkenbare merknaam in de Nederlandse handgemaakte sieraden-scene. Met een eigen retail-corner in een mooie boutique in Amsterdam misschien, en een paar collecties die in samenwerking met andere makers zijn gemaakt.',
    'Aantonen dat handgemaakte sieraden in Nederland een eigen plek verdienen, los van import-import en massacultuur. En andere edelsmeden inspireren om ook hun eigen ding te starten.',
    'Eerlijke materialen, persoonlijk contact, vakmanschap. Geen kunstmatige urgency-marketing, geen "nog 2 op voorraad" trucs. Mijn klanten kunnen rustig een week wachten met beslissen.',
    'Aan de tijd die ik neem voor hun vragen. Aan dat een ring die ik op maat maak echt op maat is en niet "in de buurt". En aan dat ik ze persoonlijk benader, ook als het even drukker is.',
  ],
  8: [
    'Welke maat ring heb ik nodig? Verkleurt zilver? Hoe verzorg ik de halfedelsteen? Hoeveel weken duurt maatwerk? En heel vaak: kan ik een stuk omruilen als de maat niet klopt?',
    'Voor de bestelling via mail of de chat, of net nadat ze hun ring hebben gepast.',
    'Of ze de juiste maat kunnen kiezen via de website. Of de tint van de steen op de foto klopt met wat ze in handen krijgen. En of een ring van 89 euro echt voor altijd goed blijft, of dat ze die over twee jaar weer mogen vervangen.',
    'Of zilver echt is, of het wel goud is wat erin zit. Sommigen durven dat niet hardop te vragen omdat ze bang zijn dat het pretentieus klinkt, maar het is volstrekt logisch.',
    'Dat handgemaakt = onaf of niet professioneel. Mijn stukken zijn juist beter afgewerkt dan veel fabrieksmatig werk omdat één persoon er aandacht aan geeft. En dat goud altijd duur moet zijn — ik werk ook met verguld zilver waardoor je een goudkleurig effect krijgt voor minder.',
  ],
  10: [
    'Bestellen kan altijd online. Vragen vooraf? Mail noor@sieradenluna.nl of bel 06-98765432. Voor maatwerk graag minimaal 2 weken vooruit. En voor een speciaal cadeau-stuk graag even iets eerder, zodat ik kan meedenken.',
    'Vaak op het moment dat ze een speciaal cadeau zoeken — verjaardag, jubileum, baby-cadeau. Of ze willen voor zichzelf iets blijvends in plaats van weer een trend-stuk. Sommige klanten boeken een hele setlijn aan sieraden bij elkaar.',
    'Online bestelling komt direct in mijn systeem en ik stuur binnen één werkdag een persoonlijke bevestigingsmail. Mail of telefoon: ik antwoord meestal binnen één werkdag, op vrijdag iets sneller.',
    'Bestelling → bevestigingsmail → fabricage of verzending → track-and-trace → pakketje in linnen zakje → persoonlijk berichtje een paar weken later om te vragen hoe het bevalt.',
    'Vertrouwen en persoonlijke aandacht. Dat ze het idee hebben: hier denkt iemand met me mee. Geen massa-vibe, eerder dat van een tante die toevallig sieraden maakt en het écht voor je over heeft.',
    'Telefoon: 06-98765432. E-mail: noor@sieradenluna.nl. Website: sieradenluna.nl. Instagram: @sieradenluna. Adres atelier: alleen op afspraak; bij retouren via e-mail aan te vragen.',
    'E-mail en telefoonnummer mogen zichtbaar op de website. Adres alleen op afspraak vermelden.',
    'Sieradenwinkel Luna is de naam. Logo is een stilistische maan in mat goud op donkergrijze achtergrond. Huisstijlkleuren: warm goud, gebroken wit, en een diep aubergine. Lettertype: een verfijnde serif voor de titels, eenvoudige sans-serif voor de tekst.',
    'Op de huidige website staan productbeschrijvingen die ik graag wil herzien. Op Instagram heb ik bio-tekst en wat captions die de toon goed vangen.',
    'Privacyverklaring nodig (mailinglijst, klantgegevens). Algemene voorwaarden voor verzending, retouren, en garantietermijn.',
    'Vrouwelijk, elegant, persoonlijk. Spreek klanten aan met "je", nooit met "u". Niet pretentieus, eerder warm en uitnodigend, alsof Noor je in haar atelier rondleidt.',
    'Ja, klinkt prima. Voeg ook een pagina toe waar de klantenservice-vragen samenkomen.',
    'Nee, ik denk dat we alles hebben gehad. Het belangrijkste is: laat de teksten klinken zoals iemand die met aandacht voor het ambacht en voor de drager schrijft, zonder verkooppraat.',
  ],
};

// p4 — 4 categorieën in plaats van 18 individuele producten. We mikken erop
// dat de AI bij vraag 1 de categorie-aanpak overneemt vanuit de archetype-hint.
const SERVICES = [
  {
    name: 'Ringen',
    answers: [
      'Onze ringen-categorie. Vijf ontwerpen, allemaal in zilver of verguld zilver, en op maat te maken in 14k goud. Maanring 89 euro met blauwe maansteen, Zonring 95 euro met citrien, Stersignet 110 euro (signet-stijl met ster-gravure), Vlinderbandring 75 euro, en Infinity ring 85 euro. Maten 50 t/m 60.',
      'Ringen zijn vaak het eerste stuk dat iemand bij me koopt. Ik wilde een serie waar je niet de hele dag aan denkt — comfortabel om te dragen, niet te zwaar, en veelzijdig genoeg voor zowel werkdagen als feesten.',
      'Voor vrouwen die een ring willen die niet hun hele hand opslokt. Mensen met een eigen smaak die liever een delicate-stijl ring dragen dan een opvallende statement-ring.',
      'Vaak iemand die haar trouwring of moeders ring is verloren of beu, of die voor het eerst iets nieuws koopt na jaren. Ook vrouwen die een schenking aan zichzelf doen na een belangrijke gebeurtenis.',
      'De wens naar iets blijvends en persoonlijks. Een ring die ze elke dag dragen en die zegt: dit is mijn ring, niet een trend-stuk dat over zes maanden weer in de kast verdwijnt.',
      'Ze hebben elke dag een ring die ze met zorg hebben gekozen. Ze voelen zich net iets meer verzorgd, ook op een doordeweekse dag waarop ze niet veel hebben ingestopt.',
      'Een handgemaakte ring met een echte halfedelsteen voor 75 tot 110 euro, in zilver of verguld zilver, op maat. Levertijd voor maatwerk: 5 tot 10 werkdagen.',
      'De afwerking. De ring voelt anders dan iets uit een keten — gladder aan de binnenkant, beter gepolijst, geen scherpe randen. Mensen merken het direct als ze hem aandoen.',
    ],
  },
  {
    name: 'Kettingen',
    answers: [
      'Onze kettingen-categorie. Vijf ontwerpen: Maanketting 120 euro met maansteen-hanger, Ankerslot 95 euro (zilver met goud-detail), Druppelhanger 85 euro met turkooise druppel, Laagjes set 135 euro (drie kettingen verschillende lengtes), en Initiaal ketting 79 euro met letter naar keuze. Lengtes 40 tot 60 cm.',
      'Kettingen zijn een veelvraat: ze worden vaak cadeau gegeven en vaak gestapeld. Ik wilde een set die zowel solo werkt als samen — daarom is bijvoorbeeld de Laagjes set ook los te combineren met de andere kettingen.',
      'Voor vrouwen die kettingen stapelen en variëren met outfits. Ook voor wie een ketting als jaarlijks cadeau wil ontvangen — een familiestuk dat blijft en niet aangedragen verandert.',
      'Vaak gemarkeerd door een gelegenheid: een verjaardag, een afronding van iets, een baby-geboorte. De Initiaal ketting wordt regelmatig gekocht voor moeders na de geboorte van een kind.',
      'De wens om iets persoonlijks te dragen, vaak met een symboliek — een steen die hen aanspreekt, een initiaal, een vorm. Niet zomaar een ketting maar een verhaal-stuk.',
      'Ze dragen een ketting die past bij wie ze zijn op dat moment. Soms wisselen ze per dag, soms hebben ze hun "vaste" ketting die ze elke dag dragen.',
      'Handgemaakte kettingen tussen 79 en 135 euro met halfedelstenen of personalisatie. Lengtes naar wens, geleverd in linnen zakje.',
      'De manier waarop het sluitslot werkt. Veel klanten vertellen achteraf dat ze altijd moeite hadden met onze kettingen aandoen — de Ankerslot lossen we dat netjes op met een groter, makkelijker te bedienen sluitwerk.',
    ],
  },
  {
    name: 'Armbanden',
    answers: [
      'Onze armbanden-categorie. Vier stuks: Schakelarmband 75 euro (klassieke zilveren schakels), Bangle 90 euro (open of gesloten model), Koordarmband 45 euro met kleine zilveren bedels, en Charmarmband 105 euro waar je extra bedels aan kunt rijgen. Maten 16 t/m 19 cm.',
      'Armbanden krijgen vaak minder aandacht in een collectie maar ze worden net zo vaak gedragen. Ik wilde een serie waarin er voor elke smaak iets in zit, van eenvoudig (Koordarmband) tot expressief (Charmarmband).',
      'Voor vrouwen die graag iets visueels aan hun pols dragen. Vaak gecombineerd met een horloge of met meerdere armbanden tegelijk. Ook voor mensen die juist één strakke bangle dragen en daar consequent in zijn.',
      'Soms mensen die een armband als cadeau zoeken voor een vriendin. Soms voor zichzelf na het afronden van een grote stap (afstuderen, eerste baan, scheiding).',
      'De behoefte aan iets dat ze hun pols laten dragen — letterlijk een visuele toevoeging die hun outfit afmaakt zonder dat ze er veel aandacht aan moeten besteden.',
      'Ze hebben een vast accessoire aan hun pols dat hun look afrondt. Vaak combineren ze het met een horloge of stapelen ze meerdere armbanden voor een bewuste mix.',
      'Handgemaakte armbanden tussen 45 en 105 euro, in zilver of verguld zilver. Charmarmband uitbreidbaar met losse bedels (nog niet apart te koop, maar in ontwikkeling).',
      'De stevigheid. Ze voelen direct dat een schakelarmband bij Luna anders is dan eentje van een keten — geen gevoel van breekbaarheid, geen scherpe sluiting.',
    ],
  },
  {
    name: 'Oorbellen',
    answers: [
      'Onze oorbellen-categorie. Vier ontwerpen: Maanhoops 65 euro (kleine zilveren ringen met maantje), Druppelstuds 55 euro met halfedelsteen, Creolen 70 euro in twee maten (klein/middel), en Statement oorring 85 euro (grotere asymmetrische ring). Voor doorgeprikte oren, sluitwerk in chirurgisch staal.',
      'Oorbellen worden vaak het minst opgemerkt maar het meest gedragen. Ik wilde een serie die elke dag past — niet te zwaar, niet te druk, maar wel gewoon mooi.',
      'Voor vrouwen die elke ochtend een paar oorbellen indoen zonder erbij na te denken. Ook voor wie graag wat ze dragen wisselt naar wat hun outfit doet.',
      'Vaak iemand die jaren dezelfde oorbellen draagt en eindelijk eens iets anders wil. Of iemand die bij ons al een ring heeft en nu de set "afmaakt" met een passend paar oorbellen.',
      'De wens naar iets dat hen elke ochtend kleur geeft, zonder dat ze er over na hoeven te denken. Een paar oorbellen die voelen als een vaste basis — net als hun horloge of ring.',
      'Ze gaan de deur uit met een afgerond geheel. Vaak realiseren ze zich pas later dat ze elke dag onbewust naar dezelfde oorbellen grijpen.',
      'Handgemaakte oorbellen tussen 55 en 85 euro, met halfedelstenen of zonder, allemaal voor doorgeprikte oren met chirurgisch-stalen sluitwerk (dus geschikt voor gevoelige oren).',
      'Hoe licht ze voelen. Niet "ik draag iets aan mijn oor" maar gewoon onderdeel van wat ze aanhebben.',
    ],
  },
];

const META_BLOG_OPTIN_ANSWER = 'Nee, geen blog. Een nieuwsbrief over nieuwe collecties is interessanter voor later.';

const GENERIC_FALLBACKS = [
  'Daar denk ik regelmatig over na. Mijn collectie is opgebouwd vanuit het idee dat handgemaakte sieraden anders blijven hangen bij iemand dan massasieraden. Ik investeer in goede materialen, persoonlijk contact, en stukken die langer mooi blijven dan één seizoen.',
  'Dat is een goede vraag, maar wat ik eerder al zei vat het eigenlijk al goed samen. Luna draait om aandacht voor het ambacht en voor de drager. Prijzen op de website zijn helder, geen verborgen kosten of toeslagen op de finale rekening.',
  'Daar zou ik niet veel meer aan toe willen voegen. Mijn collectie spreekt vooral voor zich. In de productpagina vertellen we precies wat je krijgt, hoe het is gemaakt, en hoe je het verzorgt — zodat klanten weten wat ze precies bij ons in huis halen.',
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
      ? 'Ja, ik heb nog een categorie om te bespreken.'
      : 'Nee, dit zijn de vier categorieën.';
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
  console.log('  Webtekst-assistent — Sieradenwinkel Luna (webshop, 18 producten)');
  console.log(`  API: ${API_URL}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const testEmail = `luna-${Date.now()}@webtekst-test.local`;
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
      { name: 'Sieradenwinkel Luna - Test' }
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
        throw new Error('status reverted to "strategy" — content gen failed.');
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
