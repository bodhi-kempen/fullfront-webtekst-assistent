/**
 * Isolated unit test for the dt-spelling regex patterns in checkSpellingDt.
 * No network calls, no Supabase — just regex vs. strings.
 *
 * Run:
 *   cd backend && npx tsx scripts/test-dt-regex.ts
 */

// ── Exact copy from checkSpellingDt ────────────────────────────────────────

const DT_VERB_STEMS = [
  'luister', 'plan', 'vind', 'antwoord', 'help', 'werk', 'maak', 'zorg',
  'bied', 'denk', 'voel', 'zoek', 'kies', 'regel', 'stuur', 'lever',
  'begeleid', 'adviseer', 'bel', 'mail', 'geef', 'neem', 'leg', 'schrijf',
  'lees', 'bespreek', 'betaal', 'behandel', 'ondersteun', 'ontvang',
  'begrijp', 'kijk', 'blijf', 'verdien', 'volg', 'vraag', 'hoor', 'boek',
  'gebruik', 'koop', 'vertel', 'beantwoord', 'overleg', 'reken', 'breng',
  'knip', 'verander', 'begin', 'word',
];
const SUBJ3 = '(?:hij|zij|ze|iemand\\s+die|iedereen\\s+die|wie)';
const ADV   = '(?:\\s+(?:ook|dan|nu|al|zelfs|gewoon|altijd|soms|vaak|nog|direct|meteen|echt|heel|erg|wel|zeker|eigenlijk|juist|hier)){0,2}';

function dtHit(text: string): string | null {
  for (const stem of DT_VERB_STEMS) {
    // Pattern A: hij/zij/ze/... + [adv] + stem (missing -t)
    if (new RegExp(`\\b${SUBJ3}${ADV}\\s+${stem}(?!t|\\w)`, 'i').test(text)) {
      return `A: "${stem}" mist -t na hij/zij`;
    }
    // Pattern B: ik + [adv] + stem + t (wrongly-added -t)
    if (new RegExp(`\\bik${ADV}\\s+${stem}t(?!\\w)`, 'i').test(text)) {
      return `B: "ik ${stem}t" (moet zonder -t)`;
    }
  }
  if (/\bpland\b/i.test(text))          return 'legacy: "pland"';
  if (/\bgebeurd\s+er\b/i.test(text))   return 'legacy: "gebeurd er"';
  return null;
}

// ── Test cases ──────────────────────────────────────────────────────────────

interface Case {
  text: string;
  shouldMatch: boolean;
}

const MUST_MATCH: Case[] = [
  { text: 'iemand die echt luister naar wat je wilt', shouldMatch: true },
  { text: 'iemand die luister naar je',               shouldMatch: true },
  { text: 'hij plan alles tot in detail',             shouldMatch: true },
  { text: 'wie hier werk weet dat',                   shouldMatch: true },
  { text: 'ik vindt het belangrijk',                  shouldMatch: true },
  { text: 'ik wordt er blij van',                     shouldMatch: true },
];

const MUST_NOT_MATCH: Case[] = [
  { text: 'iemand die echt luistert naar je',         shouldMatch: false },
  { text: 'die dag was bijzonder',                    shouldMatch: false },
  { text: 'die klant kwam terug',                     shouldMatch: false },
  { text: 'die ook',                                  shouldMatch: false },
  { text: 'ik vind het belangrijk',                   shouldMatch: false },
  { text: 'de plannen die er liggen',                 shouldMatch: false },
];

// ── Runner ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function run(cases: Case[]): void {
  for (const { text, shouldMatch } of cases) {
    const hit = dtHit(text);
    const matched = hit !== null;
    const ok = matched === shouldMatch;
    const mark = ok ? '✓' : '✗';
    const reason = hit ?? '(geen match)';
    const expectLabel = shouldMatch ? 'MATCH verwacht' : 'geen match verwacht';
    console.log(`  ${mark}  ${expectLabel.padEnd(20)}  "${text}"`);
    if (!ok) console.log(`       → ${matched ? `onverwacht: ${reason}` : 'gemist — geen patroon greep aan'}`);
    else if (matched) console.log(`       → ${reason}`);
    ok ? passed++ : failed++;
  }
}

console.log('\n── MOET matchen (dt-fout) ────────────────────────────────────────────');
run(MUST_MATCH);

console.log('\n── MAG NIET matchen (correct) ────────────────────────────────────────');
run(MUST_NOT_MATCH);

console.log(`\n${'─'.repeat(70)}`);
console.log(`  ${passed}/${passed + failed} geslaagd${failed > 0 ? `  ✗ ${failed} FAIL` : '  ✓ alles goed'}`);
console.log('');

process.exit(failed > 0 ? 1 : 0);
