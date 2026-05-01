import { callTool } from '../lib/anthropic.js';
import type { Archetype } from '../data/questions.js';
import type { ParsedBusinessInfo } from './content-ai.js';

// ---------------------------------------------------------------------------
// Parses unstructured interview answers (Q11 contact, Q15 branding, Q17 legal,
// archetype-specific cert questions) into structured business_info fields
// used by the footer and contact page.
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `
Je krijgt antwoorden uit een interview met een ondernemer. Haal alle
zakelijke contact-, social- en juridische gegevens eruit en lever ze in
gestructureerd JSON via de extract-tool.

## ABSOLUTE REGEL — gebruik null voor onbekend
Als een veld niet expliciet genoemd is in de interview-antwoorden, return
EXACT \`null\`. Verzin niets. Gebruik NOOIT placeholders zoals "<UNKNOWN>",
"unknown", "n.v.t.", lege strings of dummy waarden. Een leeg veld is null.
Een leeg array is [].

## Regels per veld
- Telefoonnummer in standaard NL-format: "+31 20 1234567" of
  "020 1234567". Behoud het format dat de ondernemer gebruikte als dat
  er logisch uitziet.
- E-mail: lowercase.
- Social media als VOLLEDIGE URL ("https://www.instagram.com/handle"). Als
  alleen handle gegeven is, bouw dan de URL.
- Adres in één regel als string.
- legal_pages_needed: kies uit "privacy", "terms", "cookies".
  Privacyverklaring is altijd nodig (privacy moet er altijd in zitten).
  Terms = Algemene Voorwaarden, alleen bij dienstverlening of webshop.
  Cookies = alleen als de gebruiker dat noemde of als hij analytics zal gebruiken.
- opening_hours als één compacte string of null.
- business_name: haal uit de bedrijfsnaam-vraag of de openingszin van het
  interview. Voorbeeld: "Ik ben Eva van den Berg, bruidsfotograaf" → business_name
  zou logisch "Eva Fotografie" of vergelijkbaar zijn als die genoemd is, anders null.
- owner_name: de naam van de persoon zelf, uit "Ik ben [naam]..."-uitspraken.
`.trim();

const EXTRACT_TOOL = {
  name: 'extract',
  description: 'Haal de zakelijke gegevens uit de interview-antwoorden.',
  input_schema: {
    type: 'object' as const,
    properties: {
      business_name: { type: ['string', 'null'] },
      owner_name: { type: ['string', 'null'] },
      phone: { type: ['string', 'null'] },
      email: { type: ['string', 'null'] },
      address: { type: ['string', 'null'] },
      postal_code: { type: ['string', 'null'] },
      city: { type: ['string', 'null'] },
      kvk_number: { type: ['string', 'null'] },
      service_area: { type: 'array', items: { type: 'string' } },
      social_facebook: { type: ['string', 'null'] },
      social_instagram: { type: ['string', 'null'] },
      social_linkedin: { type: ['string', 'null'] },
      social_twitter: { type: ['string', 'null'] },
      social_youtube: { type: ['string', 'null'] },
      certifications: { type: 'array', items: { type: 'string' } },
      opening_hours: { type: ['string', 'null'] },
      legal_pages_needed: {
        type: 'array',
        items: { type: 'string', enum: ['privacy', 'terms', 'cookies'] },
      },
    },
    required: [
      'business_name',
      'owner_name',
      'phone',
      'email',
      'address',
      'postal_code',
      'city',
      'kvk_number',
      'service_area',
      'social_facebook',
      'social_instagram',
      'social_linkedin',
      'social_twitter',
      'social_youtube',
      'certifications',
      'opening_hours',
      'legal_pages_needed',
    ],
    additionalProperties: false,
  },
};

export async function parseBusinessInfo(input: {
  archetype: Archetype;
  business_name: string | null;
  /** Concatenated answer text per question_id. */
  answers: Map<string, string>;
}): Promise<ParsedBusinessInfo> {
  const pick = (...ids: string[]) =>
    ids
      .map((id) => {
        const v = input.answers.get(id);
        return v ? `[${id}] ${v}` : '';
      })
      .filter(Boolean)
      .join('\n\n');

  const userMessage = `
## Bekend bedrijfsnaam (al ingevuld door gebruiker, soms null)
${input.business_name ?? '(nog niet bekend, haal uit interview indien mogelijk)'}

## Antwoorden uit het interview (v2 IDs)

${pick(
  'p1q1',   // wie ben je en wat doe je (naam + branche)
  'p10q6',  // contactgegevens (telefoon, e-mail, adres, social)
  'p10q7',  // zichtbaarheid telefoon/email
  'p10q8',  // bedrijfsnaam, logo, huisstijlkleuren
  'p10q9',  // bestaande content
  'p10q10', // juridische pagina's
  'p7q5',   // waarden (soms certificeringen / lidmaatschappen genoemd)
  'p3q3'    // werkproces (soms openingstijden / locatie)
)}

Haal nu via de extract-tool alle gegevens eruit. Zet alles dat NIET genoemd
is op null — niet op "<UNKNOWN>" of een andere placeholder.
`.trim();

  const result = await callTool<ParsedBusinessInfo>({
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
    tool: EXTRACT_TOOL,
    maxTokens: 1024,
  });

  // Always ensure privacy is in the legal list.
  if (!result.legal_pages_needed.includes('privacy')) {
    result.legal_pages_needed.unshift('privacy');
  }

  return result;
}
