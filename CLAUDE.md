# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GrandCafe Cheers is a production PWA management platform for a seasonal beachfront restaurant in El Arenal, Mallorca. It covers staff scheduling, menu management, inventory, POS, reservations, events, marketing, finance, CRM, and an AI assistant powered by Claude.

## Commands

```bash
pnpm run dev          # Start Next.js dev server (localhost:3000)
pnpm run build        # Production build
pnpm run lint         # ESLint check
pnpm run test         # Vitest unit/integration tests
pnpm run test:watch   # Vitest watch mode
pnpm run test:e2e     # Playwright E2E tests (7 device configs)
pnpm run test:e2e:ui  # Playwright interactive UI
pnpm run db:migrate   # Push migrations to Supabase
pnpm run db:reset     # Reset database
pnpm run db:seed      # Seed database
pnpm run db:types     # Generate TypeScript types from DB schema → src/types/database.ts
```

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript 5.9 (strict) + Supabase (PostgreSQL 17) + Anthropic SDK 0.24.0 + Tailwind CSS 3.3 + shadcn/ui

**Package manager:** pnpm

### Source Layout

- `src/app/` — App Router pages and API routes. Each module (staff, menu, stock, sales, reservations, events, marketing, finance, customers, etc.) has its own folder.
- `src/components/` — React components organized by module. `ui/` contains shadcn/ui primitives. `providers/` has AuthProvider, SWRProvider, ThemeInjector.
- `src/lib/ai/` — AI assistant core (see AI section below).
- `src/lib/supabase/` — Supabase client setup: `server.ts` exports `createClient()` (cookie-based auth) and `createAdminClient()` (service role, bypasses RLS).
- `src/lib/email/` — Resend email integration with HTML templates.
- `src/lib/utils/` — Utilities: auth helpers, Excel exports, PDF generation, tax calculations, QR codes, currency formatting.
- `src/hooks/` — React hooks including `use-ai-chat-stream.ts` (SSE streaming client).
- `src/types/` — TypeScript definitions. `index.ts` has all domain types; `database.ts` is auto-generated.
- `src/i18n/` — next-intl setup with 4 locales (en, nl, es, de). Messages in `src/i18n/messages/{locale}/`.
- `supabase/migrations/` — 69 SQL migrations defining the full schema.
- `tests/` — `unit/`, `integration/`, `e2e/` directories.

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

### Authentication

No middleware.ts — auth is handled per-route via `src/lib/utils/auth.ts`:
- `getCurrentUser()` — cached with React `cache()`, returns user + profile
- `hasRole()`, `isAdmin()`, `isManagerOrAdmin()`, `canViewFinancials()` — role checks
- `requireAuth()`, `requireRole()` — API route guards
- 7 roles: `admin`, `owner`, `manager`, `kitchen`, `bar`, `waiter`, `dj`

### Data Fetching

- **Server components**: Direct Supabase queries via `createClient()`
- **Client components**: SWR with 30s deduplication, 2 error retries, no revalidate-on-focus

### Internationalization

4 locales (en, nl, es, de) via next-intl. Cookie-based locale selection. Server: `getTranslations()`, Client: `useTranslations()`. Each locale has ~14 namespace JSON files.

## AI Assistant Architecture

The AI system lives in `src/lib/ai/` and is the most complex subsystem:

### Core Files
- `claude.ts` — Anthropic client, 4-point prompt caching strategy (system → context → tools → conversation prefix)
- `model-router.ts` — Routes queries to Haiku (operational, cheap) or Sonnet (analytical, complex). Complexity patterns trigger Sonnet via keyword regex.
- `tool-definitions.ts` — 43 tool definitions (26 read, 17 write)
- `tools.ts` — Read tool executor (77KB). Each tool queries Supabase and returns formatted results.
- `write-tools.ts` — Write tool executor. Delegates to internal API routes with forwarded auth cookies.
- `write-tool-validation.ts` — Zod schemas for all write tools.
- `tool-access.ts` — Role-based tool access matrix. Admin/owner get all 43; kitchen/bar/waiter/dj get role-specific subsets.
- `system-prompt-builder.ts` — Dynamic system prompt composed from role-specific sections (financial knowledge, scheduling rules, social media guidance, etc.).
- `context-resolvers.ts` — Keyword-triggered dynamic context injection (reservations, stock alerts, events, schedule, weather, etc.). Injected as a separate cache breakpoint.
- `conversation-service.ts` — CRUD for conversations, messages, and pending actions in DB.

### Streaming Endpoint

`src/app/api/ai/chat/stream/route.ts` (742 lines) — SSE endpoint with multi-turn tool loop:

1. Auth check + in-memory rate limit (20 req/min per user)
2. Load/create conversation, last 40 messages for context
3. Build role-based tools + system prompt + dynamic context
4. Model router selects Haiku or Sonnet
5. Stream with up to 5 tool-loop iterations
6. Write tools create pending actions (5min TTL) requiring user confirmation
7. 11 SSE event types: `message_start`, `content_delta`, `tool_use`, `tool_result`, `pending_action`, `subagent_start/progress/done`, `artifact`, `message_done`, `error`

### Sub-Agents

`src/lib/ai/sub-agents/` — 9 specialist agents invoked via delegation tools:
- `engine.ts` — Generic tool-loop executor for all sub-agents
- Specialists: document-generator, web-researcher, schedule-optimizer, compliance-auditor, financial-reporter, marketing-campaign, sports-events, advertising-manager, cocktail-specialist
- Each has its own system prompt, tool subset, and model preference

### Frontend Hook

`src/hooks/use-ai-chat-stream.ts` (590 lines) — React hook managing SSE streaming, tool tracking, artifact detection, pending action confirmation/rejection, multi-conversation state, and message editing.

## Key Conventions

- **TypeScript strict mode** with `noUnusedLocals`, `noUnusedParameters`. Unused args prefixed with `_`.
- **Components**: Function components with hooks. Client components use `'use client'` directive.
- **UI**: shadcn/ui + Radix primitives + Tailwind. OKLch color system with dark mode via `next-themes`.
- **Forms**: React Hook Form + Zod validation.
- **Tables**: TanStack Table for data grids.
- **Charts**: Recharts for data visualization.
- **Dates**: date-fns (v4).
- **Exports**: ExcelJS for spreadsheets, pdfkit for PDFs.
- **Timezone**: Europe/Madrid (configured in system prompt and business logic).
- **ESLint**: Flat config (`eslint.config.mjs`). Warns on unused vars (except `_` prefix), explicit any, and react-hooks rules.

## Database

~60+ tables across 69 migrations. Key table groups:
- **Auth/Users**: `profiles`, `employees`
- **Operations**: `menu_items`, `recipes`, `stock`, `stock_movements`, `sales`, `pos_transactions`, `reservations`, `events`, `staff_shifts`, `schedule_plans`
- **AI**: `ai_conversations`, `ai_conversation_messages`, `ai_pending_actions`, `ai_audit_log`, `ai_tool_executions`, `ai_subagent_tasks`
- **CRM**: `customers`, `reviews`, `loyalty_rewards`

All tables use Row-Level Security (RLS). Admin client (`createAdminClient()`) bypasses RLS for server-side operations.

Remote instance: `<your-project>.supabase.co`

## Environment Variables

Required (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_APP_URL`, `TIMEZONE`, `DEFAULT_LOCALE`

Optional integrations:
- `RESEND_API_KEY`, `EMAIL_FROM` (email)
- `META_ACCESS_TOKEN`, `META_PAGE_ID`, `META_IG_USER_ID` (Instagram/Facebook)
- `GEMINI_API_KEY` (image generation)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (push notifications)
