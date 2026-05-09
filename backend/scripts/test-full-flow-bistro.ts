/**
 * End-to-end smoke test — Bistro De Gouden Lepel (horeca, experience mode).
 *
 * Tests the experience-mode wording: DEEL 2 should ask about wat mensen
 * zoeken / gelegenheid (not problemen) and DEEL 4 about ervaringen (not
 * diensten). Page proposal should suggest Menu and Reserveren.
 *
 * Run from the backend directory:
 *   API_URL=https://webtekst.fullfront.nl KEEP=1 \
 *     npx tsx scripts/test-full-flow-bistro.ts
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
// Canned answers — Bistro De Gouden Lepel (horeca / experience mode)
// Persona: Chef Thomas van der Berg, Frans-Nederlands bistro in Den Haag.
// 45 zitplaatsen, lunch + diner di-za, seizoensgebonden, sommelier.
// Tone: verfijnd maar toegankelijk, niet pretentieus.
// ---------------------------------------------------------------------------

const ANSWERS_BY_PART: Record<number, string[]> = {
  1: [
    // p1q1 — wat doe je
    'Ik ben Thomas van der Berg, chef en eigenaar van Bistro De Gouden Lepel aan de Denneweg in Den Haag. We zijn een Frans-Nederlands bistro met 45 zitplaatsen, open voor lunch en diner van dinsdag tot zaterdag. We werken seizoensgebonden met lokale ingrediënten en hebben een wijnkaart van ruim 80 wijnen, met een eigen sommelier op de vloer.',
    // p1q2 — waarom
    'Omdat eten samen iets oplevert wat je niet thuis krijgt. De gesprekken die ontstaan boven een mooie schaal, het moment waarop iemand stilvalt bij de eerste hap van een gerecht, dat is waar ik het voor doe. Ik wilde een plek maken waar mensen even uit de drukte stappen.',
    // p1q3 — uitleg aan vreemde
    'Stel je een ouderwets bistro voor, ruime houten tafels, gedempt licht, een open keuken waar je af en toe een glimp van opvangt. Geen witte servetten of stijve service, gewoon eerlijk koken op het hoogste niveau in een setting die niet doet alsof je in een driesterrenrestaurant zit. Toegankelijk voor de doordeweekse avond én voor een speciale gelegenheid.',
    // p1q4 — voor wie specifiek
    'Vooral mensen tussen de 30 en 65 die van eten houden en bewust kiezen waar ze hun avond doorbrengen. Veel stellen, vriendinnenuitjes, kleine zakelijke etentjes. Mensen die liever een fles wijn delen aan een tafel met aandacht dan in een keten zitten waar je over een uur klaar bent.',
    // p1q5 — ideale klant
    'Iemand die de tijd neemt voor een avond. Die niet meteen om de rekening vraagt na het hoofdgerecht maar nog even napraat met een kop koffie of een digestief. Die advies vraagt over de wijn, of die juist een verrassing wil. Iemand die vakmanschap waardeert zonder dat het pretentieus hoeft te zijn.',
    // p1q6 — wie juist niet
    'Mensen die hier komen voor een snelle hap of die binnen een uur weer weg willen. Ook mensen die alle gerechten willen aanpassen of standaard gluten- én lactose- én ui-vrij willen, want we zijn een keuken die uit principe seizoensgericht en zorgvuldig samengesteld is.',
    // p1q7 — liefste klanten
    'Vaste gasten die elk seizoen terugkomen om het nieuwe menu te proeven. Of mensen die voor het eerst komen omdat een vriend hen tipte en die je tijdens de avond ziet veranderen van "eens kijken" naar oprecht enthousiast.',
    // p1q8 — wat maakt deze klanten fijn
    'Ze hebben tijd. Ze stellen vragen, durven ons te vertrouwen op het wijnadvies, geven oprechte feedback en komen terug. Ze begrijpen dat een goed restaurant niet alleen om het bord gaat maar om het hele samenspel.',
    // p1q9 — liever niet
    'Mensen die ons via een korting-app boeken en dan klagen dat we niet meer doen voor hun bedrag. Of grote luidruchtige groepen die de sfeer voor de andere gasten verstoren.',
    // p1q10 — wat gaat er dan mis
    'Verwachtingen die botsen met onze stijl. Iemand verwacht een snelle bistro-stijl waar je een croque eet en weer weg bent, terwijl we juist een diner in vier of vijf gangen aanbieden. Of iemand die een groep van twaalf wil onderbrengen aan één tafel terwijl onze indeling voor maximaal acht is.',
  ],
  2: [
    // p2q1 — experience override: "Wat zoeken mensen als ze bij jou komen?"
    'Een avond die ze even uit de routine haalt. De meeste gasten willen niet alleen eten, ze zoeken een ervaring. Een tafel waar de tijd even stilstaat, gerechten die ze zelf niet zouden maken, en een omgeving waar ze niet hoeven na te denken over de volgende stap. Iets dat aanvoelt als een uitje, ook al is het op dinsdagavond.',
    // p2q2 — in welke gelegenheid zoeken ze jou
    'Vaak rond een gelegenheid: een verjaardag, een trouwdag, een afgesproken etentje met vrienden die ze al maanden niet hebben gezien. Ook gewoon omdat ze zin hebben in iets bijzonders zonder een uur in de auto te moeten zitten. Of zakelijk: een rustige plek om een gesprek te voeren bij een goed glas wijn.',
    // p2q3 — alternatieven die ze hadden kunnen kiezen
    'Andere bistro\'s in de buurt, een Italiaan, of gewoon thuis koken en een fles wijn opentrekken. Sommigen overwegen een ster-restaurant maar vinden dat te formeel of te duur voor wat ze zoeken.',
    // p2q4 — waarom werken die alternatieven niet
    'Bij andere bistro\'s krijg je vaak een standaardkaart die het hele jaar niet wijzigt. Bij keten-restaurants ontbreekt de aandacht: iedereen krijgt hetzelfde, niemand denkt mee. Thuis koken vraagt energie die ze juist op deze avond niet willen geven. En ster-restaurants zijn vaak te theatraal voor een doordeweekse avond.',
    // p2q5 — wat missen ze in andere ervaringen
    'Persoonlijke aandacht zonder gemaakt te zijn. In de meeste restaurants ben je een tafelnummer; bij ons word je aan tafel begroet, krijg je advies waar je iets aan hebt, en voelt het alsof iemand écht meedenkt. Ook missen ze vaak de seizoensbeleving — bij ons proef je in maart iets compleet anders dan in oktober.',
    // p2q6 — wat missen ze als ze deze ervaring niet hebben
    'Een avond die echt iets toevoegt aan hun week. Een verhaal dat ze de volgende dag op kantoor vertellen ("we waren gisteren in een hele leuke tent in Den Haag"). En het eten zelf — gerechten die ze thuis niet maken en die ze dus alleen bij ons proeven.',
    // p2q7 — wat zouden ze missen als ze niet kwamen
    'Een vakkundig samengesteld menu met lokale ingrediënten op het moment dat het seizoen op zijn best is. Een wijnadvies dat past bij wat ze eten en bij hun smaak. En het soort avond dat je je maanden later nog herinnert omdat de gerechten klopten en de sfeer goed zat.',
  ],
  3: [
    // p3q1 — hoe help je
    'We beginnen met de reservering. Je kiest online een tafel of belt ons en we kijken meteen mee of er bijzonderheden zijn: een verjaardag, allergieën, voorkeur voor een rustig hoekje. Op de avond zelf word je ontvangen, naar je tafel gebracht, en we lopen de kaart door zodat je weet wat je kunt verwachten.',
    // p3q2 — waar begin je altijd mee
    'Met luisteren. Wat is de gelegenheid? Hoe zit het met allergieën? Hoeveel honger heeft de tafel? Op basis daarvan adviseren we het lunchmenu, een 4-gangen of 5-gangen, of een maatwerkmenu als de gelegenheid daarom vraagt.',
    // p3q3 — hoe ziet een traject eruit
    'Reservering, ontvangst, eerste gang met een passend glas, gesprek met de sommelier over de wijnen, hoofdgang, kaas of dessert (of allebei), en koffie. Reken op anderhalf uur voor lunch en tweeënhalf tot drie uur voor diner. We jagen niemand door, we zorgen wel dat de timing tussen de gangen klopt.',
    // p3q4 — stap voor stap uitleg
    'Stap 1: reserveren via website of telefoon. Stap 2: bevestiging per mail. Stap 3: aankomst en ontvangst aan de bar. Stap 4: tafel begeleid en kaart toegelicht. Stap 5: amuse en wijnadvies. Stap 6: gangen in eigen tempo. Stap 7: kaas, dessert of beide. Stap 8: koffie en eventueel digestief. Stap 9: afrekenen rustig aan tafel.',
    // p3q5 — anders dan anderen
    'We schrijven elke zes weken een nieuw menu, écht passend bij wat de seizoenen op dat moment geven. Bij de eerste asperges gaan we direct over op asperge-gerechten, bij wild in oktober krijg je hier wild dat de week ervoor is gehangen. Onze sommelier kent de hele kaart van A tot Z en kan voor elk budget een passende wijn vinden.',
    // p3q6 — waarom werkt dit
    'Omdat onze gasten weten dat ze elke keer iets anders proeven, en dat we niet voor de zekerheid op een commerciële kaart blijven hangen. Wij durven gerechten te maken die misschien niet voor iedereen zijn, en juist daardoor komt onze doelgroep terug. Ook de vaste klanten van de eerste week houden we al jaren.',
    // p3q7 — wat zeggen klanten
    'Dat ze iets proeven wat ze ergens anders niet vinden, en dat ze zich tegelijkertijd op hun gemak voelen. Dat ze verrast worden door de wijnsuggesties, dat de service warm en oprecht is, en dat ze nooit het gevoel hebben dat ze worden afgeraffeld.',
  ],
  5: [
    // p5q1 — beschrijf klanten
    'Marleen en Bas, allebei begin 50, vaste gasten sinds onze opening. Marleen had haar 50e verjaardag en wilde dat hier vieren met acht mensen — uitdaging, want ze hadden allemaal iets anders.',
    // p5q2 — hoe binnenkomen
    'Marleen had voor haar 45e verjaardag al een keer bij ons gegeten en was erop teruggekomen. Voor haar 50e wilde ze het iets bijzonders maken.',
    // p5q3 — situatie ervoor
    'Ze had al twee restaurants overwogen die te formeel waren of te druk. Ze wilde een avond met aandacht, waarin ze zelf niet de avond hoefde te regisseren.',
    // p5q4 — waar liep ze op vast
    'De groep had zes verschillende dieetwensen: een vegetariër, twee glutenarm, één lactoseintolerantie, één hekel aan vis, één pescotariër. Marleen wilde niet dat haar gasten alle aandacht aan hun eigen bord moesten besteden in plaats van het gesprek.',
    // p5q5 — wat veranderde
    'Wij maakten één maatwerkmenu waarin elke gang gewoon werkte voor iedereen, zonder dat er aparte borden naar tafel werden geschoven. De tafel hoefde nergens over te onderhandelen, het was simpelweg een doorlopend menu waar iedereen tegelijk van genoot.',
    // p5q6 — concreet maken
    'Marleen schreef een week later een handgeschreven kaart: "Niemand had door dat we voor zeven verschillende mensen hadden gekookt. Mijn nichten praten er nog steeds over." Ze heeft inmiddels haar 55e ook al bij ons geboekt, vooruit, voor over vijf jaar.',
    // p5q7 — cijfers / quotes
    'We hebben 4.7 sterren op Google met 156 reviews na vier jaar open zijn. Onze drukste maanden zijn maart, mei en oktober, en in die maanden draaien we 90 procent gevuld op vrijdag- en zaterdagavonden. Ongeveer 40 procent van onze gasten is een terugkerende vaste gast.',
  ],
  6: [
    // p6q1 — hoe ben je dit gaan doen
    'Mijn vader had een klein restaurant in Wassenaar waar ik vanaf mijn dertiende afwaste. Op mijn vijftiende stond ik in de keuken sla schoonmaken, op mijn achttiende was ik souschef. Daarna heb ik zeven jaar in Frankrijk gewerkt — Lyon en de Provence — voordat ik terugkwam naar Den Haag om mijn eigen plek te openen.',
    // p6q2 — aanleiding
    'Mijn vader die op zijn 65e wilde stoppen, en ik die voelde dat het tijd was om iets eigens neer te zetten. Niet zijn restaurant overnemen, want zijn stijl was anders. Wel iets eigenzinnigs in dezelfde geest: gastvrij, gericht op het eten zelf.',
    // p6q3 — waarom dit bedrijf
    'Omdat ik geloof dat goed eten en aandacht voor de gast een hoeksteen is van een leuke avond — en dat het tegelijk niet over geld of status hoeft te gaan. Ik wil bewijzen dat een diner van 60 euro net zo memorabel kan zijn als één van 200, mits de bedoeling klopt.',
    // p6q4 — probleem in de wereld
    'De homogenisering van eten. Overal dezelfde poke bowls, dezelfde halloumi-burgers, dezelfde tonijntartaar. Ik wil een tegenwicht zijn voor restaurants die alleen volgen wat populair is, en juist iets brengen wat aan plaats en tijd gebonden is.',
    // p6q5 — geloof in
    'Vakmanschap dat zich niet hoeft op te dringen. Een goede saus heeft uren werk, maar de gast hoeft alleen te proeven dat het klopt. Ook in eerlijke prijsstelling: we werken met goede leveranciers en geven zo veel mogelijk waarde door zonder te beknibbelen op kwaliteit.',
    // p6q6 — wat doe je bewust anders
    'Ik schrijf de kaart elke zes weken zelf, ik koop in bij vier vaste lokale leveranciers (groente, vis, vlees, kaas), en ik werk met de mensen in de keuken alsof het een team is, niet een hiërarchie. En ik ben er elke avond zelf, dat is voor mij niet onderhandelbaar.',
  ],
  7: [
    // p7q1 — wat wil je betekenen
    'Een vaste plek in iemands hoofd voor een speciale avond. Niet de beste van Nederland, maar wel hun favoriete in Den Haag. Een huiskamer waar ze terugkomen voor verjaardagen, jubilea, of een dinsdag waarop ze zin hebben in iets goeds.',
    // p7q2 — wat wil je dat klanten ervaren of onthouden
    'Een gevoel dat ze meer hebben gekregen dan ze hadden verwacht. Dat ze met een glimlach naar buiten lopen en de hele weg naar huis nablikken op de avond. Niet alleen het eten, maar ook hoe ze behandeld zijn.',
    // p7q3 — over 5 jaar
    'Bistro nog steeds open en bloeiend, met een vast team dat al jaren samenwerkt. Misschien een tweede locatie in Scheveningen voor lunch en lichte avondkaart. En een eigen lijn van wijnen die we onder eigen label invoeren met onze sommelier.',
    // p7q4 — grotere ambitie
    'Aantonen dat een bistro op dit niveau in Nederland wél jarenlang vol kan zitten zonder concessies te doen aan kwaliteit. Een toonbeeld zijn voor jonge koks die overwegen om voor zichzelf te beginnen.',
    // p7q5 — waarden niet onderhandelbaar
    'Lokale inkoop, eerlijke prijsstelling, geen toeters en bellen op het bord, persoonlijke aandacht aan tafel. En tijd voor onze gasten — we draaien geen dubbele tafels per avond, en niemand wordt opgejaagd om af te rekenen.',
    // p7q6 — hoe merken klanten dit
    'Aan dat we een groep van zes plaatsen in plaats van een tafel voor twee om te draaien naar twee zittingen. Aan dat de wijn die de sommelier suggereert vaak niet de duurste is. En aan dat we dieetwensen niet als gedoe behandelen, maar als uitdaging waar we plezier in hebben.',
  ],
  8: [
    // p8q1 — vaakste vragen
    'Hebben jullie ook een vegetarisch menu? Hoe ver vooruit moet ik reserveren? Kan ik een fles meebrengen? Doen jullie ook een privé-tafel voor een grotere groep? En vooral: wat is jullie wijnadvies bij dit menu?',
    // p8q2 — wanneer stellen ze deze vragen
    'Bij het reserveren via mail of telefoon. Soms ook tijdens het diner zelf, als ze nog twijfelen tussen wijnopties of een tussengang willen toevoegen.',
    // p8q3 — wat houdt mensen tegen om te boeken (experience override)
    'Twijfel of de stijl bij hun gelegenheid past. Iemand met een viertallen-vergadering twijfelt of wij niet te formeel zijn voor een werketentje, terwijl een stel voor een trouwdag soms denkt dat we juist te informeel zijn. Wij zitten ergens in het midden, en mensen weten niet altijd waar ze ons moeten plaatsen.',
    // p8q4 — wat stellen ze niet hardop
    'Of het wel "hun niveau" is. Sommigen denken dat een seizoensmenu betekent dat alles bijzonder en moeilijk is, terwijl wij juist toegankelijk willen blijven. Of ze zich kunnen veroorloven hier eens in de maand te komen.',
    // p8q5 — misverstanden
    'Dat seizoensgebonden betekent dat we elke week een ander menu hebben — nee, dat is elke zes weken. Dat we een Frans restaurant zijn — we zijn Frans-Nederlands, dus stoofgerechten naast bouillabaisse. En dat we duur zijn — onze lunch is 32,50 euro voor drie gangen, dat is voor de kwaliteit zeker geen onredelijke prijs.',
  ],
  10: [
    // p10q1 — wanneer contact opnemen
    'Voor een reservering: het liefst een week tot drie weken vooruit, vooral voor vrijdag- en zaterdagavond. Voor speciale gelegenheden of grotere groepen graag eerder. Vragen over het menu of allergieën? Mail of bel ons en we helpen meteen.',
    // p10q2 — fase
    'Mensen zoeken een plek voor een gelegenheid en oriënteren zich. Of ze hebben net een aanbeveling gehoord en willen weten of we passen bij wat ze zoeken. Vaste gasten boeken al gewoon hun favoriete tafel.',
    // p10q3 — wat gebeurt bij contact
    'Online via de website komt direct in onze reserveringssysteem, je krijgt binnen een minuut een bevestigingsmail. Bij telefoon of mail antwoordt iemand van het team binnen één werkdag, vaak sneller. We bevestigen, leggen eventuele bijzonderheden vast en sturen een herinnering een dag van tevoren.',
    // p10q4 — proces
    'Reservering via website of telefoon → bevestigingsmail → herinnering 24 uur vooraf → ontvangst bij aankomst → de avond zelf → afrekenen rustig aan tafel → uitnodiging om feedback te delen op Google of via mail. Dat is de hele cyclus.',
    // p10q5 — wat wil je dat ze voelen
    'Vertrouwen en plezier vooraf. Dat ze na contact het idee hebben: hier zijn we welkom, hier wordt aan ons gedacht. Geen gevoel van een transactie, eerder van een afspraak met een vriend.',
    // p10q6 — contactgegevens
    'Telefoon: 070-1234567. E-mail: info@degoudenlepel.nl. Adres: Denneweg 12, 2514 CG Den Haag. Instagram: @degoudenlepel. Website: degoudenlepel.nl. Openingstijden: dinsdag t/m zaterdag, lunch 12:00-14:30, diner 18:00-22:00. Gesloten op zondag en maandag.',
    // p10q7 — zichtbaar op website
    'Ja, alles mag zichtbaar op de website: telefoon, e-mail, adres, openingstijden, en sociale media-links.',
    // p10q8 — bedrijfsnaam, logo, kleuren
    'Bistro De Gouden Lepel. We hebben een logo met een gestileerde lepel in goud op een diepgroene achtergrond. Huisstijlkleuren: diepgroen, goud-okergeel, en gebroken wit. Lettertype: een serif (klassieke uitstraling) gecombineerd met een eenvoudige sans-serif voor lopende tekst.',
    // p10q9 — bestaande teksten
    'Op de oude website staan wat producttekstjes en de menukaart maar die mogen helemaal opnieuw geschreven worden. Op Instagram heb ik een paar captions die de sfeer goed vangen, kunnen worden hergebruikt.',
    // p10q10 — juridisch
    'Privacyverklaring is nodig (we hebben een mailinglijst en reserveringssysteem). Algemene voorwaarden voor reserveringen, met name voor groepsboekingen, ook ja.',
    // p10q11 — tone of voice
    'Verfijnd maar toegankelijk, niet pretentieus. Spreek gasten aan met "je", nooit met "u". Geen overdreven enthousiasme of vakjargon. Eerder warm en uitnodigend, alsof we ze met een glimlach binnenhalen.',
    // p10q12 — pages — moet door AI worden voorgesteld
    'Ja, dat klinkt prima. Voeg ook een pagina "Reserveren" toe als die er nog niet bij stond.',
    // p10q13 — nog iets
    'Nee, ik denk dat we alles hebben gehad. Het belangrijkste is: laat de teksten klinken zoals iemand die met liefde voor het vak praat, zonder dat het als marketing aanvoelt.',
  ],
};

// p4 — 3 ervaringen × 8 questions each (lunch, diner, privé-dining)
const SERVICES = [
  {
    name: 'Lunch',
    answers: [
      'Onze lunch: drie gangen voor 32,50 euro. Een seizoensgebonden voorgerecht, een hoofdgang met vis of vlees naar keuze, en een dessert. We schrijven het menu elke zes weken om en gebruiken zoveel mogelijk lokale ingrediënten. Reken op anderhalf uur, je kunt ook bij twee gangen blijven als de tijd dat vraagt.',
      'Een lunch hoort licht maar wel voldoende te zijn. We hebben de gangen zo opgebouwd dat je niet zwaar de middag in hoeft, maar wel het gevoel hebt dat je iets goeds hebt gegeten. Vegetarische optie altijd mogelijk.',
      'Voor mensen die overdag tijd nemen voor een goed gesprek of voor een zakelijk overleg in een rustige setting. Stellen die een vrije middag samen invullen. Vrienden die elkaar lang niet hebben gezien.',
      'Een doordeweekse middag waarop ze even uit de routine willen, of een vrije zaterdag waarbij ze niet het hele etentje voor s\'avonds willen plannen.',
      'De wens om iets bijzonders mee te maken zonder dat het een hele avond hoeft te beslaan. Een lunch is een meer ingetogen moment dan een diner, maar wel met dezelfde aandacht.',
      'De middag krijgt structuur en een rustpunt. Mensen verlaten de tafel met meer energie dan waarmee ze binnenkwamen, en met een verhaal voor de rest van de dag.',
      'Een seizoensgebonden 3-gangen lunch in een sfeervolle bistro voor 32,50 euro, met de optie om een passende glas wijn toe te voegen vanaf 7,50 euro. Vegetarisch en allergeen-aanpasbaar.',
      'De rust. Het tempo van een lunch hier is anders dan in een gehaaste lunchroom — je voelt direct dat je niet binnen 40 minuten weer buiten staat.',
    ],
  },
  {
    name: 'Diner',
    answers: [
      'Onze hoofdmoot. Een 4-gangen diner voor 49,50 of een 5-gangen voor 59,50, beide volgens hetzelfde seizoensmenu. Inclusief amuse en passende keuzeruimte tussen vis en vlees in de hoofdgang. Wijnsuggesties worden aan tafel besproken met de sommelier.',
      'Een diner hoort een complete avond te zijn, niet een snelle stop. Daarom werken we met meerdere gangen waarin we kunnen variëren in textuur, smaak en intensiteit. Tussen de gangen door is er ruimte voor gesprek, dat is bewust.',
      'Stellen die een mooie avond willen, vaste gasten, kleine zakelijke etentjes voor twee of vier personen, en gelegenheidsdiners (verjaardag, jubileum, eerste of laatste werkdag).',
      'Vaak een afspraak die al weken in de agenda staat. Een gelegenheid waarop ze zich verheugen en waarvoor ze graag de tijd nemen.',
      'De wens om een avond echt te beleven, niet alleen een hap te eten. Mensen zoeken een ervaring waarin het tempo, het eten, de wijnen en de service samenkomen.',
      'Een hele avond gepland en uitgevoerd zonder dat ze er zelf aan hoeven denken. Een gevoel van compleet zorgloos zijn, in een omgeving waar ze niet hoeven na te denken over de volgende stap.',
      'Een 4- of 5-gangen seizoensmenu in een verfijnde bistro-omgeving, met sommelier-advies, voor 49,50 of 59,50 euro per persoon (excl. wijnen). Tafels van 2 tot 8 personen, reken op 2,5 tot 3 uur.',
      'Het tempo en de rust. Bij binnenkomst voel je direct dat je hier de avond gaat doorbrengen, niet alleen even langskomt voor een hap.',
    ],
  },
  {
    name: 'Privé-dining',
    answers: [
      'Voor groepen vanaf 10 personen kunnen we onze achterzaal afsluiten als privé-zaal. Maatwerkmenu in overleg met chef, eigen wijnselectie mogelijk, mogelijkheid voor tafelpresentatie of speech. Reken op 75 euro per persoon, exclusief wijnen.',
      'Privé-dining draait om controle over de avond zonder dat de gastheer of -vrouw alles zelf hoeft te organiseren. Wij zorgen voor het hele kader, zij voor de gasten. Daarom hebben we de zaal apart en kun je het menu volledig op maat samenstellen.',
      'Bedrijven die een teamuitje of relatiediner organiseren, families voor een verjaardag of jubileum, of vriendengroepen die een speciale gelegenheid willen vieren zonder dat de hele bistro hen hoort.',
      'Vaak een gelegenheid waarvan de gastheer wil dat het goed georganiseerd is, en waarbij ze er zelf van willen genieten zonder organisator te zijn.',
      'De wens om een groep iets bijzonders te bieden in een afgesloten setting, met de aandacht en kwaliteit van een diner-avond, zonder de logistieke last van thuis koken of catering inhuren.',
      'De avond loopt soepel voor iedereen, inclusief de gastheer. De zaal voelt persoonlijk, het maatwerkmenu past bij wat ze willen, en de hele groep krijgt de aandacht.',
      'Een afgesloten privé-zaal voor 10 tot 24 personen met maatwerkmenu, eigen wijnkeuze, en aparte service. Vanaf 75 euro per persoon. Mogelijk in combinatie met een rondleiding in de keuken voor de gasten als afsluiter.',
      'Dat ze even apart zitten van de andere gasten. De zaal heeft eigen verlichting en eigen sfeer, dat geeft direct een gevoel van een eigen avond.',
    ],
  },
];

const META_BLOG_OPTIN_ANSWER = 'Nee, geen blog. Een nieuwsbrief over het seizoensmenu is wel een ideetje voor later.';

const GENERIC_FALLBACKS = [
  'Daar denk ik regelmatig over na. Onze keuken is opgebouwd vanuit het idee dat eten een avond moet kunnen dragen, niet alleen een hapje moet zijn. Vakmanschap, seizoenswerk, en aandacht voor de gast vormen samen wat we proberen neer te zetten — niets meer, niets minder.',
  'Dat is een goede vraag, maar wat ik eerder al zei vat het eigenlijk al goed samen. We werken seizoensgebonden, schrijven elke zes weken een nieuw menu, en hebben een sommelier die het aanbod van begin tot eind kent. Reserveren via website of telefoon, en de prijzen staan helder op de menukaart.',
  'Daar zou ik niet veel meer aan toe willen voegen dan ik al heb verteld. Een avond bij ons spreekt vooral voor zich. We laten de gerechten zelf het verhaal vertellen, en zorgen dat de service daarbij past zonder dat het opvalt of stoort.',
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
      ? 'Ja, ik heb nog een andere optie om te bespreken.'
      : 'Nee, dit zijn de drie hoofdopties.';
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
  console.log('  Webtekst-assistent — Bistro De Gouden Lepel (horeca / experience)');
  console.log(`  API: ${API_URL}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const testEmail = `bistro-${Date.now()}@webtekst-test.local`;
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
      { name: 'Bistro De Gouden Lepel - Test' }
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
