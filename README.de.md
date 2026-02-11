# GrandCafe Cheers Platform

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL_1.1-blue.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_17-3FCF8E?logo=supabase)](https://supabase.com)

[EN](README.md) | [NL](README.nl.md) | [ES](README.es.md) | **[DE]**

---

Eine Full-Stack-PWA-Managementplattform zum Betrieb eines saisonalen Strandrestaurants. Entwickelt fuer **Cheers Mallorca** in El Arenal und deckt alle Aspekte des taeglichen Betriebs ab -- von der Personalplanung bis hin zur KI-gestuetzten Business Intelligence.

## Funktionen

### Betrieb
- **Personalverwaltung** -- Dienstplanung, Schichtvorlagen, Ein-/Ausstempeln, Verfuegbarkeit, Tauschgesuche
- **Speisekartenverwaltung** -- Mehrsprachige Artikel (EN/NL/ES/DE), 14 EU-Allergene, Wareneinsatzkalkulation, Tagesangebote
- **Kuechenanzeigesystem** -- Echtzeit-Bestellungsfluss fuer Kuechen- und Barstationen
- **Inventar & Lager** -- Bestandsverfolgung, Niedrigbestandswarnungen, Warenbewegungen, Lieferantenverwaltung, Craft-Beer-Verfolgung
- **POS & Umsatz** -- Taegliche Umsatzerfassung, Umsatzaufschluesselung, Trinkgelderfassung, Kassenabschluss

### Gaesteerlebnis
- **Reservierungen** -- Interaktiver Raumplaneditor, Online-Buchungsformular, Warteliste, automatische Bestaetigungen
- **Digitale Speisekarte** -- Oeffentlich zugaengliche Speisekarte mit QR-Code-Zugang
- **Veranstaltungen & Unterhaltung** -- Veranstaltungskalender, DJ-Datenbank, Ausruestungschecklisten
- **CRM** -- Kundendatenbank, Bewertungsaggregation, Stimmungsanalyse, Treueprogramm

### Business Intelligence
- **Finanzberichte** -- Taegliche GuV, Kostenquoten (Speisen/Getraenke/Personal), Soll-Ist-Vergleich, steuerfertige Exporte
- **Marketing** -- Inhaltskalender, Social-Media-Veroeffentlichung (Instagram/Facebook), Newsletter-Baukasten
- **KI-Assistent** -- Claude-gestuetzter Chat mit 43 Tools, rollenbasierter Zugriff, Sub-Agent-Delegation, Streaming-Antworten

### KI-Assistent Highlights
- 43 integrierte Tools (26 Lese-, 17 Schreibzugriffe) mit rollenbasierter Zugriffskontrolle
- Intelligentes Modell-Routing (Haiku fuer Betrieb, Sonnet fuer Analysen)
- 9 spezialisierte Sub-Agents (Finanzberichterstatter, Dienstplanoptimierer, Compliance-Pruefer usw.)
- Schreiboperationen erfordern eine explizite Benutzerbestaetigung (ausstehende Aktionen mit 5-Minuten-TTL)
- 4-Punkt-Prompt-Caching-Strategie zur Kostenoptimierung
- Dynamische Kontexteinspeisung basierend auf Konversationsschluesselbegriffen
- SSE-Streaming mit 11 Ereignistypen

## Technologie-Stack

| Schicht | Technologie |
|---------|-------------|
| Framework | Next.js 16 (App Router) |
| Sprache | TypeScript 5.9 (strict mode) |
| UI | React 19 + Tailwind CSS 3.3 + shadcn/ui + Radix |
| Datenbank | Supabase (PostgreSQL 17, RLS, Auth) |
| KI | Anthropic SDK 0.24.0 (Claude API) |
| E-Mail | Resend |
| Soziale Medien | Meta Graph API |
| Diagramme | Recharts |
| Tabellen | TanStack Table |
| Formulare | React Hook Form + Zod |
| Exporte | ExcelJS + pdfkit |
| i18n | next-intl (EN, NL, ES, DE) |
| Tests | Vitest + Playwright |
| Hosting | Vercel |
| Paketmanager | pnpm |

## Schnellstart

### Voraussetzungen

- Node.js 20+
- pnpm 8+
- Supabase-Projekt (kostenlose Stufe genuegt)
- Anthropic API-Schluessel

### Installation

```bash
# Repository klonen
git clone https://github.com/lroy-stack/cheers-me.git
cd cheers-me

# Abhaengigkeiten installieren
pnpm install

# Umgebungsvariablen einrichten
cp .env.example .env.local
# .env.local mit Ihren Werten bearbeiten

# Entwicklungsserver starten
pnpm run dev
```

Oeffnen Sie [http://localhost:3000](http://localhost:3000) in Ihrem Browser.

### Datenbank-Einrichtung

```bash
# Migrationen auf Ihr Supabase-Projekt uebertragen
pnpm run db:migrate

# Mit Beispieldaten befuellen (optional)
pnpm run db:seed

# TypeScript-Typen aus dem Schema generieren
pnpm run db:types
```

## Umgebungsvariablen

| Variable | Erforderlich | Beschreibung |
|----------|--------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Ja | Ihre Supabase-Projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ja | Oeffentlicher Supabase-Schluessel |
| `SUPABASE_SERVICE_ROLE_KEY` | Ja | Supabase-Service-Role-Schluessel (nur serverseitig) |
| `ANTHROPIC_API_KEY` | Ja | Anthropic-API-Schluessel fuer Claude |
| `NEXT_PUBLIC_APP_URL` | Ja | Oeffentliche App-URL |
| `TIMEZONE` | Ja | Server-Zeitzone (Standard: `Europe/Madrid`) |
| `DEFAULT_LOCALE` | Ja | Standardsprache (Standard: `en`) |
| `RESEND_API_KEY` | Nein | Resend-API-Schluessel fuer E-Mail |
| `EMAIL_FROM` | Nein | Absender-E-Mail-Adresse |
| `META_ACCESS_TOKEN` | Nein | Meta Graph API-Token |
| `META_PAGE_ID` | Nein | Facebook-Seiten-ID |
| `META_IG_USER_ID` | Nein | Instagram-Benutzer-ID |
| `GEMINI_API_KEY` | Nein | Google Gemini-API-Schluessel fuer Bildgenerierung |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Nein | Oeffentlicher VAPID-Schluessel fuer Push-Benachrichtigungen |
| `VAPID_PRIVATE_KEY` | Nein | Privater VAPID-Schluessel fuer Push-Benachrichtigungen |

Siehe `.env.example` fuer Format und Platzhalterwerte.

## Projektstruktur

```
src/
├── app/                    # Next.js App Router (Seiten + API-Routen)
│   ├── api/                # API-Endpunkte pro Modul
│   ├── staff/              # Personalplanung & -verwaltung
│   ├── menu/               # Speisekarten-Baukasten & KDS
│   ├── stock/              # Bestandsverwaltung
│   ├── sales/              # POS & Umsatzverfolgung
│   ├── reservations/       # Tischreservierungen & Raumplan
│   ├── events/             # Veranstaltungen & Unterhaltung
│   ├── marketing/          # Inhalte & soziale Medien
│   ├── finance/            # Finanzberichte
│   └── customers/          # CRM & Treueprogramm
├── components/             # React-Komponenten nach Modul
│   ├── ui/                 # shadcn/ui-Grundelemente
│   ├── ai/                 # KI-Chat-Oberflaeche
│   └── providers/          # Auth-, SWR-, Theme-Provider
├── lib/
│   ├── ai/                 # KI-Assistent-Kern
│   │   ├── sub-agents/     # 9 spezialisierte Agents
│   │   ├── claude.ts       # Anthropic-Client + Caching
│   │   ├── tools.ts        # 26 Lese-Tools
│   │   ├── write-tools.ts  # 17 Schreib-Tools
│   │   └── model-router.ts # Haiku/Sonnet-Routing
│   ├── supabase/           # Datenbank-Client-Einrichtung
│   ├── email/              # Resend-Vorlagen
│   └── utils/              # Auth, Exporte, Formatierung
├── hooks/                  # React Hooks
├── types/                  # TypeScript-Definitionen
└── i18n/                   # Internationalisierung (4 Sprachen)

supabase/
└── migrations/             # 69 SQL-Migrationen

tests/
├── unit/                   # Vitest-Unit-Tests
├── integration/            # API-Integrationstests
└── e2e/                    # Playwright-E2E-Tests
```

## Tests

```bash
pnpm run test          # Unit- & Integrationstests
pnpm run test:watch    # Watch-Modus
pnpm run test:e2e      # Playwright E2E (7 Geraetekonfigurationen)
pnpm run test:e2e:ui   # Interaktive Playwright-Oberflaeche
pnpm run lint          # ESLint-Pruefung
```

## Deployment

Konzipiert fuer Vercel:

1. Verbinden Sie Ihr GitHub-Repository mit Vercel
2. Setzen Sie alle erforderlichen Umgebungsvariablen im Vercel-Dashboard
3. Bereitstellen -- Vercel fuehrt Builds automatisch bei Push auf `main` durch

## Lizenz

Dieses Projekt ist unter der **Business Source License 1.1** (BSL 1.1) lizenziert.

- **Erlaubt**: Kopieren, Aendern, nicht-produktive Nutzung, Evaluierung, Testen, Bildung
- **Nicht erlaubt**: Produktiv- oder kommerzielle Nutzung ohne Lizenz des Lizenzgebers
- **Aenderungsdatum**: 11. Februar 2030 -- nach diesem Datum wird die Lizenz in Apache 2.0 umgewandelt

Siehe [LICENSE](LICENSE) fuer die vollstaendigen Bedingungen.

## Autor

**Leroy Loewe** -- [GitHub](https://github.com/lroy-stack)

Entwickelt fuer Cheers Mallorca, El Arenal.
