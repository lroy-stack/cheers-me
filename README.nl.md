# GrandCafe Cheers Platform

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL_1.1-blue.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_17-3FCF8E?logo=supabase)](https://supabase.com)

[EN](README.md) | **[NL]** | [ES](README.es.md) | [DE](README.de.md)

---

Een full-stack PWA-beheerplatform voor het runnen van een seizoensgebonden strandrestaurant. Gebouwd voor **Cheers Mallorca** in El Arenal, met dekking van elk aspect van de dagelijkse bedrijfsvoering, van personeelsplanning tot AI-gestuurde bedrijfsintelligentie.

## Functies

### Operaties
- **Personeelsbeheer** — Planning, dienstsjablonen, in-/uitklokken, beschikbaarheid, ruilverzoeken
- **Menubeheer** — Meertalige items (EN/NL/ES/DE), 14 EU-allergenen, voedsekostprijsberekening, dagspecials
- **Keukenweergavesysteem** — Realtime orderflow voor keuken- en barstations
- **Voorraad & Stock** — Niveaubewaking, laagvoorraadmeldingen, bewegingen, leveranciersbeheer, speciaalbierbeheer
- **POS & Verkoop** — Dagelijkse verkoopinvoer, omzetuitsplitsing, fooienregistratie, kassaafsluiting

### Gastbeleving
- **Reserveringen** — Interactieve plattegrondeditor, online boekingsformulier, wachtlijst, automatische bevestigingen
- **Digitaal Menu** — Publiek toegankelijk menu met QR-codetoegang
- **Evenementen & Entertainment** — Evenementenkalender, DJ-database, materiaalchecklists
- **CRM** — Klantendatabase, review-aggregatie, sentimentanalyse, loyaliteitsprogramma

### Bedrijfsintelligentie
- **Financiele Rapportage** — Dagelijkse W&V, kostenratio's (voedsel/dranken/personeel), budget vs werkelijk, belastingklare exports
- **Marketing** — Contentkalender, sociale media-publicatie (Instagram/Facebook), nieuwsbriefbouwer
- **AI-assistent** — Claude-gestuurde chat met 43 tools, rolgebaseerde toegang, sub-agentdelegatie, streaming-antwoorden

### AI-assistent Hoogtepunten
- 43 geintegreerde tools (26 lees, 17 schrijf) met rolgebaseerde toegangscontrole
- Intelligente modelroutering (Haiku voor operaties, Sonnet voor analyses)
- 9 specialistische sub-agents (financieel rapporteur, planningsoptimalisator, compliance-auditor, enz.)
- Schrijfoperaties vereisen expliciete gebruikersbevestiging (lopende acties met 5 minuten TTL)
- 4-punts prompt caching-strategie voor kostenoptimalisatie
- Dynamische contextinjectie op basis van gesprekssleutelwoorden
- SSE-streaming met 11 eventtypes

## Technologiestack

| Laag | Technologie |
|------|-------------|
| Framework | Next.js 16 (App Router) |
| Taal | TypeScript 5.9 (strict mode) |
| UI | React 19 + Tailwind CSS 3.3 + shadcn/ui + Radix |
| Database | Supabase (PostgreSQL 17, RLS, Auth) |
| AI | Anthropic SDK 0.24.0 (Claude API) |
| E-mail | Resend |
| Sociale Media | Meta Graph API |
| Grafieken | Recharts |
| Tabellen | TanStack Table |
| Formulieren | React Hook Form + Zod |
| Exports | ExcelJS + pdfkit |
| i18n | next-intl (EN, NL, ES, DE) |
| Testen | Vitest + Playwright |
| Hosting | Vercel |
| Pakketbeheerder | pnpm |

## Snel Beginnen

### Vereisten

- Node.js 20+
- pnpm 8+
- Supabase-project (gratis tier werkt)
- Anthropic API-sleutel

### Installatie

```bash
# Kloon de repository
git clone https://github.com/lroy-stack/cheers-me.git
cd cheers-me

# Installeer afhankelijkheden
pnpm install

# Stel omgevingsvariabelen in
cp .env.example .env.local
# Bewerk .env.local met uw waarden

# Start de ontwikkelserver
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in uw browser.

### Database-installatie

```bash
# Push migraties naar uw Supabase-project
pnpm run db:migrate

# Vul met voorbeeldgegevens (optioneel)
pnpm run db:seed

# Genereer TypeScript-types vanuit schema
pnpm run db:types
```

## Omgevingsvariabelen

| Variabele | Vereist | Beschrijving |
|-----------|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Ja | Uw Supabase-project-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ja | Supabase anonieme/publieke sleutel |
| `SUPABASE_SERVICE_ROLE_KEY` | Ja | Supabase service role-sleutel (alleen server-side) |
| `ANTHROPIC_API_KEY` | Ja | Anthropic API-sleutel voor Claude |
| `NEXT_PUBLIC_APP_URL` | Ja | Publieke app-URL |
| `TIMEZONE` | Ja | Servertijdzone (standaard: `Europe/Madrid`) |
| `DEFAULT_LOCALE` | Ja | Standaardtaal (standaard: `en`) |
| `RESEND_API_KEY` | Nee | Resend API-sleutel voor e-mail |
| `EMAIL_FROM` | Nee | Afzender e-mailadres |
| `META_ACCESS_TOKEN` | Nee | Meta Graph API-token |
| `META_PAGE_ID` | Nee | Facebook Pagina-ID |
| `META_IG_USER_ID` | Nee | Instagram Gebruikers-ID |
| `GEMINI_API_KEY` | Nee | Google Gemini API-sleutel voor beeldgeneratie |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Nee | VAPID publieke sleutel voor pushmeldingen |
| `VAPID_PRIVATE_KEY` | Nee | VAPID prive-sleutel voor pushmeldingen |

Zie `.env.example` voor formaat en voorbeeldwaarden.

## Projectstructuur

```
src/
├── app/                    # Next.js App Router (pagina's + API-routes)
│   ├── api/                # API-eindpunten per module
│   ├── staff/              # Personeelsplanning & -beheer
│   ├── menu/               # Menubouwer & KDS
│   ├── stock/              # Voorraadbeheer
│   ├── sales/              # POS & verkoopregistratie
│   ├── reservations/       # Tafelreserveringen & plattegrond
│   ├── events/             # Evenementen & entertainment
│   ├── marketing/          # Content & sociale media
│   ├── finance/            # Financiele rapportage
│   └── customers/          # CRM & loyaliteit
├── components/             # React-componenten per module
│   ├── ui/                 # shadcn/ui-primitieven
│   ├── ai/                 # AI-chatinterface
│   └── providers/          # Auth, SWR, Theme providers
├── lib/
│   ├── ai/                 # AI-assistentkern
│   │   ├── sub-agents/     # 9 specialistagenten
│   │   ├── claude.ts       # Anthropic-client + caching
│   │   ├── tools.ts        # 26 leestools
│   │   ├── write-tools.ts  # 17 schrijftools
│   │   └── model-router.ts # Haiku/Sonnet-routering
│   ├── supabase/           # Database-clientconfiguratie
│   ├── email/              # Resend-sjablonen
│   └── utils/              # Auth, exports, opmaak
├── hooks/                  # React hooks
├── types/                  # TypeScript-definities
└── i18n/                   # Internationalisatie (4 talen)

supabase/
└── migrations/             # 69 SQL-migraties

tests/
├── unit/                   # Vitest unit-tests
├── integration/            # API-integratietests
└── e2e/                    # Playwright E2E-tests
```

## Testen

```bash
pnpm run test          # Unit- & integratietests
pnpm run test:watch    # Watch-modus
pnpm run test:e2e      # Playwright E2E (7 apparaatconfiguraties)
pnpm run test:e2e:ui   # Playwright interactieve UI
pnpm run lint          # ESLint-controle
```

## Deployment

Ontworpen voor Vercel:

1. Verbind uw GitHub-repository met Vercel
2. Stel alle vereiste omgevingsvariabelen in via het Vercel-dashboard
3. Deploy — Vercel verwerkt builds automatisch bij een push naar `main`

## Licentie

Dit project valt onder de **Business Source License 1.1** (BSL 1.1).

- **Toegestaan**: Kopieren, wijzigen, niet-productiegebruik, evaluatie, testen, educatie
- **Niet toegestaan**: Productie- of commercieel gebruik zonder licentie van de Licentiegever
- **Wijzigingsdatum**: 11 februari 2030 — na deze datum wordt de licentie omgezet naar Apache 2.0

Zie [LICENSE](LICENSE) voor volledige voorwaarden.

## Auteur

**Leroy Loewe** — [GitHub](https://github.com/lroy-stack)

Gebouwd voor Cheers Mallorca, El Arenal.
