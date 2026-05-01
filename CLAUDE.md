# Fullfront Website Teksten App

## Project Overview
AI-gestuurde web app die ondernemers interviewt via voice en op basis daarvan complete websiteteksten genereert. De teksten volgen de bewezen structuur uit het Fullfront hulpdocument "Wervende Teksten >> Website" (37 pagina's). De app draait als iframe in de Fullfront ledenomgeving.

## Tech Stack
- **Frontend:** React (Vite)
- **Backend:** Node.js (Railway)
- **Database + Auth:** Supabase (PostgreSQL + Supabase Auth)
- **Storage:** Supabase Storage (logo's, exports)
- **AI:** Claude API (Anthropic) — model: claude-sonnet-4-20250514
- **Voice:** Web Speech API (browser-native, gratis) + typen als fallback
- **Export:** Server-side Word (.docx) en PDF generatie

## Architecture
```
Frontend (React/Vite)
    ↓ HTTPS
Backend API (Node.js / Railway)
    ↓ Claude API (interview + tekstgeneratie)
    ↓ PostgreSQL
Supabase (Auth + Database + Storage)
```

## Core Concept
De app heeft 6 "archetypes" die bepalen welke vragen gesteld worden, welke tone of voice gebruikt wordt, welke CTA's gekozen worden, en welk type social proof benadrukt wordt:

1. **Service-ZZP** — coach, consultant, therapeut, accountant
2. **Lokale ambacht** — loodgieter, elektricien, schilder, dakdekker
3. **Visueel portfolio** — fotograaf, hovenier, designer
4. **Horeca** — restaurant, café, lunchroom
5. **Webshop** — e-commerce, productverkoop
6. **Boeking-gedreven** — kapper, PT, yogastudio, salon

Combinaties zijn mogelijk (bijv. aannemer = lokale ambacht + visueel portfolio).

## User Flow
```
Login → Dashboard (projecten) → Nieuw project →
Interview (3 fases, voice-first) → AI detecteert archetype →
Strategie voorstel → Gebruiker keurt goed →
AI genereert teksten per pagina/sectie →
Review & bewerken (volledige edit controle) →
Export (Word/PDF/copy-paste)
```

## Interview Structure
- **Fase 1 (5 vragen):** Persoonlijk — wie ben je, je verhaal, je klanten, hun probleem, het resultaat
- **Fase 2 (6 universeel + 3-4 archetype-specifiek):** Diensten, USP's, werkwijze, reviews, contactgegevens
- **Fase 3 (6 vragen):** Tone of voice, hero-focus, gewenste pagina's, branding, juridisch
- **Totaal:** ~18 vragen + doorvragen = 25-35 interacties, 8-12 minuten

## Database Tables
- `projects` — website projecten per gebruiker
- `interview_answers` — alle antwoorden uit het interview
- `website_strategy` — AI-bepaalde strategie (type, tone, pagina's)
- `pages` — pagina's van de website
- `sections` — secties binnen pagina's (hero, diensten, ervaringen, etc.)
- `section_content` — gegenereerde teksten per veld, met versioning
- `business_info` — gestructureerde bedrijfsinformatie

## Key Design Decisions
- Voice input via Web Speech API (gratis, browser-native, Nederlands ondersteund)
- AI vraagt door (max 2x per vraag) als antwoord vaag is
- Archetype wordt automatisch gedetecteerd, niet aan gebruiker getoond
- Teksten volgen EXACT de secties uit het Fullfront hulpdocument
- Gebruiker heeft volledige edit controle (inline bewerken + hergenereren met prompt)
- Meerdere projecten per account
- Project-based: gebruiker kan later terugkomen en aanpassen
- GEEN SEO-functionaliteit — aparte tool beschikbaar

## Important Files
- `docs/ontwerp.md` — compleet ontwerpdocument met alle details
- `docs/hulpdocument.pdf` — Fullfront hulpdocument "Wervende Teksten >> Website"
- `docs/prompts/` — alle prompt-templates voor Claude AI

## Output Structure (per Fullfront hulpdocument)
De app genereert teksten voor deze pagina's en secties:

**Homepage:** Header → Hero (titel, subtitel, CTA) → Over mij/ons (120-160 woorden) → Diensten (max 3, elk met titel, subtitel, omschrijving, CTA) → Ervaringen (3 testimonials) → Opt-in (alleen als relevant) → Footer

**Over mij/ons:** Titel sectie → Body (Origin Story / FAQ Methode / Team Overzicht) → CTA

**Producten/Diensten:** Titel sectie → Per dienst: titel, subtitel, omschrijving, CTA

**Ervaringen:** Titel + intro → Per ervaring: titel, subtitel, quote, CTA

**Contact:** Titel + intro → Contactgegevens → Contactformulier → Bevestigingsbericht

**Blog:** Titel + intro → Zijbalk auteur-bio (45 woorden)

## Prompt Templates
Er zijn 11 prompt-templates ingebouwd (zie docs/ontwerp.md sectie 7):
1. Interview AI (system prompt voor het gesprek)
2. Strategie AI (archetype + tone + pagina-keuze)
3. Hero sectie
4. Over mij/ons (homepage kort, 120-160 woorden)
5. Over mij/ons (volledige pagina — Origin Story / FAQ / Team)
6. Diensten sectie
7. Ervaringen sectie
8. Opt-in sectie
9. Footer bedrijfsomschrijving
10. Contact pagina
11. Blog pagina

## Conventions
- Alle UI-teksten in het Nederlands (tenzij gebruiker Engels kiest)
- Aanspreekform in UI: "je" (informeel, past bij Fullfront doelgroep)
- Datumformat: DD-MM-YYYY
- Taal van code/comments: Engels
- Component naamgeving: PascalCase (React)
- API routes: kebab-case (/api/projects/:id/interview/start)
