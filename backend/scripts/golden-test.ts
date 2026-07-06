/**
 * Golden regression test — property-based, LLM-aware.
 *
 * The content generator is non-deterministic. Two runs on the same interview
 * input will produce different sentences. So this is NOT a byte-diff test.
 * Instead we fire a FIXED interview (the Soulstyle fixture) and assert a
 * catalog of quality invariants against whatever prose comes back. New rule
 * = new function in CHECKS; add + push.
 *
 * Costs ~$1.70 per run in Anthropic tokens. Fine as a pre-merge check;
 * don't run it in a tight loop.
 *
 * Run:
 *   API_URL=https://webtekst.fullfront.nl npx tsx scripts/golden-test.ts
 *
 * Optional:
 *   KEEP=1              Leave the throw-away user + project intact for inspection.
 *   VERBOSE=1           Print per-turn interview progress + full page dump.
 *
 * Exit codes:
 *   0  all HARD checks passed (WARNINGs are informational)
 *   1  one or more HARD checks failed (or the run itself blew up)
 *
 * Env required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
 * (loaded from backend/.env).
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { SOULSTYLE_FIXTURE } from './fixtures/soulstyle-golden.js';

// ---------------------------------------------------------------------------
// Env + clients
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const KEEP = process.env.KEEP === '1';
const VERBOSE = process.env.VERBOSE === '1';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env. Run from backend/ with .env present.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const pub = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Content shape (matches GET /api/projects/:id/pages response)
// ---------------------------------------------------------------------------

interface Field {
  id: string;
  field_name: string;
  field_value: string;
  field_type: string;
  sort_order: number;
  version: number;
}
interface Section {
  id: string;
  section_type: string;
  sort_order: number;
  fields: Field[];
}
interface Page {
  id: string;
  title: string;
  slug: string;
  sections: Section[];
}
interface Content {
  pages: Page[];
}

// ---------------------------------------------------------------------------
// Answer chooser — reads from the fixture
// ---------------------------------------------------------------------------

let fallbackIdx = 0;
function nextFallback(): string {
  const arr = SOULSTYLE_FIXTURE.fallbacks;
  const v = arr[fallbackIdx % arr.length]!;
  fallbackIdx += 1;
  return v;
}

function chooseAnswer(questionId: string): string {
  // Confirm page-list refinements so the interview advances predictably.
  if (/^p10q12_followup_\d+$/.test(questionId)) {
    return 'Ja, dat klinkt goed. Laten we het zo doen.';
  }
  if (questionId.includes('_followup_') || questionId.includes('_extra_')) {
    return nextFallback();
  }
  if (questionId === 'meta_blog_optin') return SOULSTYLE_FIXTURE.metaBlogOptin;

  const moreMatch = questionId.match(/^p4_more_s(\d+)$/);
  if (moreMatch) {
    const sNum = Number(moreMatch[1]);
    return sNum < SOULSTYLE_FIXTURE.services.length
      ? 'Ja, ik heb nog een andere behandeling om te bespreken.'
      : 'Nee, dat waren mijn behandelingen.';
  }

  const sqMatch = questionId.match(/^p4_s(\d+)_q(\d+)$/);
  if (sqMatch) {
    const sIdx = Number(sqMatch[1]) - 1;
    const qIdx = Number(sqMatch[2]) - 1;
    return SOULSTYLE_FIXTURE.services[sIdx]?.answers[qIdx] ?? nextFallback();
  }

  const pqMatch = questionId.match(/^p(\d+)q(\d+)$/);
  if (pqMatch) {
    const part = Number(pqMatch[1]);
    const qIdx = Number(pqMatch[2]) - 1;
    return SOULSTYLE_FIXTURE.answersByPart[part]?.[qIdx] ?? nextFallback();
  }

  return nextFallback();
}

// ---------------------------------------------------------------------------
// HTTP helper (same shape as the other test-full-flow scripts)
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
  };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function runFixture(): Promise<{ userId: string; projectId: string; content: Content }> {
  const testEmail = `golden-${Date.now()}@webtekst-anon.fullfront.nl`;
  const testPw = 'gt-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2);
  const { data: signUp, error } = await pub.auth.signUp({ email: testEmail, password: testPw });
  if (error || !signUp.session) {
    throw new Error(`SignUp failed: ${error?.message ?? 'no session'}`);
  }
  bearerToken = signUp.session.access_token;
  const userId = signUp.user!.id;
  console.log(`  test user: ${testEmail}`);

  const proj = await api<{ project: { id: string } }>('POST', '/api/projects', {
    name: 'Golden Test — Soulstyle',
  });
  const projectId = proj.project.id;
  console.log(`  project:   ${projectId}`);

  console.log('\n  Interview…');
  let step = await api<InterviewStep>('POST', `/api/projects/${projectId}/interview/start`);
  let turn = 0;
  const MAX = 250;
  while (!step.done && step.current_question) {
    turn += 1;
    const q = step.current_question;
    const answer = chooseAnswer(q.question_id);
    if (VERBOSE || turn === 1 || turn % 20 === 0) {
      console.log(`    turn ${turn.toString().padStart(3)} → ${q.question_id}`);
    }
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
    if (turn > MAX) throw new Error(`Aborted: > ${MAX} turns`);
  }
  console.log(`  interview done in ${turn} turns`);

  console.log('\n  Strategy…');
  await api('POST', `/api/projects/${projectId}/strategy/generate`);
  await api('POST', `/api/projects/${projectId}/strategy/approve`);

  console.log('  Content gen, polling every 5s…');
  let status = '';
  for (let i = 0; i < 90; i += 1) {
    await sleep(5000);
    const r = await api<{ project: { status: string } }>('GET', `/api/projects/${projectId}`);
    status = r.project.status;
    if (VERBOSE) console.log(`    poll ${i + 1}: status=${status}`);
    if (status === 'review' || status === 'completed') break;
    if (status === 'strategy') throw new Error('content generation failed (status reverted to "strategy")');
  }
  if (status !== 'review' && status !== 'completed') {
    throw new Error(`content generation timed out (status=${status})`);
  }
  console.log(`  content ready (status=${status})`);

  const content = await api<Content>('GET', `/api/projects/${projectId}/pages`);
  return { userId, projectId, content };
}

// ---------------------------------------------------------------------------
// Content-access helpers
// ---------------------------------------------------------------------------

interface FieldRef {
  page: string;
  section: string;
  field: string;
  sort: number;
  value: string;
}
function allFieldValues(c: Content): FieldRef[] {
  const out: FieldRef[] = [];
  for (const p of c.pages) {
    for (const s of p.sections) {
      for (const f of s.fields) {
        if (typeof f.field_value === 'string') {
          out.push({
            page: p.slug || 'home',
            section: s.section_type,
            field: f.field_name,
            sort: f.sort_order,
            value: f.field_value,
          });
        }
      }
    }
  }
  return out;
}
function stripPlaceholders(text: string): string {
  return text.replace(/\[INVULLEN:[^\]]*\]/gi, '');
}
function sentenceCount(s: string): number {
  const cleaned = s.replace(/\.\.\./g, '…').replace(/\b(bv|bijv|dhr|mw|dr|st|nr)\./gi, '$1');
  return cleaned.split(/[.!?…]+\s+|[.!?…]+$/).filter((x) => x.trim().length > 0).length;
}
function findPageBySlug(c: Content, slugs: string[]): Page | undefined {
  return c.pages.find((p) => slugs.includes(p.slug) || (p.slug === '' && slugs.includes('home')));
}
function homePage(c: Content): Page | undefined {
  return c.pages.find((p) => p.slug === '' || p.slug === 'home');
}
interface FaqPair {
  q: string;
  a: string;
}
function extractFaqItems(page: Page): FaqPair[] {
  const items: FaqPair[] = [];
  for (const s of page.sections) {
    const bySort = new Map<number, Partial<FaqPair>>();
    for (const f of s.fields) {
      if (f.field_name === 'faq_question' || f.field_name === 'question') {
        const cur = bySort.get(f.sort_order) ?? {};
        cur.q = f.field_value;
        bySort.set(f.sort_order, cur);
      } else if (f.field_name === 'faq_answer' || f.field_name === 'answer') {
        const cur = bySort.get(f.sort_order) ?? {};
        cur.a = f.field_value;
        bySort.set(f.sort_order, cur);
      }
    }
    for (const p of bySort.values()) {
      if (p.q && p.a) items.push({ q: p.q, a: p.a });
    }
  }
  return items;
}
function fieldsBySort(section: Section): Map<number, Record<string, string>> {
  const out = new Map<number, Record<string, string>>();
  for (const f of section.fields) {
    if (!out.has(f.sort_order)) out.set(f.sort_order, {});
    out.get(f.sort_order)![f.field_name] = f.field_value;
  }
  return out;
}
function itemQuotesInPage(page: Page): string[] {
  const out: string[] = [];
  for (const s of page.sections) {
    if (s.section_type !== 'ervaringen' && s.section_type !== 'testimonials') continue;
    const byOrder = new Map<number, string>();
    for (const f of s.fields) if (f.field_name === 'item_quote') byOrder.set(f.sort_order, f.field_value);
    for (const k of [...byOrder.keys()].sort((a, b) => a - b)) out.push(byOrder.get(k)!);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Check registry
// ---------------------------------------------------------------------------

type Severity = 'hard' | 'warning';
interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
  severity: Severity;
}
type Check = (c: Content) => CheckResult;

// ---- Fabrication prevention ----

const FORBIDDEN_WORDS = [
  'passie',
  'uniek',
  'jouw partner in',
  'met liefde',
  'vakmanschap en passie',
  'wij streven naar',
];
function checkNoForbiddenWords(c: Content): CheckResult {
  const hits: string[] = [];
  for (const f of allFieldValues(c)) {
    const s = stripPlaceholders(f.value).toLowerCase();
    for (const w of FORBIDDEN_WORDS) {
      const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      if (re.test(s)) hits.push(`"${w}" in ${f.page}/${f.section}/${f.field}`);
    }
    // "dé" needs accented-aware boundary handling — \b treats é as word char.
    if (/(^|[^a-zà-ÿ])dé([^a-zà-ÿ]|$)/i.test(stripPlaceholders(f.value))) {
      hits.push(`"dé" in ${f.page}/${f.section}/${f.field}`);
    }
  }
  return {
    name: 'geen_verboden_woorden',
    passed: hits.length === 0,
    detail: hits.length ? hits.slice(0, 5).join('; ') + (hits.length > 5 ? ` (+${hits.length - 5})` : '') : undefined,
    severity: 'hard',
  };
}

const KNOWN_HALLUCINATED_NAMES = ['Sophie', 'Natasja', 'Eva', 'Marieke', 'Sandra', 'Lisa'];
function checkNameCorrect(c: Content): CheckResult {
  let rachelFound = false;
  const badHits: string[] = [];
  for (const f of allFieldValues(c)) {
    const s = stripPlaceholders(f.value);
    if (/\bRachel\b/.test(s)) rachelFound = true;
    for (const n of KNOWN_HALLUCINATED_NAMES) {
      if (new RegExp(`\\b${n}\\b`).test(s)) badHits.push(`"${n}" in ${f.page}/${f.section}/${f.field}`);
    }
  }
  const problems: string[] = [];
  if (!rachelFound) problems.push('"Rachel" niet gevonden');
  if (badHits.length) problems.push('verzonnen: ' + badHits.slice(0, 5).join('; '));
  return {
    name: 'naam_correct',
    passed: problems.length === 0,
    detail: problems.join(' | ') || undefined,
    severity: 'hard',
  };
}

function checkNoFabricatedFaq(c: Content): CheckResult {
  const problems: string[] = [];
  const faqPage = c.pages.find((p) => p.slug === 'faq');
  const allText = allFieldValues(c).map((f) => f.value).join('\n');
  if (/\b48\s*uur\b/i.test(allText)) {
    problems.push('"48 uur" verschijnt (Rachel noemde 24 uur)');
  }
  if (!faqPage) {
    problems.push('geen FAQ-pagina');
  } else {
    const items = extractFaqItems(faqPage);
    const cancel = items.find((it) => /(annulering|verzetten|annuleren|verzet)/i.test(`${it.q} ${it.a}`));
    if (!cancel) {
      problems.push('geen annulering-FAQ item');
    } else if (!/\b24\s*uur\b/i.test(cancel.a)) {
      problems.push(`annulering-FAQ mist "24 uur": "${cancel.a.slice(0, 100)}…"`);
    }
    const weekend = items.find((it) => /(weekend|avond|beschikbaarheid|dagen|welke tijden|op welke)/i.test(it.q));
    if (!weekend) {
      problems.push('geen weekend/beschikbaarheid-FAQ item');
    } else {
      const a = weekend.a.toLowerCase();
      const trueAnswer = /geen weekend|dinsdag tot en met vrijdag|dinsdag\s+t\/m\s+vrijdag|9\s+(?:en|tot)\s+17/.test(a);
      if (/^\s*dat kan\.?\s*$/i.test(weekend.a.trim())) {
        problems.push('weekend-FAQ is een kale "Dat kan"');
      } else if (!trueAnswer) {
        problems.push(`weekend-FAQ mist echt antwoord: "${weekend.a.slice(0, 120)}…"`);
      }
    }
  }
  return {
    name: 'geen_verzonnen_faq',
    passed: problems.length === 0,
    detail: problems.join(' | ') || undefined,
    severity: 'hard',
  };
}

function checkWebshopNotFact(c: Content): CheckResult {
  const factPatterns: RegExp[] = [
    /\b(onze|mijn|de)\s+webshop\b/i,
    /\bin\s+de\s+shop\b/i,
    /bezoek\s+de\s+shop/i,
    /bekijk\s+onze\s+webshop/i,
    /onze\s+webwinkel/i,
  ];
  const conditionalContext = /(misschien|onderzoek|plan|overweeg|denken over|nog geen|toekomst|binnenkort|ooit|op termijn)/i;
  const problems: string[] = [];
  for (const f of allFieldValues(c)) {
    for (const re of factPatterns) {
      const m = f.value.match(re);
      if (!m || m.index === undefined) continue;
      const ctx = f.value.slice(Math.max(0, m.index - 60), m.index + m[0].length + 60);
      if (!conditionalContext.test(ctx)) {
        problems.push(`${f.page}/${f.section}/${f.field}: "${ctx.trim().slice(0, 120)}"`);
      }
    }
  }
  return {
    name: 'webshop_niet_als_feit',
    passed: problems.length === 0,
    detail: problems.slice(0, 3).join(' | ') || undefined,
    severity: 'hard',
  };
}

// ---- Testimonials ----

function checkRealQuotePresent(c: Content): CheckResult {
  for (const f of allFieldValues(c)) {
    if (f.field !== 'item_quote') continue;
    if (/je hebt echt talent/i.test(f.value)) {
      return { name: 'echte_quote_aanwezig', passed: true, severity: 'hard' };
    }
  }
  return {
    name: 'echte_quote_aanwezig',
    passed: false,
    detail: '"je hebt echt talent" niet in enige item_quote',
    severity: 'hard',
  };
}

function checkNoSynthesizedQuote(c: Content): CheckResult {
  const problems: string[] = [];
  for (const p of c.pages) {
    for (const s of p.sections) {
      if (s.section_type !== 'ervaringen' && s.section_type !== 'testimonials') continue;
      for (const item of fieldsBySort(s).values()) {
        const sub = item.item_subtitle ?? '';
        const q = item.item_quote ?? '';
        if (!/zorgmedewerker/i.test(sub) || !/utrecht/i.test(sub)) continue;
        // CASE A½ target: quote MUST be placeholder, never a first-person synthesized reply.
        if (/\[INVULLEN/i.test(q)) continue;
        const firstPerson = /^\s*"?ik\b/i.test(q.trim());
        problems.push(
          `${p.slug || 'home'}/${s.section_type} sort=? subtitle="${sub}" — quote geen [INVULLEN]${firstPerson ? ' + begint met "Ik"' : ''}: "${q.slice(0, 100)}…"`
        );
      }
    }
  }
  return {
    name: 'geen_gesynthetiseerde_quote',
    passed: problems.length === 0,
    detail: problems.join(' | ') || undefined,
    severity: 'hard',
  };
}

function checkTestimonialsConsistent(c: Content): CheckResult {
  const home = homePage(c);
  const erv = findPageBySlug(c, ['ervaringen', 'reviews']);
  if (!erv) {
    return {
      name: 'testimonials_consistent',
      passed: true,
      detail: 'geen aparte Ervaringen-pagina — check nvt',
      severity: 'hard',
    };
  }
  if (!home) {
    return { name: 'testimonials_consistent', passed: false, detail: 'geen home-pagina', severity: 'hard' };
  }
  const hq = itemQuotesInPage(home);
  const eq = itemQuotesInPage(erv);
  const mismatches: string[] = [];
  for (let i = 0; i < Math.min(2, hq.length, eq.length); i++) {
    if (hq[i] !== eq[i]) mismatches.push(`item ${i}: home="${hq[i]?.slice(0, 60)}…" ≠ erv="${eq[i]?.slice(0, 60)}…"`);
  }
  return {
    name: 'testimonials_consistent',
    passed: mismatches.length === 0,
    detail: mismatches.join(' | ') || undefined,
    severity: 'hard',
  };
}

// ---- Prijzen & compleetheid ----

const EXPECTED_PRICES = ['29,50', '32,50', '85', '112,50', '125'];
function checkPricesPresent(c: Content): CheckResult {
  const all = allFieldValues(c).map((f) => f.value).join('\n');
  const missing = EXPECTED_PRICES.filter((p) => {
    const escaped = p.replace(/,/g, '[,.]');
    // Accept "€29,50", "29,50 euro", "€ 29,50", etc.
    const re = new RegExp(`(€\\s*${escaped}|\\b${escaped}\\s*(?:euro|€))`, 'i');
    return !re.test(all);
  });
  return {
    name: 'prijzen_aanwezig',
    passed: missing.length === 0,
    detail: missing.length ? `ontbreekt: ${missing.join(', ')}` : undefined,
    severity: 'hard',
  };
}

function checkPlaceholdersPresent(c: Content): CheckResult {
  const count = allFieldValues(c).filter((f) => /\[INVULLEN/i.test(f.value)).length;
  return {
    name: 'placeholders_aanwezig',
    passed: count >= 3,
    detail: count < 3 ? `${count} placeholder(s) gevonden, minimaal 3 vereist` : `${count} placeholder(s)`,
    severity: 'hard',
  };
}

function checkSocialPlaceholder(c: Content): CheckResult {
  const home = homePage(c);
  const footer = home?.sections.find((s) => s.section_type === 'footer');
  if (!footer) {
    return { name: 'social_placeholder', passed: false, detail: 'geen footer-sectie', severity: 'hard' };
  }
  const insta = footer.fields.find((f) => f.field_name === 'social_instagram');
  if (!insta) {
    return {
      name: 'social_placeholder',
      passed: false,
      detail: 'social_instagram veld ontbreekt in footer (Rachel noemde Instagram)',
      severity: 'hard',
    };
  }
  const v = insta.field_value;
  const ok = /\[INVULLEN/i.test(v) || /^https?:\/\//i.test(v);
  return {
    name: 'social_placeholder',
    passed: ok,
    detail: ok ? undefined : `social_instagram is geen URL noch [INVULLEN]: "${v}"`,
    severity: 'hard',
  };
}

function checkDeel10Landed(c: Content): CheckResult {
  const problems: string[] = [];
  const faq = c.pages.find((p) => p.slug === 'faq');
  const home = homePage(c);
  const footer = home?.sections.find((s) => s.section_type === 'footer');
  const faqText = faq ? faq.sections.flatMap((s) => s.fields).map((f) => f.field_value).join('\n') : '';
  const footerText = footer ? footer.fields.map((f) => f.field_value).join('\n') : '';

  if (!/utrecht/i.test(faqText) && !/utrecht/i.test(footerText)) {
    problems.push('werkgebied ("Utrecht") niet in FAQ noch footer');
  }
  if (!/dinsdag/i.test(faqText)) {
    problems.push('beschikbaarheid ("dinsdag") niet in FAQ');
  }
  if (!/\b24\s*uur\b/i.test(faqText)) {
    problems.push('annulering ("24 uur") niet in FAQ');
  }
  return {
    name: 'deel10_geland',
    passed: problems.length === 0,
    detail: problems.join(' | ') || undefined,
    severity: 'hard',
  };
}

// ---- Structuur & links ----

function checkUniqueTitles(c: Content): CheckResult {
  interface TitleRef {
    page: string;
    section: string;
  }
  const byTitle = new Map<string, TitleRef[]>();
  for (const p of c.pages) {
    for (const s of p.sections) {
      const t = s.fields.find((f) => f.field_name === 'title')?.field_value;
      if (!t) continue;
      const key = t.trim().toLowerCase();
      if (!byTitle.has(key)) byTitle.set(key, []);
      byTitle.get(key)!.push({ page: p.slug || 'home', section: s.section_type });
    }
  }
  const dupes = [...byTitle.entries()].filter(([, arr]) => new Set(arr.map((r) => r.page)).size > 1);
  return {
    name: 'unieke_titels',
    passed: dupes.length === 0,
    detail: dupes.length
      ? dupes.map(([t, arr]) => `"${t}" → ${arr.map((r) => `${r.page}/${r.section}`).join(', ')}`).join(' | ')
      : undefined,
    severity: 'hard',
  };
}

function checkNoDeadLinks(c: Content): CheckResult {
  const dead: string[] = [];
  for (const p of c.pages) {
    for (const s of p.sections) {
      for (const [order, group] of fieldsBySort(s)) {
        for (const key of Object.keys(group)) {
          if (!key.endsWith('_url')) continue;
          const url = group[key];
          const textKey =
            key === 'cta_url'
              ? 'cta_text'
              : key.endsWith('_cta_url')
                ? key.replace(/_cta_url$/, '_cta')
                : key.replace(/_url$/, '_text');
          const text = group[textKey];
          if (text && (url === '#' || url.trim() === '')) {
            dead.push(`${p.slug || 'home'}/${s.section_type} sort=${order} ${key}="${url}" text="${text}"`);
          }
        }
      }
    }
  }
  return {
    name: 'geen_dode_links',
    passed: dead.length === 0,
    detail: dead.slice(0, 5).join(' | ') || undefined,
    severity: 'hard',
  };
}

const BAN_INFO_CTA_FOR_CONTACT = [
  'bekijk de details',
  'bekijk details',
  'lees verder',
  'meer weten',
  'meer weten?',
  'meer over dit pakket',
  'meer over deze reportage',
  'ontdek de werkwijze',
];
function checkCtaMatchesDestination(c: Content): CheckResult {
  const problems: string[] = [];
  for (const p of c.pages) {
    for (const s of p.sections) {
      for (const [order, group] of fieldsBySort(s)) {
        for (const key of ['cta_text', 'service_cta', 'item_cta']) {
          const text = group[key];
          if (!text) continue;
          const urlKey = key === 'cta_text' ? 'cta_url' : `${key}_url`;
          const url = group[urlKey];
          if (url === '/contact' && BAN_INFO_CTA_FOR_CONTACT.includes(text.toLowerCase().trim())) {
            problems.push(`${p.slug || 'home'}/${s.section_type} sort=${order} ${key}="${text}" → ${url}`);
          }
        }
      }
    }
  }
  return {
    name: 'cta_matcht_bestemming',
    passed: problems.length === 0,
    detail: problems.slice(0, 3).join(' | ') || undefined,
    severity: 'hard',
  };
}

function checkOverPageLength(c: Content): CheckResult {
  const over = c.pages.find((p) => /^over(-|$)/.test(p.slug));
  if (!over) {
    return {
      name: 'over_pagina_lengte',
      passed: true,
      detail: 'geen over-pagina — check nvt',
      severity: 'hard',
    };
  }
  let bodyLen = 0;
  for (const s of over.sections) {
    const body = s.fields.find((f) => f.field_name === 'body')?.field_value;
    if (body) bodyLen = Math.max(bodyLen, body.length);
  }
  if (bodyLen === 0) {
    return { name: 'over_pagina_lengte', passed: false, detail: 'geen body veld', severity: 'hard' };
  }
  return {
    name: 'over_pagina_lengte',
    passed: bodyLen <= 1500,
    detail: bodyLen > 1500 ? `body = ${bodyLen} chars (max 1500)` : `${bodyLen} chars`,
    severity: 'hard',
  };
}

// ---- Warnings ----

function checkSpellingDt(c: Content): CheckResult {
  const suspects: string[] = [];
  for (const f of allFieldValues(c)) {
    const v = f.value;
    if (/\bpland\b/i.test(v)) suspects.push(`"pland" in ${f.page}/${f.section}/${f.field}`);
    if (/\bword\.\s/i.test(v)) suspects.push(`"word." (likely "wordt.") in ${f.page}/${f.section}/${f.field}`);
    if (/\bvind\.\s/i.test(v)) suspects.push(`"vind." (likely "vindt.") in ${f.page}/${f.section}/${f.field}`);
    if (/\bgebeurd\s+er\b/i.test(v)) suspects.push(`"gebeurd er" (likely "gebeurt er") in ${f.page}/${f.section}/${f.field}`);
  }
  return {
    name: 'spelling_dt',
    passed: suspects.length === 0,
    detail: suspects.slice(0, 5).join(' | ') || undefined,
    severity: 'warning',
  };
}

function checkConcreteDetail(c: Content): CheckResult {
  const allText = allFieldValues(c).map((f) => f.value).join('\n').toLowerCase();
  return {
    name: 'concreet_detail',
    passed: /\bkoffie\b/.test(allText),
    detail: /\bkoffie\b/.test(allText) ? undefined : '"koffie" niet in output (Rachel noemde in p3q3)',
    severity: 'warning',
  };
}

function checkTargetGroupsCovered(c: Content): CheckResult {
  const allText = allFieldValues(c).map((f) => f.value).join('\n').toLowerCase();
  const groups: Record<string, RegExp> = {
    ouderen: /(oude(ren)?|senior|niet.*deur.*uit|minder mobiel|slecht ter been|thuisgebonden)/i,
    'kinderen/gezin': /(jonge kinderen|kleine kinderen|gezin|moeders van|ouders met|kroost)/i,
    werkende: /(werk(end|ende)|drukke agenda|zakelijk|carriere|kantoor)/i,
  };
  const found = Object.entries(groups).filter(([, re]) => re.test(allText)).map(([n]) => n);
  return {
    name: 'doelgroepen_gedekt',
    passed: found.length >= 2,
    detail:
      found.length < 2
        ? `${found.length}/3 gedekt (${found.join(', ') || 'geen'})`
        : `${found.length}/3 gedekt (${found.join(', ')})`,
    severity: 'warning',
  };
}

function checkIntroLength(c: Content): CheckResult {
  const problems: string[] = [];
  const home = homePage(c);
  const erv = findPageBySlug(c, ['ervaringen', 'reviews']);

  const homeDienstenIntro = home?.sections.find((s) => s.section_type === 'diensten')?.fields.find(
    (f) => f.field_name === 'intro'
  )?.field_value;
  if (homeDienstenIntro) {
    const sc = sentenceCount(homeDienstenIntro);
    if (sc > 2) problems.push(`Home diensten intro heeft ${sc} zinnen (max 2)`);
  }

  const homeErvIntro = home?.sections.find(
    (s) => s.section_type === 'ervaringen' || s.section_type === 'testimonials'
  )?.fields.find((f) => f.field_name === 'intro')?.field_value;
  if (erv && homeErvIntro) {
    let ervIntro: string | undefined;
    for (const s of erv.sections) {
      const intro = s.fields.find((f) => f.field_name === 'intro')?.field_value;
      if (intro) {
        ervIntro = intro;
        break;
      }
    }
    if (ervIntro && ervIntro.length <= homeErvIntro.length) {
      problems.push(
        `Ervaringen-pagina intro (${ervIntro.length}c) niet langer dan Home (${homeErvIntro.length}c)`
      );
    }
  }
  return {
    name: 'intro_lengte',
    passed: problems.length === 0,
    detail: problems.join(' | ') || undefined,
    severity: 'warning',
  };
}

const CHECKS: Check[] = [
  // Fabrication prevention
  checkNoForbiddenWords,
  checkNameCorrect,
  checkNoFabricatedFaq,
  checkWebshopNotFact,
  // Testimonials
  checkRealQuotePresent,
  checkNoSynthesizedQuote,
  checkTestimonialsConsistent,
  // Prijzen & compleetheid
  checkPricesPresent,
  checkPlaceholdersPresent,
  checkSocialPlaceholder,
  checkDeel10Landed,
  // Structuur & links
  checkUniqueTitles,
  checkNoDeadLinks,
  checkCtaMatchesDestination,
  checkOverPageLength,
  // Warnings
  checkSpellingDt,
  checkConcreteDetail,
  checkTargetGroupsCovered,
  checkIntroLength,
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Golden regression test — Soulstyle Studio fixture');
  console.log(`  API: ${API_URL}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  let userId = '';
  let projectId = '';
  let content: Content;
  try {
    const r = await runFixture();
    userId = r.userId;
    projectId = r.projectId;
    content = r.content;
  } catch (err) {
    console.error('\n✗ RUN FAILED:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log('\n───────────────────────────────────────────────────────────────');
  console.log(`  Running ${CHECKS.length} checks against ${content.pages.length} pages`);
  console.log('───────────────────────────────────────────────────────────────\n');

  const results = CHECKS.map((c) => c(content));
  const hardFails = results.filter((r) => r.severity === 'hard' && !r.passed);
  const hardPass = results.filter((r) => r.severity === 'hard' && r.passed);
  const warnings = results.filter((r) => r.severity === 'warning' && !r.passed);
  const warningPass = results.filter((r) => r.severity === 'warning' && r.passed);

  console.log('  ── HARD CHECKS ──');
  for (const r of results.filter((x) => x.severity === 'hard')) {
    const mark = r.passed ? '✓' : '✗';
    const detail = r.detail ? `  — ${r.detail}` : '';
    console.log(`   ${mark} ${r.name}${detail}`);
  }
  console.log('\n  ── WARNINGS ──');
  for (const r of results.filter((x) => x.severity === 'warning')) {
    const mark = r.passed ? '✓' : '⚠';
    const detail = r.detail ? `  — ${r.detail}` : '';
    console.log(`   ${mark} ${r.name}${detail}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(
    `  HARD:  ${hardPass.length}/${hardPass.length + hardFails.length} geslaagd` +
      (hardFails.length ? `  ✗ ${hardFails.length} FAIL` : '')
  );
  console.log(
    `  WARN:  ${warningPass.length}/${warningPass.length + warnings.length} geslaagd` +
      (warnings.length ? `  ⚠ ${warnings.length} warning` : '')
  );
  console.log(`  time:  ${Math.round((Date.now() - startedAt) / 1000)}s`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (VERBOSE) {
    console.log('\n──── FULL CONTENT DUMP ────');
    console.log(JSON.stringify(content, null, 2));
  }

  console.log('');
  if (KEEP) {
    console.log(`  KEEP=1 — leaving test user + project intact.`);
    console.log(`  user id:    ${userId}`);
    console.log(`  project id: ${projectId}`);
  } else if (userId) {
    try {
      await admin.auth.admin.deleteUser(userId);
      console.log(`  Cleaned up test user ${userId} (cascade deletes project).`);
    } catch (err) {
      console.warn(`  ⚠ cleanup failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  process.exit(hardFails.length > 0 ? 1 : 0);
}

void main();
