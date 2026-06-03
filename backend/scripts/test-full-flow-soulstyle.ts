/**
 * End-to-end smoke test — Soulstyle Studio (boeking_gedreven, kapsalon aan huis).
 *
 * Specifically tests the prompt-accuracy fixes:
 *  - p5q7 "no reviews/quotes" → testimonials should be placeholders, NOT fabrication
 *  - p7q3 "misschien webshop" → should remain a possibility, not a fact
 *  - p4 concrete prices → should appear on behandelingen page
 *  - Rachel should be used as the name (not Sophie / Natasja / Eva etc.)
 *
 * Run from backend/:
 *   API_URL=https://webtekst.fullfront.nl KEEP=1 \
 *     npx tsx scripts/test-full-flow-soulstyle.ts
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
// Soulstyle Studio — Rachel, kapsalon aan huis. Warm, eerlijk, niet commercieel.
// ---------------------------------------------------------------------------

const ANSWERS_BY_PART: Record<number, string[]> = {
  1: [
    // p1q1
    'Ik ben Rachel en ik run Soulstyle Studio, een kapsalon aan huis. Ik kom bij mensen thuis voor knippen, kleuren en andere haarbehandelingen. Klanten boeken via mijn boekingssysteem Aimy. Ik werk alleen, dus persoonlijke aandacht is de kern van wat ik doe.',
    // p1q2
    'Omdat ik geloof dat een knipbeurt in je eigen woonkamer iets anders is dan in een drukke salon. Geen wachtrij, geen geluid op de achtergrond, gewoon rust en aandacht. Dat past bij hoe ik met mijn vak om wil gaan.',
    // p1q3
    'Een persoonlijke kapsalon die naar je toe komt. Ik werk in je eigen huis, neem alles mee wat nodig is, en geef je de tijd voor een goede knipbeurt of kleuring zonder de drukte van een salon eromheen.',
    // p1q4
    'Voor mensen die het idee van een rustige knipbeurt thuis aantrekkelijker vinden dan een salonbezoek. Vaak vrouwen tussen de 30 en 60, soms ouderen die moeilijk de deur uit kunnen, en mensen met jonge kinderen die niet weg willen.',
    // p1q5
    'Iemand die waarde hecht aan aandacht en tijd. Iemand die het idee heeft dat een knipbeurt een rustig moment voor zichzelf hoort te zijn, niet een snelle stop tussen werk en boodschappen door.',
    // p1q6
    'Mensen die binnen 20 minuten klaar willen zijn of die op de cent letten. Daar past mijn aanpak niet bij. Ook last-minute boekingen voor de volgende dag werken meestal niet, ik werk vooraf gepland.',
    // p1q7
    'Vaste klanten die elke 8 tot 12 weken terugkomen. Mensen die hun knipbeurt zien als een vast onderdeel van hun zorg voor zichzelf, niet als een verplichting.',
    // p1q8
    'Ze nemen de tijd, ze waarderen het werk, ze geven eerlijke feedback. En ze gunnen mijn werk aan vriendinnen en collegas, dat is voor mij goud waard.',
    // p1q9
    'Mensen die elke twee maanden afzeggen op de dag zelf, of die continu om kortingen vragen. Of die verwachten dat ik avonden en weekenden volstop met spoedboekingen.',
    // p1q10
    'Verwachtingen die niet kloppen. Iemand verwacht dat ik 45 minuten voor 25 euro kom doen, terwijl een goede knipbeurt thuis al gauw anderhalf uur duurt inclusief opzetten en opruimen.',
  ],
  2: [
    'Veel mensen vinden de drukte van een salon niet meer fijn. Ze willen de muziek niet, het wachten niet, en ze willen niet steeds andere kapsters die niet weten wat hun haar typisch doet. Maar de stap naar iemand thuis is voor velen onbekend.',
    'Ze stellen de knipbeurt uit. Dragen het langer dan ze willen, gaan een keer in de stress in een keten, en zijn daarna ontevreden. Of ze doen het zelf met een tondeuse en hopen er het beste van.',
    'Veel klanten hebben verschillende salons geprobeerd of doen het zelf thuis. Sommigen vroegen een vriendin om te knippen.',
    'Bij salons mist persoonlijke aandacht en continuïteit. Zelf doen werkt niet goed bij dingen als kleuren of een complexere coupe. En vriendinnen voelen zich vaak ongemakkelijk met de verantwoordelijkheid.',
    'Het gevoel dat ze gehaast worden, of dat hun haar niet goed bekeken wordt voordat er begonnen wordt. En de constante muziek en gesprekken om hen heen.',
    'Tijd om er in de auto te komen, parkeren, wachten, terug. Een knipbeurt elders kost al gauw een halve middag. Aan huis is dat veel minder.',
    'Ze blijven hun haar zelf knippen of laten het langer dan ze willen. Of ze gaan in en uit bij verschillende salons, nooit echt tevreden.',
  ],
  3: [
    'Het begint met een gesprek bij de eerste afspraak. Ik wil weten wat je gewend bent, wat je niet wilt, en hoe je je haar zelf onderhoudt. Daarna kijk ik samen met je naar wat past.',
    'Met luisteren. En kijken hoe je haar valt zonder dat er gefohnd is. Dat geeft het meest eerlijke beeld.',
    'Eerste boeking via Aimy, ik bevestig per mail. We spreken een tijd af, ik kom naar je toe met al mijn spullen, we beginnen met een gesprek en een kop koffie, en dan beginnen we. Reken op anderhalf tot twee uur voor een knipbeurt, langer voor kleur.',
    'Stap 1: boek via Aimy. Stap 2: krijg bevestiging. Stap 3: ik kom op afgesproken tijd. Stap 4: gesprek + koffie. Stap 5: knippen of behandeling. Stap 6: drogen + stylen. Stap 7: afrekenen via Aimy, ik laat de plek schoon achter.',
    'Ik kom naar je toe. Dat is voor mij niet een gimmick maar de hele basis van mijn werk. Geen rumoer, geen reistijd voor jou, en ik kan in een rustige setting echt aandacht aan je haar geven.',
    'Omdat mensen tijdens een ontspannen gesprek in hun eigen omgeving makkelijker vertellen wat ze willen. Daardoor pak ik vaak iets beter dan in een drukke salon.',
    'Dat ze zich op hun gemak voelen en dat ik echt naar ze luister. Veel klanten zeggen dat ze nog nooit zo rustig hun haar hebben laten doen.',
  ],
  5: [
    // p5q1 — beschrijf klanten
    'Een vaste klant van bijna drie jaar, woont in Utrecht, werkt als zorgmedewerker. Ze houdt van een rustig kort kapsel maar wil wel een nette kleur.',
    // p5q2
    'Via een aanbeveling van een buurvrouw die al klant was.',
    // p5q3
    'Ze ging eerder altijd naar een grote keten in de buurt en was nooit echt blij met het resultaat.',
    // p5q4
    'Het ging meestal te snel, en de kapper wisselde elke keer, dus moest ze elke keer opnieuw uitleggen wat ze wilde.',
    // p5q5
    'Bij mij thuis hebben we de tijd om alles rustig door te nemen. Ze komt nu om de tien weken voor een knipbeurt en om de vier maanden voor een kleurbeurt. Ze is duidelijk meer tevreden.',
    // p5q6
    'Ze blijft komen, dat zegt eigenlijk genoeg.',
    // p5q7 — CRUCIAAL: "nee, geen reviews/quotes" met ÉÉN echte quote
    'Nee, ik heb geen reviews of quotes van klanten verzameld. Eén klant zei wel een keer: Ben echt heel blij met mijn haar, je hebt echt talent. Dat was wel een mooi compliment, maar dat is alles wat ik heb.',
  ],
  6: [
    'Ik heb de kappersopleiding gedaan en daarna een paar jaar in salons gewerkt. Op een gegeven moment werd ik moe van de drukte en het commerciële karakter van de meeste salons en wilde ik het anders aanpakken.',
    'Een eigen klant die vroeg of ik niet bij haar thuis langs wilde komen omdat ze niet meer zo makkelijk de deur uit kon. Dat ging zo goed dat ik me realiseerde dat dit de richting was die ik wilde.',
    'Omdat ik geloof dat een knipbeurt geen ding hoort te zijn waar je je rot voelt of waar je doorheen wilt rennen. Het mag een moment voor jezelf zijn, in alle rust, met iemand die weet wat ze doet.',
    'De gehaaste manier waarop in veel salons gewerkt wordt. En het commerciële karakter ervan, met producten verkopen en abonnementen pushen.',
    'Aandacht en eerlijkheid. Als iets niet kan met je haar omdat de structuur het niet aan kan, zeg ik dat eerlijk. Geen verkoperigheid, gewoon wat werkt voor jou.',
    'Ik werk vooraf gepland, niet last-minute. Ik werk altijd alleen, geen team. En ik werk op afspraak, met genoeg tijd per klant, geen volle agenda.',
  ],
  7: [
    // p7q1
    'Een persoonlijke kapper die mensen écht kennen. Niet een dienst maar een vertrouwd gezicht in hun routine.',
    // p7q2
    'Een gevoel van rust en aandacht. Dat ze weten dat ze elke paar maanden tijd voor zichzelf hebben in hun eigen huis.',
    // p7q3 — CRUCIAAL: "misschien webshop" — moet MOGELIJKHEID blijven
    'Misschien iets met een webshop voor tweedehands kleding en lifestyle producten. Ik ben het aan het onderzoeken maar het is nog lang geen concreet plan. Ik kijk vooral of dat past bij wat ik nu doe, of dat het te ver afligt.',
    // p7q4
    'Niet te groot worden. Geen team, geen tweede vestiging. Wel mijn vaste klantenkring kunnen blijven bedienen en daar de tijd voor blijven nemen.',
    // p7q5
    'Tijd, eerlijkheid, rust. Geen verkoperigheid. Geen pushen voor extra producten of behandelingen.',
    // p7q6
    'Aan de tijd die ik per afspraak inplan. Geen 30 minuten voor een knipbeurt. En aan dat ik nooit iets aanraad wat ik zelf niet zou kiezen.',
  ],
  8: [
    'Hoeveel kost een knipbeurt? Kom je ook in mijn omgeving? Hoe boek ik? Wat als ik moet annuleren? En vaak: kan dat in het weekend?',
    'Meestal via mail of de chat op de website voordat ze boeken.',
    'Of ze de prijs en tijd kunnen aanleggen. En of het echt klikt qua aandacht — sommige mensen vinden het idee van iemand thuis spannend.',
    'Of het wel passend is om mij thuis te ontvangen — of hun huis er "wel goed genoeg voor" is. Wat eigenlijk altijd het geval is, mensen hoeven niet op te ruimen voor mij.',
    'Dat het duurder is dan een salon. Of dat ik alleen voor ouderen werk. Ik werk juist voor alle leeftijden.',
  ],
  10: [
    'Het liefst minimaal twee weken vooruit, mijn agenda zit vaak vol. Voor knipbeurten plan ik 8-10 weken vooraf afspraken in voor mijn vaste klanten.',
    'Vaak nieuwe klanten via een aanbeveling, of mensen die een nieuwe oplossing zoeken nadat een salon hen tegenvalt.',
    'Boeking via Aimy → bevestigingsmail → reminder een dag van tevoren → ik kom op de afgesproken tijd. Bij eerste boeking stuur ik vooraf een mailtje met praktische info.',
    'Boeken via Aimy is het makkelijkste. Bevestiging direct, reminder vooraf, en ik kom langs op de afgesproken tijd. Afrekenen via Aimy direct na de behandeling.',
    'Rust en welkom. Geen idee dat ze moeten "scoren" als klant.',
    'E-mail: rachel@soulstylestudio.nl. Boekingssysteem: via aimy.nl onder Soulstyle Studio. Geen vast telefoonnummer voor klantcontact, mail werkt voor mij beter.',
    'E-mail mag zichtbaar op de website. Geen privé-adres of telefoonnummer.',
    'Soulstyle Studio. Logo heb ik wel, zacht roze en mat zwart op witte achtergrond. Lettertype iets ronds en zachts.',
    'Wat ik op Instagram heb staan kan grotendeels hergebruikt worden.',
    'Privacyverklaring nodig (Aimy gebruikt klantgegevens). Algemene voorwaarden voor annuleringen.',
    'Warm, eerlijk, niet commercieel. Spreek klanten aan met "je", nooit met "u". Geen verkooppraat, geen "wij streven naar"-formuleringen.',
    'Ja, dat klinkt goed.',
    'Nee, ik denk dat we het hebben.',
  ],
};

// p4 — 4 behandelingen met concrete prijzen
const SERVICES = [
  {
    name: 'Knippen',
    answers: [
      'Knippen voor dames en heren. Ik kom met al mijn spullen naar je toe. Inclusief wassen, knippen, drogen. Heren 29,50 euro, dames 32,50 euro. Reken op een uur tot anderhalf uur per behandeling, langer voor lang haar.',
      'Een goede knipbeurt heeft tijd nodig en een eerlijk gesprek. Daarom plan ik nooit minder dan een uur in, ook niet voor een korter haar.',
      'Voor iedereen die liever rust wil rond een knipbeurt dan een drukke salon. Vaak werkende mensen die hun vrije tijd niet aan reistijd kwijt willen zijn.',
      'Een knipbeurt is meestal een rustige avond of middagactiviteit. Mensen kiezen het moment waarop ze er even helemaal voor kunnen gaan zitten.',
      'De wens om een knipbeurt als rustig moment te beleven, niet als afwerklist op een drukke dag.',
      'Een coupe die werkt voor jouw haar en gezicht, in een setting waar je écht hebt kunnen overleggen wat je wilt.',
      'Een persoonlijke knipbeurt aan huis voor 29,50 (heren) of 32,50 (dames) inclusief wassen, knippen, drogen. Reken op een tot anderhalf uur.',
      'De rust. Geen muziek, geen drukte, gewoon een rustige plek aan je eigen keukentafel of in je woonkamer.',
    ],
  },
  {
    name: 'Knippen met kleur',
    answers: [
      'Knippen gecombineerd met kleurbehandeling. Inclusief wassen, kleuren, knippen, drogen. Vanaf 85 euro afhankelijk van de hoeveelheid haar en de behandeling. Reken op twee tot twee en een half uur. Ik gebruik kleuren van een vakmerk met goede ingrediënten.',
      'Een kleurbeurt vraagt extra tijd en aandacht. Je kunt niet in 30 minuten klaar zijn, dus daarom werk ik op basis van een ruim ingeplande afspraak.',
      'Voor mensen die hun haar willen kleuren of bijwerken zonder de drukte van een salon. Vaak mijn vaste knipklanten die toe zijn aan een uitgroei.',
      'Vaak na een periode waarin ze zelf met box-kleuringen hebben geëxperimenteerd en daar niet blij van werden. Of na een mislukte salon-ervaring.',
      'De wens om een kleur op een rustige manier te krijgen, met iemand die de tijd neemt om kleur uit te zoeken die past bij jouw huid en haartype.',
      'Een kleur die past bij jouw natuurlijke uitstraling en die lang mooi blijft. En een ervaring zonder gehaast gevoel.',
      'Een kleur- en knipbehandeling aan huis voor vanaf 85 euro. Reken op twee tot twee en een half uur. Inclusief alle producten en het uitzoeken van de kleur.',
      'Dat ze de behandeling kunnen ondergaan in hun eigen omgeving in plaats van een uur op een stoel in een salon.',
    ],
  },
  {
    name: 'Highlights',
    answers: [
      'Highlights met folie of balayage. Inclusief wassen, hoogtepunten zetten, knippen en stylen. Vanaf 112,50 euro afhankelijk van hoeveelheid foliepakketten. Reken op twee tot drie uur.',
      'Highlights vragen veel tijd en precisie. Ik werk niet onder tijdsdruk hieraan, daarom plan ik ruim.',
      'Voor klanten die natuurlijk lichte accenten in hun haar willen, of die met een complete blonderingsbehandeling bezig zijn.',
      'Vaak voor seizoenswisselingen. Mensen die in het voorjaar hun haar iets lichter willen, of in het najaar weer iets warmer.',
      'De wens naar een rustige aanpak voor iets dat thuis niet zelf te doen is.',
      'Een natuurlijke uitstraling met diepte. Niet de strepen-look van een gehaaste salonbeurt.',
      'Highlights aan huis vanaf 112,50 euro afhankelijk van werk en hoeveelheid. Reken op twee tot drie uur. Inclusief producten en stylen.',
      'De tijd die genomen wordt voor het uitzoeken van de tinten die werken voor jouw haartype.',
    ],
  },
  {
    name: 'Permanent met knippen',
    answers: [
      'Een permanente behandeling inclusief knippen. Rond de 125 euro afhankelijk van hoeveel haar je hebt. Reken op drie tot vier uur. Voor mensen die volume of lichte krul willen.',
      'Een permanent is uitgebreid en heeft veel tijd nodig. Ik plan dit alleen op rustige momenten zodat we niet hoeven te haasten.',
      'Voor mensen met sluik haar die meer volume willen, of voor klanten die ooit een permanent hadden en het terug willen.',
      'Vaak na een lange tijd dezelfde coupe en behoefte aan iets nieuws zonder een drastische verandering.',
      'De wens naar meer beweging en volume zonder elke ochtend met een föhn of krultang bezig te moeten zijn.',
      'Een natuurlijkere golvende coupe die zelfs na een nacht slapen nog beweging heeft.',
      'Een permanent met knipbeurt aan huis voor rond de 125 euro. Reken op drie tot vier uur. Inclusief alle producten en stylen.',
      'De zachtheid. Mensen verwachten vaak een stijve, ouderwetse krul, maar moderne permanents geven juist beweging.',
    ],
  },
];

const META_BLOG_OPTIN_ANSWER = 'Nee, geen blog.';

const GENERIC_FALLBACKS = [
  'Daar denk ik regelmatig over na. Mijn werk draait om aandacht en eerlijkheid. Dat zit niet in een formule maar in hoe ik elke afspraak inplan, met genoeg tijd en zonder volle agenda eromheen.',
  'Dat is een goede vraag, maar wat ik eerder al zei vat het eigenlijk al goed samen. Mijn aanpak is rust, tijd, en eerlijk advies. Boekingen via Aimy, prijzen helder vooraf.',
  'Daar zou ik niet veel meer aan toe willen voegen dan ik al heb verteld. Mijn werk staat voor zich, en mijn klanten weten dat. Eerlijk en zonder commerciële poespas.',
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
      ? 'Ja, ik heb nog een behandeling om te bespreken.'
      : 'Nee, dit zijn alle behandelingen.';
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
  console.log('  Webtekst-assistent — Soulstyle Studio (prompt-fix testcase)');
  console.log(`  API: ${API_URL}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const testEmail = `soulstyle-${Date.now()}@webtekst-test.local`;
  const testPassword = 'TestRun-Pa55word!ABC';
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });
  if (createErr || !created?.user) throw new Error(`createUser failed: ${createErr?.message}`);
  const userId = created.user.id;
  stamp(`✓ User ${userId}`);

  const { data: signed } = await pub.auth.signInWithPassword({ email: testEmail, password: testPassword });
  bearerToken = signed.session!.access_token;

  let cleanupDone = false;
  const cleanup = async () => {
    if (cleanupDone || KEEP) return;
    cleanupDone = true;
    try { await admin.auth.admin.deleteUser(userId); } catch {}
  };
  process.on('SIGINT', () => void cleanup().then(() => process.exit(130)));

  try {
    const { project } = await api<{ project: { id: string } }>(
      'POST', '/api/projects', { name: 'Soulstyle Studio - Test' }
    );
    const projectId = project.id;
    stamp(`✓ Project ${projectId}`);

    let step = await api<InterviewStep>('POST', `/api/projects/${projectId}/interview/start`);

    let turn = 0;
    let lastReportedPart = 0;
    let archetypePrinted = false;
    while (!step.done && step.current_question) {
      const q = step.current_question;
      const answer = chooseAnswer(q.question_id);
      turn++;
      if (q.part > lastReportedPart) {
        console.log(`\n────── DEEL ${q.part} (start) ──────`);
        lastReportedPart = q.part;
      }
      console.log(`  [${String(turn).padStart(3, '0')}] ${q.question_id}\n        Q: ${truncate(q.text, 100)}\n        A: ${truncate(answer, 100)}`);
      step = await api<InterviewStep>('POST', `/api/projects/${projectId}/interview/answer`, {
        question_id: q.question_id,
        question_text: q.text,
        answer_text: answer,
        answer_source: 'typed',
      });
      if (!archetypePrinted && step.progress.archetype) {
        archetypePrinted = true;
        console.log(`\n  ◆ Archetype: ${step.progress.archetype}${step.progress.sub_archetype ? ' + ' + step.progress.sub_archetype : ''}`);
      }
      if (turn > 200) throw new Error('Too many turns');
    }
    stamp(`\n✓ Interview complete in ${turn} turns`);

    stamp('\nGenerating strategy…');
    const stratRes = await api<{ strategy: unknown }>('POST', `/api/projects/${projectId}/strategy/generate`);
    console.log(JSON.stringify(stratRes.strategy, null, 2));

    await api('POST', `/api/projects/${projectId}/strategy/approve`);

    let status = '';
    for (let i = 0; i < 60; i++) {
      await sleep(5000);
      const res = await api<{ project: { status: string } }>('GET', `/api/projects/${projectId}`);
      status = res.project.status;
      stamp(`  status=${status}`);
      if (status === 'review' || status === 'completed') break;
      if (status === 'strategy') throw new Error('content gen failed');
    }

    const pagesRes = await api<{
      pages: Array<{ title: string; slug: string; page_type: string; sections: unknown }>;
    }>('GET', `/api/projects/${projectId}/pages`);
    console.log(`\n═══ ${pagesRes.pages.length} PAGES ═══════════════════════════════\n`);
    for (const p of pagesRes.pages) {
      console.log(`◆ ${p.title} (/${p.slug}) — ${p.page_type}`);
      console.log(JSON.stringify(p.sections, null, 2));
      console.log('─────────────────────────────────────────────────────────\n');
    }

    const { data: usage } = await admin
      .from('claude_usage')
      .select('purpose, cost_usd')
      .eq('project_id', projectId);
    if (usage) {
      let total = 0;
      const by = new Map<string, { c: number; u: number }>();
      for (const u of usage) {
        const c = Number(u.cost_usd ?? 0);
        total += c;
        const cur = by.get(u.purpose) ?? { c: 0, u: 0 };
        cur.c += c; cur.u += 1;
        by.set(u.purpose, cur);
      }
      console.log(`\nUsage: ${usage.length} calls, $${total.toFixed(4)}`);
      for (const [p, agg] of [...by.entries()].sort((a, b) => b[1].c - a[1].c)) {
        console.log(`  ${p.padEnd(28)} ${String(agg.u).padStart(3)}x $${agg.c.toFixed(4)}`);
      }
    }

    stamp('\n✓ DONE.');
    console.log(`Test user: ${testEmail}`);
    console.log(`Project:   ${projectId}`);
    if (!KEEP) await cleanup();
  } catch (err) {
    console.error('\n✗ FAILED:', err instanceof Error ? err.message : err);
    await cleanup();
    process.exit(1);
  }
}

void main();
