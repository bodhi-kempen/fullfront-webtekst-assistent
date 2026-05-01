/**
 * End-to-end smoke test — Kapsalon Mila (boeking_gedreven archetype).
 *
 * Mirror of test-full-flow.ts but with answers tailored to a hairdresser
 * persona so we can validate that the boeking_gedreven generators produce
 * appropriate copy (booking CTAs, female-warm tone, "je"-form, etc.).
 *
 * Run from the backend directory:
 *   API_URL=https://backend-production-97cd.up.railway.app KEEP=1 \
 *     npx tsx scripts/test-full-flow-mila.ts
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
// Canned answers — Kapsalon Mila (boeking_gedreven)
// Persona: Mila Jansen, eigenaar Kapsalon Mila, Rotterdam-West.
// 12 jaar kapster, 5 jaar eigen salon, 2 medewerkers, op afspraak via Treatwell.
// Diensten: knippen €39, kleuren/highlights vanaf €65, bruidskapsels €249.
// Doelgroep: vrouwen 25-55 in Rotterdam-West. 4.8/5 op Google, 89 reviews.
// Huisstijl: roze, wit, goud. Tone: warm, vrouwelijk, "je"-vorm.
// ---------------------------------------------------------------------------

const ANSWERS_BY_PART: Record<number, string[]> = {
  1: [
    // p1q1 — wat doe je
    'Ik ben Mila Jansen, eigenaar van Kapsalon Mila in Rotterdam-West. Ik werk al 12 jaar als kapster en heb sinds 5 jaar mijn eigen salon. We knippen, kleuren en stylen vooral vrouwen, met een team van drie inclusief mezelf. Klanten boeken online via Treatwell of bellen ons.',
    // p1q2 — waarom
    'Ik vind het magisch om iemand met een goed knipbeurt naar buiten te zien lopen. Vrouwen komen binnen na een drukke week en verlaten de salon weer met meer zelfvertrouwen. Dat moment is waar ik het voor doe, daarom ben ik 12 jaar geleden begonnen.',
    // p1q3 — uitleg aan vreemde
    'Ik leid een gezellige damessalon in Rotterdam-West waar vrouwen tot rust komen, een nieuwe coupe krijgen en even helemaal verwend worden. Geen haastige knipbeurt, maar twee uur tijd voor jezelf met goede koffie en eerlijk advies van een ervaren team.',
    // p1q4 — voor wie specifiek
    'Voor vrouwen tussen 25 en 55 in Rotterdam-West die hun haar belangrijk vinden en bereid zijn ervoor te betalen. Veel werkende moeders, ondernemers, en stellen die voor hun bruiloft komen. Ze willen kwaliteit en willen zich op hun gemak voelen.',
    // p1q5 — ideale klant
    'Een vrouw van begin 30 tot eind 40, druk gezin of carrière, die elke 8 weken bij ons komt voor een knipbeurt en eens in de drie maanden voor highlights. Ze vertrouwt mij en het team, geeft ons de ruimte om mee te denken, en boekt vooruit voor een heel jaar.',
    // p1q6 — wie juist niet
    'Klanten die alleen op prijs zoeken of die binnen 30 minuten klaar willen zijn. Ook mensen die met een Pinterest-foto komen en exact dat resultaat eisen zonder mee te denken over wat bij hun gezicht en haartype past.',
    // p1q7 — liefste klanten
    'Vrouwen die al een paar keer geweest zijn en ons vertrouwen. Die niet bang zijn voor een nieuwe kleur of coupe, die genieten van het hele proces met een kop koffie erbij. Ook bruiden in het voortraject zijn fijn, dat zijn vaak hele intieme gesprekken.',
    // p1q8 — wat maakt deze klanten fijn
    'Ze hebben tijd, ze laten ons doen waar we goed in zijn, en ze waarderen het werk. Ze geven eerlijke feedback en vertellen het door aan vriendinnen en collega\'s. Vaak zijn het ook klanten die jaren bij ons blijven.',
    // p1q9 — liever niet
    'Mensen die alleen voor een knipbeurt van 20 minuten willen komen omdat ze het bij de buren goedkoper kunnen krijgen. Klanten die last-minute boeken, niet komen opdagen of altijd ontevreden zijn ongeacht het resultaat.',
    // p1q10 — wat gaat mis
    'Ze haasten zich, geven geen ruimte voor advies en zijn dan teleurgesteld als het niet exact lijkt op het Pinterest-plaatje. Of ze boeken via Treatwell de goedkoopste optie en verwachten dan een complete kleurbehandeling.',
  ],
  2: [
    // p2q1 — problemen vooraf
    'Ze hebben slechte ervaringen gehad bij andere salons. Te haastig geknipt, kleur die niet matcht, of een kapper die niet luistert. Ze komen binnen met onzekerheid en willen eerst even kijken of ze ons vertrouwen.',
    // p2q2 — hoe uit zich dat
    'Ze laten hun haar lang groeien omdat ze bang zijn dat het weer mis gaat. Ze gaan om de tafel met meerdere salons voordat ze kiezen. Of ze blijven jaren bij dezelfde matige kapper omdat het overstappen ze afschrikt.',
    // p2q3 — wat geprobeerd
    'Ze proberen verschillende salons in de wijk, kijken op Treatwell, vragen vriendinnen om aanbevelingen, of doen het zelf thuis met boxkleuringen die natuurlijk niet werken zoals beloofd.',
    // p2q4 — waarom werkte niet
    'Omdat in veel salons de tijd ontbreekt voor een goed gesprek. De kapper begint meteen, vraagt niet wat je echt wilt, en het resultaat past niet bij je gezicht of leefstijl. Bij thuis kleuren ontbreekt simpelweg het vakmanschap.',
    // p2q5 — frustratie
    'Geld kwijt zijn aan een knipbeurt waar je niet blij mee bent. Of een kleur die binnen drie weken al uitspoelt. Maar ook: het gevoel dat ze niet gehoord worden, dat ze nummer 47 van de dag zijn.',
    // p2q6 — kosten in tijd, geld, energie
    'Een mislukte kleur kost al gauw 80 tot 150 euro, en daarna nog een keer naar een andere kapper om het te corrigeren. Plus de mentale ruimte: je voelt je onzeker bij elke vergadering of feestje totdat je haar weer goed zit.',
    // p2q7 — wat gebeurt als ze niets doen
    'Dan blijven ze hangen in een coupe die niet meer past. Hun zelfvertrouwen krijgt deuken op feestjes of werk, ze houden zich liever stil. Vrouwen die dit te lang uitstellen voelen dat hun haar hun energie omlaag haalt.',
  ],
  3: [
    // p3q1 — hoe help je
    'Ik begin altijd met een gesprek van 10 minuten voordat we knippen. Hoe je je haar nu draagt, wat je leefstijl is, hoeveel tijd je elke ochtend hebt. Pas daarna pakken we de schaar of de kwast.',
    // p3q2 — waar begin je
    'Met luisteren en kijken. Niet meteen knippen, maar eerst goed in de spiegel kijken naar de gezichtsvorm, de natuurlijke val van het haar, de huidige conditie. Dat bepaalt wat überhaupt mogelijk is.',
    // p3q3 — traject
    'Boeking via Treatwell of telefonisch. Je komt binnen, krijgt koffie of thee, we doen het intakegesprek, dan wassen, knippen en stylen. Bij kleur komt er een diagnose en patch test bij. Reken op anderhalf tot twee uur in totaal.',
    // p3q4 — stap voor stap
    'Stap 1: aankomst en koffie. Stap 2: intake gesprek waarin we kijken naar wat je wilt en wat past. Stap 3: wassen met scalp massage. Stap 4: kleuren of behandelen indien nodig. Stap 5: knippen. Stap 6: drogen en stylen. Stap 7: afrekenen en cadeaubon meegeven indien gewenst.',
    // p3q5 — anders dan anderen
    'Wij nemen tijd. Geen klant gaat weg in minder dan een uur. Onze kleurenkast is groter dan bij de meeste salons, we werken met Wella en Davines en kunnen iedere wens vertalen naar een werkbare formule. Mijn team is getraind in zowel coupage als kleurtechnieken.',
    // p3q6 — waarom werkt
    'Omdat klanten zich gehoord voelen en weggaan met een coupe die ze zelf thuis ook kunnen stylen. Geen onverwachte resultaten, geen gevoel van te haastig zijn afgewerkt. Mensen plannen meteen hun volgende afspraak voor over 8 weken.',
    // p3q7 — wat zeggen klanten
    'Dat ze al jaren bij ons blijven en het altijd zo fijn vinden. Dat ze zich op hun gemak voelen, dat we eerlijk zijn als iets niet kan, en dat de salon altijd schoon en gezellig is. Veel klanten zeggen ook dat ze hun vriendinnen meegenomen hebben.',
  ],
  5: [
    // p5q1 — beschrijf klanten
    'Sandra, 42, marketing manager. Komt sinds 4 jaar elke 8 weken voor knippen, elke 12 weken voor highlights. Ze had voor ons jarenlang ontevreden bij verschillende kappers gezeten.',
    // p5q2 — hoe binnenkomen
    'Via een vriendin op kantoor die al klant was bij ons. Ze had een keer onze kleurresultaten gezien op een feestje en gevraagd wie het had gedaan.',
    // p5q3 — situatie ervoor
    'Ze had blond haar dat steeds meer geel werd na boxkleuringen. Een coupe die zes maanden niet was bijgewerkt. Ze schaamde zich op werk en had altijd haar haar in een knot om de wortels te verbergen.',
    // p5q4 — waar liep ze op vast
    'Geen tijd om elke maand naar de kapper te gaan, maar ook geen budget om elke keer de duurste optie te kiezen. En vooral: het vinden van een salon waar ze niet als nummer behandeld werd.',
    // p5q5 — wat veranderde
    'Bij ons koos ze voor een lichtere blonde basis met fijne highlights die ze 12 weken kan dragen. Een coupe die thuis stylebaar is binnen 5 minuten. Ze noemt onze salon nu haar "zelfzorg-uurtje" en boekt een jaar vooruit.',
    // p5q6 — concreet
    'Sandra schreef in een Google review: "Bij Mila krijg je niet alleen een kapper, je krijgt advies van een vriendin die toevallig 12 jaar ervaring heeft. Ik kom eruit alsof ik op vakantie ben geweest." Ze heeft inmiddels drie collega\'s naar ons verwezen.',
    // p5q7 — cijfers / quotes
    'We hebben 4.8 sterren op Google met 89 reviews. Ongeveer 78 procent van onze klanten boekt binnen het jaar terug, en 60 procent komt via mond-op-mond reclame. We staan in de top 5 kapsalons in Rotterdam-West op Treatwell.',
  ],
  6: [
    // p6q1 — hoe ben je dit gaan doen
    'Mijn moeder had thuis altijd vriendinnen over de vloer voor knipbeurten in de keuken. Ik mocht vanaf mijn tiende meekijken en helpen. Op mijn 16e ben ik begonnen aan de kappersopleiding en sindsdien heb ik nooit iets anders gewild.',
    // p6q2 — aanleiding
    'De zomer dat ik 25 werd. Ik werkte toen 7 jaar bij een grote keten en zag dat alles draaide om snelheid en omzet. Een klant huilde bij me omdat ze 30 minuten haastig was geknipt voor een belangrijke afspraak. Toen wist ik: dit moet anders.',
    // p6q3 — waarom dit bedrijf
    'Omdat vrouwen die anderhalf uur voor zichzelf nemen en weggaan met meer zelfvertrouwen dan ze binnenkwamen. Dat verdient een plek waar dat met aandacht en tijd kan, zonder dat het een industriële handeling wordt.',
    // p6q4 — probleem in de wereld
    'Het idee dat een knipbeurt een kostenpost is in plaats van zelfzorg. Ik wil dat vrouwen voelen dat hun uurtje bij ons net zo legitiem is als sport of therapie, en dat ze er energie van krijgen voor de rest van de week.',
    // p6q5 — geloof in
    'Eerlijkheid. Als een coupe of kleur niet werkt voor jouw haar, zeg ik dat. Beter een teleurgestelde klant nu dan een teleurgestelde klant na drie weken. En ik geloof in het vak: blijven leren, trainingen volgen, niet stilstaan.',
    // p6q6 — wat doe je bewust anders
    'Ik plan nooit twee klanten tegelijk in. Geen overlap. Klant heeft mijn volledige aandacht voor anderhalf tot twee uur. En ik vraag altijd terug bij de volgende afspraak of de coupe heeft gedaan wat ze hoopten, en pas indien nodig aan.',
  ],
  7: [
    // p7q1 — wat wil je betekenen
    'Een plek zijn waar mijn klanten komen om weer even op adem te komen. Geen luxe, maar warmte. Geen poespas, maar vakmanschap. Dat ze weggaan met meer dan een nieuw kapsel.',
    // p7q2 — wat moeten ze overhouden
    'Het gevoel dat iemand naar ze geluisterd heeft, dat hun haar gezond is, en dat ze er goed uitzien. En het besef dat ze de volgende keer weer met plezier in de stoel kunnen zitten zonder zorgen.',
    // p7q3 — over 5 jaar
    'Mila Hair Studio met 4 medewerkers, een eigen kleurmerk in samenwerking met een groothandel, en een vaste plek in de top 3 van Rotterdam-West. Misschien een tweede locatie in Capelle, maar alleen als kwaliteit gegarandeerd kan blijven.',
    // p7q4 — grotere ambitie
    'Een salonketen opbouwen die laat zien dat een damessalon op een nieuwe manier kan werken. Niet de fastfood-aanpak van de grote ketens, maar een opschaalbare versie van wat ik nu doe. En jonge kapsters opleiden in mijn manier van werken.',
    // p7q5 — waarden
    'Tijd nemen. Eerlijk advies. Vakmanschap voor alles. Geen klant ooit haasten. Geen verkoop pushen die je eigenlijk niet nodig hebt. Klanten zijn geen omzet, het zijn mensen.',
    // p7q6 — hoe merken klanten dit
    'Aan de tijd die ze krijgen. Aan het feit dat we nooit hun haar verkeerd uitspoelen of haastig drogen. Aan onze prijzen die kloppen met de tijd die we erin steken. En aan dat we hen herinneren als ze de tweede keer terugkomen, ook al was het 6 maanden geleden.',
  ],
  8: [
    // p8q1 — vaakste vragen
    'Hoe lang duurt het? Wat kost een totaalbehandeling? Werken jullie ook met natuurlijke producten? Kan ik een proefkleurtje doen? En heel vaak: kun je iets aan mijn grijze wortels doen zonder dat ik er ouder uit ga zien?',
    // p8q2 — wanneer stellen ze deze vragen
    'Vaak in de dagen voor de afspraak via WhatsApp, of bij binnenkomst tijdens het intakegesprek. Bruiden vragen ze al weken vooruit, vaak in een proefafspraak.',
    // p8q3 — twijfels
    'Of de prijs het waard is. Of het wel echt anders is dan bij een goedkopere kapper. Of de kleur lang genoeg blijft zitten. Of ze het thuis ook kunnen stylen of dat het na twee dagen al uit het model is.',
    // p8q4 — niet hardop
    'Of ze "te oud" zijn voor een bepaalde coupe. Of we ze niet uitlachen als ze met onmogelijke wensen komen. Of we eerlijk zeggen wat bij ze past, ook als dat niet is wat ze willen horen.',
    // p8q5 — misverstanden
    'Dat duurder altijd beter is. Dat blond worden in één behandeling kan zonder schade. Dat coupe en kleur in een uurtje kan. En het allergrootste: dat een goede kapsalon alleen voor speciale gelegenheden is.',
  ],
  10: [
    // p10q1 — wanneer contact opnemen
    'Het liefst zodra je merkt dat je toe bent aan een knipbeurt of kleur, niet pas als het echt niet meer kan. Wij werken meestal 4 tot 6 weken vooruit, dus tijdig boeken loont. Voor bruidskapsels graag minimaal 3 maanden vooruit.',
    // p10q2 — fase
    'Soms net verhuisd naar Rotterdam-West en zoekend naar een vaste salon. Soms ontevreden bij de huidige kapper. Soms bruid in het voortraject. En vaak gewoon: terugkerende klanten die online een vervolgafspraak boeken.',
    // p10q3 — wat gebeurt er bij contact
    'Boeking via Treatwell loopt automatisch en je krijgt direct een bevestiging. Bel je ons, dan beantwoord ik of een van mijn medewerkers binnen kantooruren. We checken beschikbaarheid en sturen vervolgens een bevestigingsmail.',
    // p10q4 — proces
    'Online: kies dienst en tijdslot op Treatwell, betaal aanbetaling, ontvang bevestiging plus reminder 24 uur vooraf. Bij ons: aankomst, koffie, intake, behandeling, afrekenen via pin of Treatwell, volgende afspraak inplannen.',
    // p10q5 — wat moeten ze voelen
    'Welkom en gezien. Geen drempel om binnen te lopen. Vertrouwen dat ze in goede handen zijn. Rust dat ze niet gehaast worden. Warmte alsof ze bij een vriendin op bezoek komen.',
    // p10q6 — contactgegevens
    'Telefoon: 010-3334455. E-mail: hallo@kapsalonmila.nl. Adres: Aelbrechtskolk 28, 3024 RE Rotterdam. Instagram: @kapsalonmila. Online boeken: treatwell.nl/kapsalonmila. Openingstijden: dinsdag tot zaterdag 9:30 tot 18:00.',
    // p10q7 — zichtbaar op website
    'Ja, alles mag zichtbaar op de website. Telefoonnummer, e-mail en adres allemaal openbaar.',
    // p10q8 — bedrijfsnaam, logo, kleuren
    'Kapsalon Mila is de bedrijfsnaam. Ik heb een logo met een gouden M op een roze achtergrond. Huisstijlkleuren zijn zacht roze, gebroken wit en mat goud. Lettertype graag rond en vrouwelijk.',
    // p10q9 — bestaande teksten
    'Nee, alles nieuw. Op Treatwell staat een korte beschrijving maar die mag overschreven worden. Op Instagram heb ik wat tekst in mijn bio die kan worden hergebruikt.',
    // p10q10 — juridisch
    'Privacyverklaring is nodig voor de boekingen via Treatwell en de mailinglijst. Algemene voorwaarden voor cadeaubonnen en bruidskapsels graag ook.',
    // p10q11 — tone of voice
    'Warm en vrouwelijk, alsof je een vriendin spreekt. Spreek klanten aan met "je", nooit met "u". Iets uitnodigend, een beetje speels, maar wel professioneel.',
    // p10q12 — gewenste pagina's
    'Home, Over ons, Behandelingen en prijzen, Bruidskapsels, Ervaringen, Cadeaubonnen, Contact. En een online boekpagina die naar Treatwell linkt.',
    // p10q13 — nog iets
    'Nee, ik denk dat ik alles heb verteld. Het belangrijkste is dat klanten zich welkom voelen en het gevoel krijgen dat hun tijd en haar serieus genomen worden.',
  ],
};

// p4 — 3 services × 8 questions each
const SERVICES = [
  {
    name: 'Knippen',
    answers: [
      // p4_s1_q1 — naam + inhoud
      'Knippen voor dames. Inclusief intakegesprek, wassen met scalp massage, eventueel een diepe verzorgingsbehandeling, knippen volgens jouw wens en gezichtsvorm, drogen en stylen. Reken op een uur tot 75 minuten. 39 euro.',
      // p4_s1_q2 — waarom zo ingericht
      'Omdat een goede knipbeurt begint met een goed gesprek. Wat doe je elke ochtend? Hoeveel tijd heb je? Wat past bij je leefstijl? Pas dan kunnen we knippen wat thuis ook werkt.',
      // p4_s1_q3 — voor wie
      'Voor vrouwen die hun coupe willen onderhouden of toe zijn aan iets nieuws. Werkende moeders, ondernemers, vrouwen die regelmatig hun haar laten knippen en ook even tijd voor zichzelf willen.',
      // p4_s1_q4 — situatie
      'Coupe is uit model gegroeid, hangt slap, lijkt nergens meer naar. Of ze willen iets veranderen, korter, een pony erbij, een ander silhouet. Soms na een levensgebeurtenis: nieuwe baan, nieuwe relatie, nieuw begin.',
      // p4_s1_q5 — probleem
      'Een coupe die niet meer werkt voor je gezicht of leefstijl, en die je elke ochtend frustreert omdat het niet zit zoals je wilt. Of haar dat te zwaar is voor de zomer.',
      // p4_s1_q6 — wat verandert
      'Je krijgt een coupe die werkt zonder dat je er elke ochtend 20 minuten aan kwijt bent. Geen vechten meer met je haar, geen knot omdat het niet zit. Een silhouet dat je gezicht versterkt.',
      // p4_s1_q7 — wat levert het op
      'Zelfvertrouwen, tijdwinst, en het gevoel dat je hoofd op orde is. Klanten zeggen vaak dat ze rechtop lopen na de knipbeurt en dat hun werkdag soepeler gaat.',
      // p4_s1_q8 — eerste merken
      'Het verschil als ze in de spiegel kijken. Het lichte gevoel op hun hoofd na het wassen en knippen. Het feit dat de coupe nog steeds zit als ze de volgende ochtend wakker worden.',
    ],
  },
  {
    name: 'Kleuren en highlights',
    answers: [
      // p4_s2_q1 — naam + inhoud
      'Kleuren en highlights met Wella en Davines producten. Van wortelbijwerken tot complete kleurverandering, balayage, foliehighlights of all-over kleuringen. Inclusief diagnose, kleurkeuze, behandeling, knippen indien gewenst, en stylen. Vanaf 65 euro voor wortels, vanaf 95 euro voor highlights.',
      // p4_s2_q2 — waarom
      'Omdat een goede kleur het verschil maakt tussen een verzorgde uitstraling en een vermoeide. We werken altijd met een patch test bij nieuwe klanten en ik geef altijd eerlijk advies over wat haalbaar is in één sessie.',
      // p4_s2_q3 — voor wie
      'Vrouwen met grijze wortels die natuurlijk willen blijven. Vrouwen die toe zijn aan iets nieuws maar bang zijn dat het niet werkt. En klanten die een complete metamorfose willen voor een speciale gelegenheid.',
      // p4_s2_q4 — situatie
      'Wortels die uitgegroeid zijn en haar dat dof oogt. Of ze hebben thuis met een boxkleuring geprobeerd en het is niet geworden wat ze hoopten. Of ze willen voor een speciale gelegenheid eens iets anders.',
      // p4_s2_q5 — probleem
      'Grijze wortels die hun zelfvertrouwen op vergaderingen ondermijnen. Een doffe kleur die hun gezicht ouder maakt. Of een mislukte thuiskleuring die op de schouders is afgeschilferd.',
      // p4_s2_q6 — wat verandert
      'Een kleur die past bij hun huidtone, lang blijft zitten, en die thuis te onderhouden is met de juiste shampoo en mask. Geen lijntje meer aan de wortels na drie weken.',
      // p4_s2_q7 — wat levert het op
      'Een verjonging van een paar jaar zonder dat het er kunstmatig uitziet. Meer zelfvertrouwen op werk en bij vriendinnen. En het gevoel dat ze er weer uitzien zoals ze zich voelen.',
      // p4_s2_q8 — eerste merken
      'De glans. Direct na de behandeling zien klanten in de spiegel dat hun haar weer leeft. En ze ruiken meestal hoe de Davines producten ruiken, dat blijft de hele dag bij.',
    ],
  },
  {
    name: 'Bruidskapsels',
    answers: [
      // p4_s3_q1 — naam + inhoud
      'Bruidskapsels voor jouw trouwdag. Inclusief proefafspraak van anderhalf uur 6 weken voor de bruiloft waarin we 2 of 3 stylings testen, en de bruiloftsdag zelf met opsteken, watergolven, accessoires plaatsen en touch-ups indien nodig. 249 euro inclusief proefafspraak. Optioneel ook make-up via een collega.',
      // p4_s3_q2 — waarom
      'Omdat een trouwdag geen ruimte heeft voor verrassingen. De proefafspraak is wat ons onderscheidt van veel collegas die alleen op de dag zelf werken. Bruiden gaan met rust het altaar op.',
      // p4_s3_q3 — voor wie
      'Bruiden die een ervaren professional willen die de hele dag flexibel kan blijven. Vaak vrouwen die ook al klant bij ons zijn voor knip- en kleurbeurten en mij vertrouwen.',
      // p4_s3_q4 — situatie
      'Trouwen over 3 tot 12 maanden, op zoek naar een styliste die meedenkt met de jurk, het thema, en hun haartype. Vaak ook bezig met make-up artist, fotograaf, locatie tegelijk.',
      // p4_s3_q5 — probleem
      'De angst dat het haar op de dag zelf niet zit zoals ze hoopten. Verhalen van vriendinnen over kapsels die uit het model vielen tijdens de eerste dans. Of bruiden die hun proefafspraak niet kregen.',
      // p4_s3_q6 — wat verandert
      'Een vooraf geteste styling die we exact kunnen herhalen. Een kapper op de dag zelf die rustig en flexibel is, ook als de jurk last-minute aangepast wordt of als het regent.',
      // p4_s3_q7 — wat levert het op
      'Een rustige bruiloftsochtend en haar dat de hele dag goed blijft zitten, ook na de eerste dans en het feest. Foto\'s waar ze blij van worden.',
      // p4_s3_q8 — eerste merken
      'Het gevoel van ontspanning tijdens de proefafspraak, omdat ze weten dat we het al een keer hebben gedaan. Op de dag zelf: dat ze de hele dag niet meer aan hun haar hoeven te denken.',
    ],
  },
];

const META_BLOG_OPTIN_ANSWER = 'Nee, ik wil geen blog op mijn website.';

const GENERIC_FALLBACKS = [
  'Daar denk ik regelmatig over na. Mijn aanpak komt voort uit 12 jaar ervaring met heel veel verschillende vrouwen. Ik heb gemerkt dat aandacht en tijd het verschil maken tussen een gemiddelde knipbeurt en een waar mensen jaren over praten.',
  'Dat is een goede vraag, maar wat ik eerder al zei vat het eigenlijk al goed samen. Mijn salon draait om vakmanschap, eerlijk advies en ruimte. Prijzen staan duidelijk op Treatwell en ik werk bewust zonder verborgen kosten.',
  'Daar zou ik niet veel meer aan toe willen voegen dan ik al heb verteld. Mijn werk staat voor zich. In het intakegesprek bespreken we precies wat er gebeurt, en klanten krijgen altijd ruimte om mee te denken voordat we beginnen.',
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
      ? 'Ja, ik heb nog een andere dienst om te bespreken.'
      : 'Nee, dit zijn mijn drie diensten.';
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
  console.log('  Webtekst-assistent — Kapsalon Mila smoke test');
  console.log(`  API: ${API_URL}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const testEmail = `mila-${Date.now()}@webtekst-test.local`;
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
      { name: 'Kapsalon Mila - Test' }
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

    console.log(
      `\n═══ ${pagesRes.pages.length} PAGES ═══════════════════════════════\n`
    );
    for (const p of pagesRes.pages) {
      console.log(`◆ ${p.title}  (/${p.slug})`);
      console.log(JSON.stringify(p.sections, null, 2));
      console.log('───────────────────────────────────────────────────────────\n');
    }

    // Print usage summary from the new claude_usage table.
    stamp('\nQuerying claude_usage table for this project…');
    const { data: usage, error: usageErr } = await admin
      .from('claude_usage')
      .select('purpose, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, cost_usd')
      .eq('project_id', projectId);

    if (usageErr) {
      console.warn('Could not fetch usage:', usageErr.message);
    } else if (usage && usage.length > 0) {
      const byPurpose = new Map<string, { calls: number; cost: number }>();
      let totalCost = 0;
      let totalIn = 0;
      let totalOut = 0;
      let totalCacheR = 0;
      let totalCacheW = 0;
      for (const u of usage) {
        const c = Number(u.cost_usd ?? 0);
        const cur = byPurpose.get(u.purpose) ?? { calls: 0, cost: 0 };
        cur.calls += 1;
        cur.cost += c;
        byPurpose.set(u.purpose, cur);
        totalCost += c;
        totalIn += u.input_tokens ?? 0;
        totalOut += u.output_tokens ?? 0;
        totalCacheR += u.cache_read_tokens ?? 0;
        totalCacheW += u.cache_creation_tokens ?? 0;
      }
      console.log(`\n═══ USAGE SUMMARY ═══════════════════════════════════════`);
      console.log(`Total calls: ${usage.length}`);
      console.log(`Total tokens: input=${totalIn} output=${totalOut} cache_read=${totalCacheR} cache_write=${totalCacheW}`);
      console.log(`Total cost: $${totalCost.toFixed(4)}\n`);
      console.log(`By purpose:`);
      for (const [purpose, agg] of [...byPurpose.entries()].sort((a, b) => b[1].cost - a[1].cost)) {
        console.log(`  ${purpose.padEnd(28)} ${String(agg.calls).padStart(3)} calls   $${agg.cost.toFixed(4)}`);
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
