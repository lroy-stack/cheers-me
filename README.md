# GrandCafe Cheers Platform

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL_1.1-blue.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_17-3FCF8E?logo=supabase)](https://supabase.com)

**[EN]** | [NL](README.nl.md) | [ES](README.es.md) | [DE](README.de.md)

---

A full-stack PWA management platform for running a seasonal beachfront restaurant. Built for **Cheers Mallorca** in El Arenal, covering every aspect of daily operations from staff scheduling to AI-powered business intelligence.

## Features

### Operations
- **Staff Management** — Scheduling, shift templates, clock in/out, availability, swap requests
- **Menu Management** — Multi-language items (EN/NL/ES/DE), 14 EU allergens, food cost calculation, daily specials
- **Kitchen Display System** — Real-time order flow for kitchen and bar stations
- **Inventory & Stock** — Level tracking, low-stock alerts, movements, supplier management, craft beer tracking
- **POS & Sales** — Daily sales input, revenue breakdown, tip tracking, cash register close

### Guest Experience
- **Reservations** — Interactive floor plan editor, online booking form, waitlist, auto-confirmations
- **Digital Menu** — Public-facing menu with QR code access
- **Events & Entertainment** — Event calendar, DJ database, equipment checklists
- **CRM** — Customer database, review aggregation, sentiment analysis, loyalty program

### Business Intelligence
- **Financial Reporting** — Daily P&L, cost ratios (food/beverage/labor), budget vs actual, tax-ready exports
- **Marketing** — Content calendar, social media posting (Instagram/Facebook), newsletter builder
- **AI Assistant** — Claude-powered chat with 43 tools, role-based access, sub-agent delegation, streaming responses

### AI Assistant Highlights
- 43 integrated tools (26 read, 17 write) with role-based access control
- Intelligent model routing (Haiku for operations, Sonnet for analytics)
- 9 specialist sub-agents (financial reporter, schedule optimizer, compliance auditor, etc.)
- Write operations require explicit user confirmation (pending actions with 5-minute TTL)
- 4-point prompt caching strategy for cost optimization
- Dynamic context injection based on conversation keywords
- SSE streaming with 11 event types

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.9 (strict mode) |
| UI | React 19 + Tailwind CSS 3.3 + shadcn/ui + Radix |
| Database | Supabase (PostgreSQL 17, RLS, Auth) |
| AI | Anthropic SDK 0.24.0 (Claude API) |
| Email | Resend |
| Social Media | Meta Graph API |
| Charts | Recharts |
| Tables | TanStack Table |
| Forms | React Hook Form + Zod |
| Exports | ExcelJS + pdfkit |
| i18n | next-intl (EN, NL, ES, DE) |
| Testing | Vitest + Playwright |
| Hosting | Vercel |
| Package Manager | pnpm |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Supabase project (free tier works)
- Anthropic API key

### Installation

```bash
# Clone the repository
git clone https://github.com/lroy-stack/cheers-me.git
cd cheers-me

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Start the development server
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup

```bash
# Push migrations to your Supabase project
pnpm run db:migrate

# Seed with sample data (optional)
pnpm run db:seed

# Generate TypeScript types from schema
pnpm run db:types
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL |
| `TIMEZONE` | Yes | Server timezone (default: `Europe/Madrid`) |
| `DEFAULT_LOCALE` | Yes | Default locale (default: `en`) |
| `RESEND_API_KEY` | No | Resend API key for email |
| `EMAIL_FROM` | No | Sender email address |
| `META_ACCESS_TOKEN` | No | Meta Graph API token |
| `META_PAGE_ID` | No | Facebook Page ID |
| `META_IG_USER_ID` | No | Instagram User ID |
| `GEMINI_API_KEY` | No | Google Gemini API key for image generation |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | No | VAPID public key for push notifications |
| `VAPID_PRIVATE_KEY` | No | VAPID private key for push notifications |

See `.env.example` for format and placeholder values.

## Project Structure

```
src/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── api/                # API endpoints per module
│   ├── staff/              # Staff scheduling & management
│   ├── menu/               # Menu builder & KDS
│   ├── stock/              # Inventory management
│   ├── sales/              # POS & sales tracking
│   ├── reservations/       # Table reservations & floor plan
│   ├── events/             # Events & entertainment
│   ├── marketing/          # Content & social media
│   ├── finance/            # Financial reporting
│   └── customers/          # CRM & loyalty
├── components/             # React components by module
│   ├── ui/                 # shadcn/ui primitives
│   ├── ai/                 # AI chat interface
│   └── providers/          # Auth, SWR, Theme providers
├── lib/
│   ├── ai/                 # AI assistant core
│   │   ├── sub-agents/     # 9 specialist agents
│   │   ├── claude.ts       # Anthropic client + caching
│   │   ├── tools.ts        # 26 read tools
│   │   ├── write-tools.ts  # 17 write tools
│   │   └── model-router.ts # Haiku/Sonnet routing
│   ├── supabase/           # Database client setup
│   ├── email/              # Resend templates
│   └── utils/              # Auth, exports, formatting
├── hooks/                  # React hooks
├── types/                  # TypeScript definitions
└── i18n/                   # Internationalization (4 locales)

supabase/
└── migrations/             # 69 SQL migrations

tests/
├── unit/                   # Vitest unit tests
├── integration/            # API integration tests
└── e2e/                    # Playwright E2E tests
```

## Testing

```bash
pnpm run test          # Unit & integration tests
pnpm run test:watch    # Watch mode
pnpm run test:e2e      # Playwright E2E (7 device configs)
pnpm run test:e2e:ui   # Playwright interactive UI
pnpm run lint          # ESLint check
```

## Deployment

Designed for Vercel:

1. Connect your GitHub repository to Vercel
2. Set all required environment variables in the Vercel dashboard
3. Deploy — Vercel handles builds automatically on push to `main`

## License

This project is licensed under the **Business Source License 1.1** (BSL 1.1).

- **Permitted**: Copying, modification, non-production use, evaluation, testing, education
- **Not permitted**: Production or commercial use without a license from the Licensor
- **Change Date**: February 11, 2030 — after this date, the license converts to Apache 2.0

See [LICENSE](LICENSE) for full terms.

## Author

**Leroy Loewe** — [GitHub](https://github.com/lroy-stack)

Built for Cheers Mallorca, El Arenal.
