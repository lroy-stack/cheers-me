# GrandCafe Cheers Platform

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL_1.1-blue.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_17-3FCF8E?logo=supabase)](https://supabase.com)

[EN](README.md) | [NL](README.nl.md) | **[ES]** | [DE](README.de.md)

---

Una plataforma de gestion PWA full-stack para administrar un restaurante costero de temporada. Construida para **Cheers Mallorca** en El Arenal, cubriendo todos los aspectos de las operaciones diarias, desde la planificacion de personal hasta la inteligencia de negocio impulsada por IA.

## Funcionalidades

### Operaciones
- **Gestion de Personal** — Planificacion, plantillas de turnos, fichaje de entrada/salida, disponibilidad, solicitudes de cambio
- **Gestion de Menu** — Elementos multilingues (EN/NL/ES/DE), 14 alergenos de la UE, calculo de coste de alimentos, especiales del dia
- **Sistema de Pantalla de Cocina** — Flujo de pedidos en tiempo real para estaciones de cocina y barra
- **Inventario y Stock** — Seguimiento de niveles, alertas de stock bajo, movimientos, gestion de proveedores, seguimiento de cerveza artesanal
- **TPV y Ventas** — Entrada de ventas diarias, desglose de ingresos, seguimiento de propinas, cierre de caja

### Experiencia del Cliente
- **Reservas** — Editor interactivo de plano de planta, formulario de reserva online, lista de espera, confirmaciones automaticas
- **Menu Digital** — Menu publico con acceso por codigo QR
- **Eventos y Entretenimiento** — Calendario de eventos, base de datos de DJs, listas de equipamiento
- **CRM** — Base de datos de clientes, agregacion de resenas, analisis de sentimiento, programa de fidelizacion

### Inteligencia de Negocio
- **Informes Financieros** — P&L diario, ratios de costes (comida/bebida/personal), presupuesto vs real, exportaciones preparadas para impuestos
- **Marketing** — Calendario de contenido, publicacion en redes sociales (Instagram/Facebook), constructor de newsletters
- **Asistente IA** — Chat impulsado por Claude con 43 herramientas, acceso basado en roles, delegacion a sub-agentes, respuestas en streaming

### Aspectos Destacados del Asistente IA
- 43 herramientas integradas (26 de lectura, 17 de escritura) con control de acceso basado en roles
- Enrutamiento inteligente de modelos (Haiku para operaciones, Sonnet para analitica)
- 9 sub-agentes especialistas (informes financieros, optimizador de horarios, auditor de cumplimiento, etc.)
- Las operaciones de escritura requieren confirmacion explicita del usuario (acciones pendientes con TTL de 5 minutos)
- Estrategia de cache de prompts en 4 puntos para optimizacion de costes
- Inyeccion dinamica de contexto basada en palabras clave de la conversacion
- Streaming SSE con 11 tipos de eventos

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript 5.9 (strict mode) |
| UI | React 19 + Tailwind CSS 3.3 + shadcn/ui + Radix |
| Base de Datos | Supabase (PostgreSQL 17, RLS, Auth) |
| IA | Anthropic SDK 0.24.0 (Claude API) |
| Email | Resend |
| Redes Sociales | Meta Graph API |
| Graficos | Recharts |
| Tablas | TanStack Table |
| Formularios | React Hook Form + Zod |
| Exportaciones | ExcelJS + pdfkit |
| i18n | next-intl (EN, NL, ES, DE) |
| Testing | Vitest + Playwright |
| Hosting | Vercel |
| Gestor de Paquetes | pnpm |

## Inicio Rapido

### Requisitos Previos

- Node.js 20+
- pnpm 8+
- Proyecto en Supabase (el plan gratuito funciona)
- Clave API de Anthropic

### Instalacion

```bash
# Clonar el repositorio
git clone https://github.com/lroy-stack/cheers-me.git
cd cheers-me

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores

# Iniciar el servidor de desarrollo
pnpm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Configuracion de Base de Datos

```bash
# Aplicar migraciones a tu proyecto Supabase
pnpm run db:migrate

# Cargar datos de ejemplo (opcional)
pnpm run db:seed

# Generar tipos TypeScript desde el esquema
pnpm run db:types
```

## Variables de Entorno

| Variable | Requerida | Descripcion |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Si | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Si | Clave anonima/publica de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Si | Clave de rol de servicio de Supabase (solo servidor) |
| `ANTHROPIC_API_KEY` | Si | Clave API de Anthropic para Claude |
| `NEXT_PUBLIC_APP_URL` | Si | URL publica de la aplicacion |
| `TIMEZONE` | Si | Zona horaria del servidor (por defecto: `Europe/Madrid`) |
| `DEFAULT_LOCALE` | Si | Idioma por defecto (por defecto: `en`) |
| `RESEND_API_KEY` | No | Clave API de Resend para email |
| `EMAIL_FROM` | No | Direccion de email del remitente |
| `META_ACCESS_TOKEN` | No | Token de Meta Graph API |
| `META_PAGE_ID` | No | ID de Pagina de Facebook |
| `META_IG_USER_ID` | No | ID de Usuario de Instagram |
| `GEMINI_API_KEY` | No | Clave API de Google Gemini para generacion de imagenes |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | No | Clave publica VAPID para notificaciones push |
| `VAPID_PRIVATE_KEY` | No | Clave privada VAPID para notificaciones push |

Consulta `.env.example` para el formato y valores de ejemplo.

## Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router (paginas + rutas API)
│   ├── api/                # Endpoints API por modulo
│   ├── staff/              # Planificacion y gestion de personal
│   ├── menu/               # Constructor de menu y KDS
│   ├── stock/              # Gestion de inventario
│   ├── sales/              # TPV y seguimiento de ventas
│   ├── reservations/       # Reservas de mesa y plano de planta
│   ├── events/             # Eventos y entretenimiento
│   ├── marketing/          # Contenido y redes sociales
│   ├── finance/            # Informes financieros
│   └── customers/          # CRM y fidelizacion
├── components/             # Componentes React por modulo
│   ├── ui/                 # Primitivos shadcn/ui
│   ├── ai/                 # Interfaz de chat IA
│   └── providers/          # Proveedores Auth, SWR, Theme
├── lib/
│   ├── ai/                 # Nucleo del asistente IA
│   │   ├── sub-agents/     # 9 agentes especialistas
│   │   ├── claude.ts       # Cliente Anthropic + cache
│   │   ├── tools.ts        # 26 herramientas de lectura
│   │   ├── write-tools.ts  # 17 herramientas de escritura
│   │   └── model-router.ts # Enrutamiento Haiku/Sonnet
│   ├── supabase/           # Configuracion del cliente de base de datos
│   ├── email/              # Plantillas Resend
│   └── utils/              # Auth, exportaciones, formato
├── hooks/                  # React hooks
├── types/                  # Definiciones TypeScript
└── i18n/                   # Internacionalizacion (4 idiomas)

supabase/
└── migrations/             # 69 migraciones SQL

tests/
├── unit/                   # Tests unitarios Vitest
├── integration/            # Tests de integracion API
└── e2e/                    # Tests E2E Playwright
```

## Testing

```bash
pnpm run test          # Tests unitarios e integracion
pnpm run test:watch    # Modo observador
pnpm run test:e2e      # Playwright E2E (7 configuraciones de dispositivo)
pnpm run test:e2e:ui   # Playwright UI interactiva
pnpm run lint          # Comprobacion ESLint
```

## Despliegue

Disenado para Vercel:

1. Conecta tu repositorio de GitHub a Vercel
2. Configura todas las variables de entorno requeridas en el panel de Vercel
3. Despliega — Vercel gestiona las builds automaticamente al hacer push a `main`

## Licencia

Este proyecto esta licenciado bajo la **Business Source License 1.1** (BSL 1.1).

- **Permitido**: Copia, modificacion, uso no productivo, evaluacion, testing, educacion
- **No permitido**: Uso en produccion o comercial sin licencia del Licenciante
- **Fecha de Cambio**: 11 de febrero de 2030 — despues de esta fecha, la licencia se convierte en Apache 2.0

Consulta [LICENSE](LICENSE) para los terminos completos.

## Autor

**Leroy Loewe** — [GitHub](https://github.com/lroy-stack)

Construido para Cheers Mallorca, El Arenal.
