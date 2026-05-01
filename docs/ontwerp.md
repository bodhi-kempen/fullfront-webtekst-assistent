# Fullfront Website Teksten App — Definitief Ontwerpdocument
# Versie 1.0 — April 2026

---

## INHOUDSOPGAVE

1. Productconcept
2. User Flow
3. De 6 Archetypes
4. AI Interview Framework
5. Mapping: Antwoorden → Hulpdocument
6. Technische Architectuur
7. Prompt Templates

---

# 1. PRODUCTCONCEPT

## Wat is het?
Een AI-gestuurde web app die ondernemers interviewt via voice en op basis daarvan complete websiteteksten genereert, gestructureerd volgens het bewezen Fullfront hulpdocument "Wervende Teksten >> Website".

## Kernbeslissingen

| Onderdeel | Keuze |
|-----------|-------|
| Gebruiker | Freelancer / ZZP'er (Fullfront leden) |
| Output | Teksten + pagina structuur (blauwdruk) |
| Controle | Maximaal — volledige edit controle |
| Interview | Voice-first, vraag-voor-vraag, met doorvragen |
| Input | Voice primair (Web Speech API), typen als fallback |
| Taal | Nederlands + Engels |
| Projecten | Meerdere websites per account |
| Gebruik | Project-based (terugkomen en aanpassen) |
| Hosting | Supabase (database/auth) + Railway (backend) |
| Account | E-mail + wachtwoord (Supabase Auth) |
| Embedding | Iframe in Fullfront ledenomgeving |
| AI Provider | Anthropic (Claude) |
| Verdienmodel | Gratis (voor nu) |
| Export | Word/PDF + copy-paste per sectie |

---

# 2. USER FLOW

## Overzicht

```
Login / Dashboard
       ↓
Nieuw project starten
       ↓
Fase 1: Persoonlijke vragen (wie ben je, je verhaal)
       ↓
AI bepaalt archetype
       ↓
Fase 2: Bedrijfsinformatie (diensten, USP's, werkwijze)
       ↓
Fase 3: Content-specifiek (tone, pagina's, branding)
       ↓
AI presenteert website strategie
       ↓
Gebruiker past aan en keurt goed
       ↓
AI genereert teksten per pagina/sectie
       ↓
Gebruiker reviewt en bewerkt (volledige controle)
       ↓
Export (Word / PDF / copy-paste)
```

## Geschatte doorlooptijd voor de gebruiker
- Interview: 8-12 minuten
- Strategie reviewen: 1-2 minuten
- Teksten genereren: 1-2 minuten (wachten)
- Review + aanpassen: 5-10 minuten
- **Totaal: 15-25 minuten van niks naar complete website content**

---

# 3. DE 6 ARCHETYPES

AI detecteert automatisch welk archetype past op basis van het interview. Combinaties zijn mogelijk.

## Archetype 1: Service-ZZP
**Branches:** Coach, consultant, trainer, therapeut, psycholoog, accountant, boekhouder, advocaat
**Kenmerk:** Lang beslistraject, know-like-trust funnel, persoonlijk merk centraal
**Tone:** Warm, persoonlijk, "je"-vorm
**CTA's:** "Plan kennismakingsgesprek", "Download e-book", "Doe de quiz"
**Social proof:** Video-testimonials, certificeringen, cijfers, klantverhalen
**Opt-in:** Ja — lead magnet cruciaal

## Archetype 2: Lokale ambacht
**Branches:** Loodgieter, elektricien, CV-monteur, schilder, dakdekker, slotenmaker
**Kenmerk:** Hoge urgentie, direct bellen, lokale vindbaarheid cruciaal
**Tone:** Direct, vakkundig, korte zinnen, "u"-vorm of mix
**CTA's:** "Bel direct: [nummer]", "WhatsApp je probleem", "Spoed? Bel nu"
**Social proof:** Google-reviews, keurmerken, KvK, jaren ervaring
**Opt-in:** Nee — niet relevant

## Archetype 3: Visueel portfolio
**Branches:** Fotograaf, hovenier, interieurdesigner, aannemer (projecten)
**Kenmerk:** Beelden verkopen het werk, stijl en specialisatie cruciaal
**Tone:** Persoonlijk, creatief, "je"-vorm
**CTA's:** "Vraag beschikbaarheid", "Bekijk pakketten", "Plan kennismaking"
**Social proof:** Portfolio = dé social proof + reviews + gepubliceerd werk
**Opt-in:** Optioneel — stijl-PDF of prijslijst

## Archetype 4: Horeca
**Branches:** Restaurant, café, lunchroom, bistro, foodtruck, catering
**Kenmerk:** Sfeer en beleving verkopen, menu + reservering zijn kern
**Tone:** Passievol, sensorisch, sfeervol
**CTA's:** "Reserveer een tafel", "Bekijk menukaart", "Bel ons"
**Social proof:** Tripadvisor/Google reviews, persvermeldingen, Instagram
**Opt-in:** Nee — eventueel cadeaubon of nieuwsbrief

## Archetype 5: Webshop
**Branches:** E-commerce, niche-webshops, productverkoop
**Kenmerk:** Productpagina is koning, vertrouwen via keurmerken
**Tone:** Passend bij merk (premium = rustig, lifestyle = enthousiast)
**CTA's:** "In winkelmand", "Bekijk collectie", "10% korting bij inschrijving"
**Social proof:** Trustpilot/Kiyoh, Thuiswinkel Waarborg, klantfoto's
**Opt-in:** Ja — welkomstkorting voor e-mailinschrijving

## Archetype 6: Boeking-gedreven
**Branches:** Kapper, barbershop, salon, personal trainer, yogastudio, dansschool
**Kenmerk:** Online boeken is standaard, prijslijst prominent, herhaalklanten
**Tone:** Levendig, visueel, informeel, "je"-vorm
**CTA's:** "Boek nu online", "Bel direct", "Cadeaubon kopen"
**Social proof:** Google-reviews, Instagram, before/after, keurmerken
**Opt-in:** Optioneel — welkomstkorting, cadeaubon

## Combinatie-archetypes
Sommige bedrijven passen in twee archetypes:
- Aannemer = Lokale ambacht + Visueel portfolio
- Kapper = Boeking-gedreven + Visueel portfolio
- Personal trainer = Boeking-gedreven + Service-ZZP
- Makelaar = Lokale ambacht + Visueel portfolio

AI combineert de regels van beide archetypes.

---

# 4. AI INTERVIEW FRAMEWORK

## Overzicht

| Fase | Doel | Vragen | Doorvragen |
|------|------|--------|------------|
| 1 | Persoonlijk — wie ben je? | 5 vast | Max 2 per vraag |
| 2 | Bedrijfsinfo — wat doe je? | 6 universeel + 3-4 archetype-specifiek | Max 2 per vraag |
| 3 | Content — hoe moet de site eruitzien? | 6 vast | Max 1 per vraag |
| **Totaal** | | **17-19 vragen** | **~25-35 interacties** |

## Fase 1 — Persoonlijke kennismaking

### Vraag 1: "Vertel eens, wie ben je en wat doe je?"
**Doel:** Naam, bedrijfsnaam, branche, type dienst/product
**Doorvraag als vaag:** "Wat voor mensen precies? En op welke manier help je ze?"
**Doorvraag als te kort:** "Kun je dat iets uitgebreider vertellen?"
**Max doorvragen:** 2

### Vraag 2: "Waarom ben je hiermee begonnen? Wat is je verhaal?"
**Doel:** Motivatie, origin story, persoonlijkheid
**Vult:** Over mij/ons sectie
**Doorvraag als persoonlijk verhaal:** "Wat was het moment dat je dacht: dit ga ik doen?"
**Doorvraag als kort:** "Wat maakt het voor jou persoonlijk zo belangrijk?"
**Doorvraag als keerpunt:** "Hoe heeft dat je veranderd?"
**Let op:** Sterk keerpuntverhaal → Origin Story methode kiezen voor Over mij pagina

### Vraag 3: "Wie zijn je klanten? Beschrijf je ideale klant."
**Doel:** Doelgroep, B2B/B2C, lokaal/landelijk
**Vult:** Hero subtitel, service statement
**Doorvraag als "iedereen":** "Als je aan je beste klant denkt — wie is dat?"
**Doorvraag als breed:** "Wat voor type? Starters, gevestigd? Welke branche?"
**Altijd doorvragen:** "Komen die klanten uit een bepaalde regio?"

### Vraag 4: "Wat is het grootste probleem dat je voor hen oplost?"
**Doel:** Value proposition, pijnpunt
**Vult:** Hero titel, dienst-omschrijvingen
**Doorvraag als abstract:** "Kun je een voorbeeld geven? Waar lopen ze concreet tegenaan?"
**Doorvraag op urgentie:** "Hoe dringend is dat probleem? Komen mensen als het écht mis gaat?"
**Let op:** Urgentie-antwoord helpt archetype bepalen (spoed vs. trust)

### Vraag 5: "Wat verandert er voor klanten nadat ze met jou gewerkt hebben?"
**Doel:** Resultaat, transformatie
**Vult:** Ervaringen sectie, CTA-teksten
**Doorvraag als vaag:** "Kun je een specifiek voorbeeld geven?"
**Doorvraag als concreet:** "Heb je daar ook cijfers of voorbeelden van?"

### Archetype-detectie (na fase 1)

| Signaal | Archetype |
|---------|-----------|
| Coaching, consulting, training, therapie, advies, boekhouding | Service-ZZP |
| Loodgieter, elektricien, schilder, dakdekker, installateur + lokaal | Lokale ambacht |
| Fotograaf, designer, hovenier, interieur + visueel werk | Visueel portfolio |
| Restaurant, café, lunchroom, bistro, catering | Horeca |
| Producten verkopen, webshop, online winkel | Webshop |
| Kapper, salon, PT, yoga, dans + afspraken/boekingen | Boeking-gedreven |

---

## Fase 2 — Bedrijfsinformatie

### Universele vragen (altijd stellen)

### Vraag 6: "Welke diensten of producten bied je aan?"
**Vult:** Producten/Diensten sectie
**Doorvraag als één ding:** "Is dat je enige aanbod, of heb je meerdere diensten?"
**Doorvraag als lange lijst:** "Welke drie zijn het belangrijkst?"
**Altijd doorvragen:** "Kun je per dienst kort zeggen wat iemand ervan mag verwachten?"

### Vraag 7: "Wat maakt jou anders dan anderen die hetzelfde doen?"
**Vult:** USP-blokken, Hero subtitel
**Doorvraag als generiek ("kwaliteit"):** "Stel een klant kan kiezen tussen jou en een concurrent — waarom jou?"
**Doorvraag als goed:** "Is dat iets wat klanten ook teruggeven?"

### Vraag 8: "Hoe ziet het proces eruit als iemand klant bij je wordt?"
**Vult:** Werkwijze-sectie, CTA-keuze
**Doorvraag:** "Wat is de eerste stap? Belt iemand, mailt, boekt online?"
**Doorvraag:** "Hoe lang duurt het traject van start tot afronding?"

### Vraag 9: "Heb je ervaringen, reviews of resultaten die je wilt delen?"
**Vult:** Ervaringen sectie
**Doorvraag als "ja, Google reviews":** "Hoeveel ongeveer? Heb je specifieke quotes?"
**Doorvraag als "nee":** "Kun je een voorbeeld noemen van een klant waar je trots op bent?"
**Doorvraag als "portfolio":** "Hoeveel projecten wil je tonen? Heb je foto's?"

### Vraag 10: "Wat wil je dat bezoekers doen als ze op je website komen?"
**Vult:** CTA's door hele site
**Doorvraag als "contact opnemen":** "Op welke manier? Bellen, mailen, WhatsApp?"
**Doorvraag als "afspraak":** "Gebruik je een online tool of bellen ze?"

### Vraag 11: "Wat zijn je contactgegevens?"
**Vult:** Header, Footer, Contact pagina
**Doorvragen:** telefoon, e-mail, adres, social media
**Altijd:** "Wil je dat je telefoonnummer en e-mail zichtbaar zijn op de website?"

---

### Archetype-specifieke vragen

#### Service-ZZP (coach, consultant, therapeut, accountant)

**S1: "Heb je een specifieke methode of aanpak?"**
- Doorvraag als methodiek: "Ben je daarin gecertificeerd?"
- Doorvraag als eigen methode: "Hoe beschrijf je die in één zin?"

**S2: "Heb je certificeringen, diploma's of lidmaatschappen?"**
- BIG, NOBCO, ICF, NBA, NOAB, etc.
- Doorvraag: "Wil je die op je website tonen?"

**S3: "Heb je een gratis weggever, e-book of checklist?"**
- Doorvraag als ja: "Wat is het? Heb je al een landingspagina?"
- Doorvraag als nee: "Zou je dat willen? Bijv. een checklist waarmee je e-mailadressen verzamelt?"

**S4: "Werk je online, op locatie, of beide?"**
- Doorvraag als beide: "Wat heeft de voorkeur van klanten?"

#### Lokale ambacht (loodgieter, elektricien, schilder)

**L1: "In welke regio of steden ben je actief?"**
- Doorvraag als één stad: "Werk je ook in omliggende plaatsen?"

**L2: "Bied je spoeddiensten aan? Ben je 24/7 bereikbaar?"**
- Doorvraag als ja: "Heb je een apart spoedtarief?"

**L3: "Hoe werken je tarieven?"**
- Doorvraag als vaste prijzen: "Kun je voorbeelden geven?"
- Doorvraag als offerte: "Reken je voorrijkosten?"

**L4: "Heb je keurmerken of certificeringen?"**
- VCA, Techniek Nederland, BouwGarant, etc.

#### Visueel portfolio (fotograaf, hovenier, designer)

**V1: "Heb je een specialisatie of niche?"**
- Doorvraag: "Waar krijg je de meeste aanvragen voor?"

**V2: "Werk je met vaste pakketten en prijzen?"**
- Doorvraag als nee: "Heb je wel een vanaf-prijs?"
- Doorvraag als geen prijzen: "Veel bezoekers haken af zonder prijsindicatie. Wil je een 'vanaf' prijs?"

**V3: "Heb je professionele foto's van je werk?"**
- Doorvraag als ja: "Hoeveel projecten wil je tonen? Minder is vaak meer."
- Doorvraag als nee: "Goede foto's zijn het allerbelangrijkste voor jouw type website."

#### Horeca (restaurant, café, lunchroom)

**H1: "Wat voor keuken of concept heb je?"**
- Doorvraag: "Hebben jullie een chef met een bijzonder verhaal?"

**H2: "Heb je je menukaart digitaal beschikbaar?"**
- Doorvraag als PDF: "We maken er liefst een webpagina van — beter voor mobiel."
- Doorvraag als nee: "Kun je je gerechten noemen met een korte omschrijving?"

**H3: "Gebruik je een reserveringssysteem?"**
- Als ja: "Welk systeem? Die integreren we."
- Als nee: "Online reserveren is standaard — zou je dat willen?"

**H4: "Speciale mogelijkheden? Terras, privé-ruimte, catering?"**

#### Webshop (e-commerce)

**W1: "Hoeveel producten heb je ongeveer?"**
- <20: "Heb je ze ingedeeld in categorieën?"
- >100: "Heb je een productlijst of CSV?"

**W2: "Hoe werken verzending en retouren?"**
- Doorvraag: "Gratis verzending? Vanaf welk bedrag?"

**W3: "Welke betaalmethodes accepteer je?"**

**W4: "Heb je keurmerken? Thuiswinkel Waarborg, Webshop Keurmerk?"**

#### Boeking-gedreven (kapper, PT, yoga, salon)

**B1: "Welke behandelingen/sessies bied je aan met prijzen?"**
- Doorvraag: "Kun je ze indelen in categorieën?"

**B2: "Gebruik je een online boekingssysteem?"**
- Als ja: "Welk? Die integreren we."
- Als nee: "40%+ boekingen gebeurt buiten openingstijden. Zou je dat willen?"

**B3: "Heb je een team of werk je alleen?"**

**B4: "Wat zijn je openingstijden?"**

---

## Fase 3 — Content-specifiek

### Vraag 12: "Hoe wil je overkomen op je website?"
**Vult:** Tone of voice voor alle teksten
**AI geeft voorbeelden per archetype**
**Doorvraag:** "Spreek je klanten aan met 'je' of 'u'?"

### Vraag 13: "Wat moet er als eerste opvallen als iemand je website opent?"
**Vult:** Hero sectie
**Doorvraag:** "Hoe zou je dat in één zin zeggen?"

### Vraag 14: "Welke pagina's wil je op je website?"
**AI stelt voorstel per archetype, gebruiker past aan**
**Doorvraag als blog:** "Ga je regelmatig schrijven?"
**Doorvraag als FAQ:** "Kun je de 5 meest gestelde vragen noemen?"

### Vraag 15: "Heb je al een bedrijfsnaam, logo en huisstijlkleuren?"
**Doorvraag:** "Kun je je logo en kleuren aanleveren?"

### Vraag 16: "Heb je al teksten of content die je wilt hergebruiken?"

### Vraag 17: "Zijn er juridische pagina's die je nodig hebt?"
**AI stelt voor:** Privacyverklaring (altijd), Algemene voorwaarden (bij diensten/webshop)

### Vraag 18: "Is er nog iets dat je kwijt wilt over je bedrijf?"

---

## Interview-samenvatting

| # | Vraag | Fase | Type |
|---|-------|------|------|
| 1 | Wie ben je en wat doe je? | 1 | Altijd |
| 2 | Waarom ben je hiermee begonnen? | 1 | Altijd |
| 3 | Wie zijn je klanten? | 1 | Altijd |
| 4 | Wat is het grootste probleem dat je oplost? | 1 | Altijd |
| 5 | Wat verandert er voor klanten? | 1 | Altijd |
| 6 | Welke diensten/producten bied je aan? | 2 | Altijd |
| 7 | Wat maakt jou anders? | 2 | Altijd |
| 8 | Hoe ziet het klantproces eruit? | 2 | Altijd |
| 9 | Heb je reviews/ervaringen/portfolio? | 2 | Altijd |
| 10 | Wat moeten bezoekers doen op je site? | 2 | Altijd |
| 11 | Contactgegevens? | 2 | Altijd |
| S1-S4 | Service-ZZP specifiek | 2 | Conditioneel |
| L1-L4 | Lokale ambacht specifiek | 2 | Conditioneel |
| V1-V3 | Visueel portfolio specifiek | 2 | Conditioneel |
| H1-H4 | Horeca specifiek | 2 | Conditioneel |
| W1-W4 | Webshop specifiek | 2 | Conditioneel |
| B1-B4 | Boeking-gedreven specifiek | 2 | Conditioneel |
| 12 | Hoe wil je overkomen? (tone) | 3 | Altijd |
| 13 | Wat moet eerst opvallen? (hero) | 3 | Altijd |
| 14 | Welke pagina's? | 3 | Altijd |
| 15 | Logo en huisstijl? | 3 | Altijd |
| 16 | Bestaande content? | 3 | Altijd |
| 17 | Juridische pagina's? | 3 | Altijd |
| 18 | Nog iets toe te voegen? | 3 | Altijd |

**Totaal: 18 vaste vragen + 3-4 archetype-specifiek + doorvragen = ~25-35 interacties**
**Geschatte duur: 8-12 minuten**

---

# 5. MAPPING: ANTWOORDEN → HULPDOCUMENT

## Homepage

| Hulpdocument sectie | Bron-vraag |
|---------------------|------------|
| **Header** | |
| Bedrijfsnaam + logo | V15 |
| Navigatiemenu items | V14 |
| Telefoon, e-mail, social | V11 |
| Header CTA | V10 + archetype-logica |
| **Hero** | |
| Titel (one-liner) | V4 (probleem) + V7 (USP) — AI combineert |
| Subtitel of service statement | V3 (doelgroep) + V4 (probleem) + V5 (resultaat) |
| CTA button | V10 |
| **Over mij/ons sectie** | |
| Samenvatting (120-160 woorden) | V2 (verhaal) + V1 |
| CTA naar Over pagina | Automatisch |
| **Diensten sectie** | |
| Titel per dienst | V6 |
| Subtitel per dienst | V6 doorvraag |
| Omschrijving per dienst | V4 + V5 per dienst |
| CTA per dienst | V10 + archetype |
| CTA naar volledig aanbod | Automatisch |
| **Ervaringen sectie** | |
| Titel + intro | AI genereert |
| Ervaringen/quotes 1-3 | V9 |
| CTA naar Ervaringen pagina | Automatisch |
| **Opt-in sectie** | |
| Titel (killer koptekst) | S3 (lead magnet) — alleen als relevant |
| Subtitel | AI genereert |
| CTA | Archetype-logica |
| **Footer** | |
| Kolom 1: Bedrijfsomschrijving | V1 + V4 + regio |
| Kolom 1: Social media icons | V11 |
| Kolom 2: Navigatiemenu | V14 |
| Kolom 4: NAWTE-gegevens | V11 |
| Copyright | Automatisch |
| Juridische links | V17 |

## Over mij/ons pagina

### Methode-keuze (AI bepaalt automatisch)

| Signaal uit interview | Methode |
|-----------------------|---------|
| Sterk persoonlijk keerpuntverhaal in V2 | Origin Story |
| Zakelijk, geen persoonlijk verhaal | FAQ Methode |
| Meerdere teamleden genoemd | Team Overzicht |
| Combinatie verhaal + team | Origin Story + Team Overzicht |

### Origin Story velden

| Hulpdocument veld | Bron |
|-------------------|------|
| Achtergrond (leven voor keerpunt) | V2 |
| Life changing event | V2 doorvraag |
| Wat werd in gang gezet | V2 doorvraag |
| Obstakels overwonnen | V2 doorvraag |
| Keerpunt/keuze | V2 doorvraag |
| Wat je nu doet | V1 + V6 |

### FAQ Methode velden

| Hulpdocument veld | Bron |
|-------------------|------|
| Why/How/What statement | V2 + V4 + V6 |
| Waarom en wanneer gestart | V2 |
| Expertise/achtergrond | S2 + V2 |
| Persoonlijke achtergrond | V2 |

## Producten/Diensten pagina

| Veld | Bron |
|------|------|
| Titel + intro | V6 + doelgroep |
| Per dienst: titel, subtitel, omschrijving, CTA | V6 + doorvragen |
| Funnel-logica (know/like/trust) | Archetype |

## Ervaringen pagina

| Veld | Bron |
|------|------|
| Titel + intro | AI genereert |
| Ervaringen/reviews 1-3+ | V9 |
| CTA sectie | V10 |

## Contact pagina

| Veld | Bron |
|------|------|
| Titel + intro | AI genereert per archetype |
| Contactgegevens | V11 |
| Formuliervelden | Archetype-logica |
| Bevestigingsbericht | AI genereert |

## Blog pagina

| Veld | Bron |
|------|------|
| Titel + intro | AI genereert |
| Zijbalk: over auteur (45 woorden) | V1 + V2 |

---

# 6. TECHNISCHE ARCHITECTUUR

## Tech Stack

| Onderdeel | Keuze |
|-----------|-------|
| Frontend | React (Vite) of Next.js |
| Backend API | Railway (Node.js of Python) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (e-mail + wachtwoord) |
| Storage | Supabase Storage (logo's, exports) |
| AI | Claude API (Anthropic) |
| Voice | Web Speech API (browser-native, gratis) |
| Export | Server-side Word/PDF generatie |

## Database Schema

### projects
```
id                  UUID (primary key)
user_id             UUID (→ auth.users)
name                TEXT
business_name       TEXT
archetype           TEXT
sub_archetype       TEXT (nullable)
language            TEXT ("nl" | "en")
status              TEXT ("interview" | "strategy" | "generating" | "review" | "completed")
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### interview_answers
```
id                  UUID (primary key)
project_id          UUID (→ projects)
question_id         TEXT ("q1", "q2", "s1", "l1", etc.)
question_text       TEXT
answer_text         TEXT
answer_source       TEXT ("voice" | "typed")
phase               INTEGER (1, 2, 3)
sequence_order      INTEGER
is_followup         BOOLEAN
parent_question_id  TEXT (nullable)
created_at          TIMESTAMP
```

### website_strategy
```
id                  UUID (primary key)
project_id          UUID (→ projects)
website_type        TEXT ("lead_generation" | "authority" | "sales" | "booking")
tone_of_voice       TEXT
addressing          TEXT ("je" | "u" | "mix")
primary_cta         TEXT
suggested_pages     JSONB
archetype_config    JSONB
approved            BOOLEAN
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### pages
```
id                  UUID (primary key)
project_id          UUID (→ projects)
page_type           TEXT ("home" | "over" | "diensten" | "ervaringen" | "contact" | "blog" | "custom")
title               TEXT
slug                TEXT
sort_order          INTEGER
is_active           BOOLEAN
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### sections
```
id                  UUID (primary key)
page_id             UUID (→ pages)
section_type        TEXT ("header" | "hero" | "over_mij" | "diensten" | "ervaringen" | "opt_in" | "cta" | "footer" | "contact_form" | "titel" | "content")
sort_order          INTEGER
is_active           BOOLEAN
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### section_content
```
id                  UUID (primary key)
section_id          UUID (→ sections)
field_name          TEXT ("title" | "subtitle" | "body" | "cta_text" | "cta_url" | etc.)
field_value         TEXT
field_type          TEXT ("text" | "textarea" | "url" | "phone" | "email")
sort_order          INTEGER
version             INTEGER
is_current          BOOLEAN
source              TEXT ("ai_generated" | "user_edited" | "interview_direct")
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### business_info
```
id                  UUID (primary key)
project_id          UUID (→ projects)
business_name       TEXT
owner_name          TEXT
phone               TEXT
email               TEXT
address             TEXT
postal_code         TEXT
city                TEXT
website_url         TEXT
kvk_number          TEXT
service_area        TEXT[]
social_facebook     TEXT
social_instagram    TEXT
social_linkedin     TEXT
social_twitter      TEXT
social_youtube      TEXT
logo_url            TEXT
brand_colors        JSONB
certifications      TEXT[]
opening_hours       JSONB
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

## API Routes

### Projects
```
GET    /api/projects              → Alle projecten van gebruiker
POST   /api/projects              → Nieuw project
GET    /api/projects/:id          → Eén project
PUT    /api/projects/:id          → Project updaten
DELETE /api/projects/:id          → Project verwijderen
```

### Interview
```
POST   /api/projects/:id/interview/start     → Start, geeft eerste vraag
POST   /api/projects/:id/interview/answer     → Antwoord → volgende vraag
GET    /api/projects/:id/interview/status      → Voortgang
POST   /api/projects/:id/interview/complete    → Afsluiten, archetype detectie
```

### Strategy
```
POST   /api/projects/:id/strategy/generate    → AI genereert strategie
GET    /api/projects/:id/strategy              → Strategie ophalen
PUT    /api/projects/:id/strategy              → Aanpassen
POST   /api/projects/:id/strategy/approve      → Goedkeuren
```

### Content
```
POST   /api/projects/:id/generate              → Start tekstgeneratie
POST   /api/projects/:id/generate/:page_id     → Genereer één pagina
GET    /api/projects/:id/pages                  → Alle pagina's + content
GET    /api/projects/:id/pages/:page_id         → Eén pagina + content
```

### Editing
```
PUT    /api/sections/:id/content/:field         → Tekstveld bewerken
POST   /api/sections/:id/regenerate             → Sectie hergenereren
POST   /api/sections/:id/regenerate-with-prompt → Hergenereren met instructie
```

### Export
```
POST   /api/projects/:id/export/word            → Word document
POST   /api/projects/:id/export/pdf             → PDF
GET    /api/projects/:id/export/copy/:page_id   → Platte tekst per pagina
```

## Interview API — Detail

Request:
```json
{
  "question_id": "q3",
  "answer_text": "Ik werk vooral met vrouwen tussen 30-50 met burn-out",
  "answer_source": "voice"
}
```

Response:
```json
{
  "next_question": {
    "question_id": "q3_followup_1",
    "question_text": "Komen die klanten uit een bepaalde regio?",
    "is_followup": true,
    "phase": 1
  },
  "progress": {
    "phase": 1,
    "questions_answered": 3,
    "estimated_remaining": 14,
    "detected_archetype": "service_zzp"
  }
}
```

## Schermen

### Scherm 1: Login/Registratie
- Supabase Auth (e-mail + wachtwoord)
- Na login → Dashboard

### Scherm 2: Dashboard
- Overzicht van alle projecten
- "Nieuw project" knop
- Per project: naam, status, aantal pagina's, laatst bewerkt

### Scherm 3: Interview
- Chat-interface met vraag-antwoord bubbels
- Microfoon-knop (Web Speech API) + tekstveld
- Live speech-to-text preview (gebruiker kan corrigeren)
- Voortgangsbalk (fase + geschatte voortgang)
- Kan pauzeren en later doorgaan

### Scherm 4: Strategie voorstel
- Type website, tone of voice, aanspreekform, primaire CTA
- Checkboxes voor pagina's (aan/uitzetten)
- "Goedkeuren & genereren" knop

### Scherm 5: Generatie (laden)
- Live voortgang per sectie (checkmarks)
- Percentage voortgangsbalk

### Scherm 6: Review & Bewerken
- Links: pagina-navigatie
- Rechts: secties met content
- Per veld: bewerk-knop (inline editing) + hergenereer-knop
- Hergenereer met optionele instructie ("maak korter", "formeler")
- Hele pagina hergenereren

### Scherm 7: Export
- Word document download
- Copy-paste per pagina

---

# 7. PROMPT TEMPLATES

## Prompt 1: Interview AI (System Prompt)

```
Je bent een vriendelijke, professionele website-strateeg die een ondernemer
interviewt om alle informatie te verzamelen voor het schrijven van hun
websiteteksten.

## Jouw gedrag:
- Je stelt één vraag per keer
- Je luistert goed en vraagt door als een antwoord vaag of te kort is
- Je vraagt maximaal 2 keer door per vraag
- Je voelt als een gesprek met een consultant, niet als een formulier
- Je bent warm maar professioneel
- Je geeft korte bevestigingen ("Mooi!", "Goed om te weten") voordat
  je de volgende vraag stelt
- Je spreekt Nederlands tenzij de gebruiker in het Engels antwoordt
- Je noemt NOOIT technische termen als "archetype" of "funnel"

## Het interview heeft 3 fases:

### Fase 1 — Persoonlijk (5 kernvragen)
Doel: Leer wie de ondernemer is. Bepaal intern het bedrijfstype.
Vragen: [zie framework hierboven]

### Fase 2 — Bedrijfsinformatie
Stel de 6 universele vragen + archetype-specifieke vragen.

### Fase 3 — Content-specifiek
Stel de afsluitende vragen.

## Na elke gebruiker-input, geef een JSON response:
{
  "assistant_message": "Mooi verhaal! [volgende vraag]",
  "internal_state": {
    "phase": 1,
    "question_id": "q2",
    "is_followup": false,
    "detected_archetype": null,
    "confidence": 0,
    "questions_remaining": 16,
    "collected_data": { ... }
  }
}
```

## Prompt 2: Strategie AI

```
Je bent een website-strateeg. Je ontvangt interview-resultaten en bepaalt
de optimale website-strategie.

## Wat je bepaalt:

### 1. Website type
- "lead_generation" → aanvragen/leads
- "authority" → expertise tonen
- "sales" → direct verkopen
- "booking" → afspraken/boekingen

### 2. Tone of voice
Concrete beschrijving, bijv: "Warm en persoonlijk, alsof je met een
vriendin praat die toevallig ook expert is."

### 3. Aanspreekform
"je" | "u" | "mix"

### 4. Pagina-structuur
Welke pagina's + welke secties per pagina

### 5. CTA-strategie
Per archetype de juiste CTA's

## Output: JSON met alle elementen
```

## Prompt 3: Hero Sectie

```
Je schrijft de hero sectie voor de homepage.

## Opleveren:

### Titel (max 10 woorden)
Per archetype:
- Service-ZZP: Transformatie/resultaat. "Van burn-out naar balans"
- Lokale ambacht: Dienst + regio. "Loodgieter Amsterdam — 24/7"
- Visueel portfolio: Stijl + specialisatie. "Documentaire bruiloftsfotografie"
- Horeca: Concept + sfeer. "Authentiek Italiaans aan de gracht"
- Webshop: Waardepropositie. "Handgemaakte sieraden met een verhaal"
- Boeking-gedreven: Dienst + actie. "Jouw haar, onze passie"

### Subtitel (max 30 woorden)
Optie A: Verduidelijkende zin
Optie B: Service statement (Service-ZZP):
"Ik help [ideale klant] om [behoefte] zodat zij [resultaat]"

### CTA button (max 5 woorden)

## Regels:
- GEEN "Welkom bij..." of "Wij zijn..."
- Titel moet aandacht PAKKEN
- Bezoeker moet weten: wat doet dit bedrijf? Wat is het voordeel?
```

## Prompt 4: Over Mij/Ons Sectie (Homepage — kort)

```
Je schrijft de korte Over mij/ons sectie op de homepage (120-160 woorden).

## Opleveren:
- Titel (vaak "Over [naam]")
- Inhoud (120-160 woorden): de WHY, vertrouwen, persoonlijke connectie
- CTA: "Meer over [naam]"

## Regels:
- Mensen kopen niet WAT je doet maar WAAROM
- Persoonlijk, niet zakelijk
- GEEN opsommingen — verhalende tekst
```

## Prompt 5: Over Mij/Ons Pagina (Volledig)

```
Je schrijft de volledige Over mij/ons pagina.

## Methode 1: Origin Story
Structuur:
1. Achtergrond — leven/werk voor keerpunt
2. Het moment — life changing event (beeldend beschreven)
3. Daardoor — wat werd in gang gezet
4. Obstakels — uitdagingen overwonnen
5. Keerpunt — het moment van keuze
6. Nu — wat je nu doet, verbonden met verhaal

## Methode 2: FAQ
Beantwoord: Why/How/What, waarom gestart, expertise, achtergrond, hobby's

## Methode 3: Team Overzicht
Per teamlid: naam, functie, specialiteiten, persoonlijke beschrijving

## Regels:
- VERTROUWEN creëren
- De WHY is belangrijker dan de WAT
```

## Prompt 6: Diensten Sectie

```
Je schrijft de producten/diensten sectie.

## Per dienst (max 3 op homepage):
- Titel: naam van dienst/product
- Subtitel (max 15 woorden): concreter wat het is
- Omschrijving (40-60 woorden): verschilt per archetype
  - Service-ZZP: "Herken je dit? ... Na dit traject ..."
  - Lokale ambacht: "Lekkage? Wij zijn binnen 30 min ter plaatse."
  - Visueel portfolio: "Een complete reportage van jullie dag..."
  - Horeca: "Onze chef bereidt elke dag verse pasta..."
  - Boeking-gedreven: Behandeling + resultaat
- CTA per dienst

## Regels:
- Herkenbaarheid creëren bij doelgroep
- OF beeld geven van resultaat
- Samen overtuigen om volgende stap te nemen
```

## Prompt 7: Ervaringen Sectie

```
Je schrijft de ervaringen/reviews/portfolio sectie.

## Opleveren:
- Sectie-titel ("Wat klanten zeggen" / "Ervaringen" / "Projecten")
- Intro (30-50 woorden)
- Per ervaring (3 stuks): titel, subtitel, quote/omschrijving

Per archetype:
- Service-ZZP: Transformatie-quotes
- Lokale ambacht: Korte, krachtige reviews
- Visueel portfolio: Projectbeschrijving
- Horeca: Gastreviews over sfeer en eten
- Boeking-gedreven: Before/after + klantquote

## Regels:
- Echte quotes gebruiken als aangeleverd
- Anders: realistische testimonials genereren
- Met naam en detail = geloofwaardiger
```

## Prompt 8: Opt-in Sectie

```
Je schrijft de opt-in/lead magnet sectie.
ALLEEN genereren als relevant (Service-ZZP of als lead magnet aanwezig).

## Opleveren:
- Titel (killer koptekst) via formule:
  - How-To: "Hoe je [resultaat] zonder [obstakel]"
  - Hoe Zonder: "Hoe [doelgroep] [resultaat] zonder [probleem]"
  - Opsomming: "7 manieren om [resultaat]"
  - Vraag: "Wil jij ook [resultaat]?"
- Subtitel: wat krijgt de bezoeker
- CTA: "Download nu" / "Verkrijg toegang" / "Meld je aan"
```

## Prompt 9: Footer

```
Je schrijft de footer bedrijfsomschrijving (max 30 woorden).

Format:
- "[Bedrijfsnaam] — [wat je doet] in [regio]"
- "Dé [specialist] voor [doelgroep] in [regio]"
```

## Prompt 10: Contact Pagina

```
Je schrijft de teksten voor de contactpagina.

## Opleveren:

### Titel
Per archetype:
- Service-ZZP: "Laten we kennismaken"
- Lokale ambacht: "Direct contact"
- Visueel portfolio: "Neem contact op"
- Horeca: "Contact & Reserveren"
- Webshop: "Klantenservice"
- Boeking-gedreven: "Contact"

### Intro (20-40 woorden)
Kort, uitnodigend. Per archetype verschilt de focus:
- Service-ZZP: Vrijblijvende kennismaking benadrukken
- Lokale ambacht: Snelle responstijd benadrukken
- Horeca: Meerdere contactmogelijkheden bieden

### Trigger-tekst contactformulier
"Stel hier je vraag" / "Stuur ons een bericht"

### Bevestigingsbericht
Standaard + archetype-variatie (bijv. lokale ambacht voegt spoednummer toe)

### Formuliervelden (per archetype)
- Service-ZZP: Naam, e-mail, "Waar kan ik je mee helpen?"
- Lokale ambacht: Naam, telefoon (verplicht), omschrijving, foto upload
- Visueel portfolio: Naam, e-mail, type project, datum, bericht
- Horeca: Naam, e-mail, telefoon, bericht
- Webshop: Naam, e-mail, bestelnummer (optioneel), bericht
- Boeking-gedreven: Naam, telefoon, bericht

## Regels:
- Kort en uitnodigend
- Drempel verlagen
- Lokale ambacht: telefoonnummer PROMINENT
```

## Prompt 11: Blog Pagina

```
Je schrijft de teksten voor de blog overzichtspagina.

## Opleveren:

### Titel
"Blog" / "Kennisbank" / "Inspiratie" / "Inzichten" / "Verhalen"

### Intro (20-30 woorden)
"Een overzicht van artikelen over [onderwerp]"
Of per archetype een creatievere variant.

### Zijbalk: Over de auteur (max 45 woorden)
Korte bio: wie, wat, waarom schrijft diegene hierover.
Voorbeeld: "Sandra de Vries is burn-out coach in Amsterdam.
Met 8 jaar ervaring helpt zij vrouwen naar herstel. Hier deelt
ze tips en inzichten."

## Regels:
- Weinig tekst nodig — blogposts vullen de pagina
- Focus op goede intro en zijbalk
```

---

# EINDE DOCUMENT

Dit document bevat het complete ontwerp voor de Fullfront Website Teksten App:
- Productconcept en alle beslissingen
- User flow van begin tot eind
- 6 archetypes met alle regels
- Compleet interview-framework (18 vragen + doorvragen)
- Mapping van elk antwoord naar het Fullfront hulpdocument
- Technische architectuur (database, API, schermen)
- 11 prompt-templates voor AI tekstgeneratie

Samen met het Fullfront hulpdocument "Wervende Teksten >> Website" (37 pagina's) vormt dit alles wat nodig is om de app te bouwen.
