# Design Brief voor Fullfront Webtekst-assistent

De Webtekst-assistent moet er exact hetzelfde uitzien als de Fullfront Content Engine (https://content-engine.bodhikempen.com/app). Hieronder staan de EXACTE design tokens, CSS rules, en component-specs geëxtraheerd uit de Content Engine. Gebruik deze 1-op-1.

## CSS VARIABLES (kopieer exact naar :root)

```css
:root {
  --bg: #F5F7FA;
  --surface: #FFFFFF;
  --surface2: #EDF0F5;
  --accent: #8BBABB;
  --accent-dim: rgba(139,186,187,0.15);
  --text: #2D3748;
  --text-sec: #8896AA;
  --border: #E2E7EF;
  --danger: #E05C5C;
  --primary: #6C7B95;
  --sidebar-bg: #2D3A4E;
  --sidebar-text: rgba(255,255,255,0.65);
  --sidebar-w: 220px;
  --topbar-h: 60px;
  --radius-card: 12px;
  --radius-btn: 8px;
}
```

## LAYOUT

### Topbar (fixed bovenaan)
```css
.topbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: var(--topbar-h);        /* 60px */
  background: var(--surface);     /* wit */
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 100;
}
```
Inhoud: links logo + app-naam, rechts gebruikersinfo + uitloggen.

### Sidebar (fixed links, onder topbar)
```css
.sidebar {
  position: fixed;
  top: var(--topbar-h);           /* 60px */
  left: 0; bottom: 0;
  width: var(--sidebar-w);        /* 220px */
  background: var(--sidebar-bg);  /* #2D3A4E */
  padding: 16px 0;
  overflow-y: auto;
}
```

### Main content area
```css
.main {
  margin-left: var(--sidebar-w);  /* 220px */
  margin-top: var(--topbar-h);    /* 60px */
  padding: 32px;
  background: var(--bg);          /* #F5F7FA */
  min-height: calc(100vh - var(--topbar-h));
}
```

## NAVIGATIE-ITEMS (sidebar)

```css
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 13.5px;
  color: var(--sidebar-text);     /* rgba(255,255,255,0.65) */
  font-weight: 400;
  transition: 0.15s;
  border-left: 3px solid transparent;
  user-select: none;
}

.nav-item:hover {
  background: rgba(255,255,255,0.07);
  color: #fff;
}

.nav-item.active {
  background: var(--accent-dim);  /* rgba(139,186,187,0.15) */
  color: var(--accent);           /* #8BBABB */
  border-left-color: var(--accent);
  font-weight: 500;
}
```

## TYPOGRAFIE

```
Font:           "Open Sans", sans-serif
Body:           16px, weight 400, color #2D3748
Page title:     24px, weight 700, font-family Roboto (of Open Sans), color #2D3748
Page subtitle:  13px, color var(--text-sec)
Section title:  22px, weight 700
Labels:         12px, weight 500, color var(--text-sec), text-transform uppercase
```

## KNOPPEN

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: var(--radius-btn);  /* 8px */
  border: 1px solid transparent;
  cursor: pointer;
  font-family: "Open Sans", sans-serif;
  font-weight: 600;
  font-size: 13px;
  line-height: 1;
  transition: 0.15s;
  white-space: nowrap;
}

.btn-primary {
  background: var(--accent);     /* #8BBABB */
  color: #fff;
  border-color: var(--accent);
}
.btn-primary:hover {
  filter: brightness(1.08);
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}

.btn-secondary {
  background: transparent;
  color: var(--text);
  border-color: rgba(0,0,0,0.1);
  font-weight: 500;
}
.btn-secondary:hover {
  background: rgba(0,0,0,0.03);
  border-color: rgba(0,0,0,0.15);
}

.btn-danger {
  background: rgba(224,92,92,0.1);
  color: var(--danger);
  border-color: rgba(224,92,92,0.25);
  font-weight: 500;
}
```

## CARDS

```css
.card {
  background: var(--surface);     /* wit */
  border: 1px solid var(--border);  /* #E2E7EF */
  border-radius: var(--radius-card);  /* 12px */
  padding: 40px 48px;             /* ruime padding */
}
```
Geen box-shadow standaard. Hover kan lichte shadow krijgen.

## FORMULIER-ELEMENTEN

```css
input, select {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-btn);  /* 8px */
  padding: 0 14px;
  height: 36px;
  font-size: 14px;
  font-family: "Open Sans", sans-serif;
  color: var(--text);
}

input:focus, select:focus {
  border-color: var(--accent);
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-dim);
}

label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-sec);         /* #8896AA */
  text-transform: uppercase;
  margin-bottom: 4px;
}
```

## PAGE HEADER

```css
.page-header {
  margin-bottom: 28px;
}

.page-title {
  font-weight: 700;
  font-size: 24px;
  color: var(--text);
}

.page-subtitle {
  font-size: 13px;
  margin-top: 4px;
  color: var(--text-sec);
}
```

## BADGES (status indicators)

Content Engine gebruikt geen aparte badge-component voor statussen. Als je status badges nodig hebt (bijv. "Interview loopt", "Review & bewerken"), maak ze dan met:
```css
.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
/* Kleuren per status: */
/* blauw: bg rgba(59,130,246,0.12) color #3B82F6 */
/* oranje: bg rgba(245,158,11,0.12) color #F59E0B */
/* geel+pulse: bg rgba(234,179,8,0.12) color #EAB308 */
/* groen: bg rgba(16,185,129,0.12) color #10B981 */
/* grijs: bg var(--surface2) color var(--text-sec) */
```

## LOGO / BRANDING

In de topbar staat links:
- Fullfront logo (afbeelding, ~30px hoog)
- App-naam: "Content Engine" in 15px, weight 700

Voor de Webtekst-assistent: gebruik hetzelfde logo, maar met "Webtekst-assistent" als app-naam.

De sidebar heeft GEEN logo — alleen navigatie-items.

## SPECIFIEKE COMPONENTEN VOOR DE WEBTEKST-ASSISTENT

### Interview chat-bubbles
Er is geen chat-component in de Content Engine. Maak deze met:
- AI berichten: links, achtergrond var(--surface), border 1px solid var(--border), border-radius 12px, padding 14px 18px
- Gebruiker berichten: rechts, achtergrond var(--accent), color #fff, border-radius 12px
- Geen schaduw op bubbles

### Voortgangsbalk
- Achtergrond: var(--surface2)
- Gevulde deel: var(--accent)
- Hoogte: 6px
- Border-radius: 3px

### Microfoon-knop
- Rond: 44px diameter
- Achtergrond: var(--accent)
- Color: #fff
- Hover: brightness(1.08)
- Active/listening: pulserende ring animatie met var(--accent-dim)

## WAT NIET TE DOEN

- Geen Tailwind CSS — gebruik eigen CSS classes die matchen met Content Engine
- Geen gradients
- Geen ronde "pill" shapes op grote elementen
- Geen box-shadow op cards (alleen op hover als subtiel effect)
- Geen extra fonts — alleen Open Sans (en Roboto voor page-titles als je wilt, maar Open Sans is ook prima)
- Geen dark mode
- Geen emoji in navigatie of knoppen (behalve de microfoon icon)
