# E2E Testing Plan — GrandCafe Cheers Platform

> Documento vivo de testing end-to-end basado en mejores practicas.
> Ultima actualizacion: 2026-03-14

---

## 1. Estado Actual

### Metricas
| Metrica | Valor |
|---------|-------|
| Test specs E2E | 25 archivos |
| Test cases totales | ~350 |
| Device configs | 7 (chromium, firefox, webkit, mobile chrome/safari, iPad portrait/landscape) |
| Paginas de la app | 70 |
| Cobertura estimada | ~45% de paginas, ~30% de flows criticos |
| Integration tests | 28 archivos (Vitest) |
| Unit tests | 12 archivos (Vitest) |

### Problemas Detectados en Tests Existentes

| Problema | Severidad | Ocurrencias | Ejemplo |
|----------|-----------|-------------|---------|
| Assertions vacias (`expect(true).toBe(true)`) | CRITICAL | 15+ | `events.spec.ts` |
| `waitForTimeout()` en lugar de waiters | HIGH | 40+ | Todos los specs |
| Sin `data-testid` en componentes | HIGH | Sistematico | Todo el codebase |
| Credenciales hardcoded | HIGH | Todos los specs | `manager@cheers.com / password123` |
| Catch silencioso `.catch(() => false)` | MEDIUM | 20+ | Oculta errores reales |
| Sin Page Object Model | MEDIUM | Sistematico | Selectores duplicados |
| Sin test isolation (DB cleanup) | MEDIUM | Sistematico | Tests pueden interferir |
| Sin `axe-playwright` para a11y | LOW | Sistematico | Solo checks manuales |

---

## 2. Arquitectura de Testing (Best Practices)

### Test Pyramid

```
         /  \        E2E (Playwright + Chrome Extension)
        / 25  \      → Flujos criticos de usuario, visual, responsive
       /________\
      /          \   Integration (Vitest)
     /    28      \  → API routes, DB queries, auth flows
    /______________\
   /                \ Unit (Vitest)
  /       12         \ → Funciones puras, validaciones, calculos
 /____________________\
```

### Principios

1. **Test behavior, not implementation** — probar lo que el usuario ve y hace, no detalles internos
2. **Cada test es independiente** — no depende del estado de otro test
3. **Selectores resilientes** — preferir `data-testid` > `getByRole` > `getByText` > `locator`
4. **Esperar, no dormir** — usar `waitForSelector`, `waitForResponse`, nunca `waitForTimeout`
5. **Datos de test aislados** — crear datos al inicio del test, limpiar al final
6. **Fallar rapido y claro** — no ocultar errores con `.catch(() => false)`
7. **Un assert por concepto** — cada test verifica UNA cosa conceptual
8. **Naming descriptivo** — `should show error when phone format is invalid`, no `test phone`

---

## 3. Infraestructura Requerida

### 3.1 Test Fixtures (crear)

```
tests/
  e2e/
    fixtures/
      auth.ts          → Login helpers (loginAs(role), logout)
      seed.ts          → Crear datos de test (reservation, employee, menu item)
      cleanup.ts       → Limpiar datos despues del test
    pages/
      booking.page.ts  → Page Object: booking wizard
      dashboard.page.ts → Page Object: admin dashboard
      staff.page.ts    → Page Object: staff management
    helpers/
      assertions.ts    → Custom assertions (expectToast, expectNoConsoleErrors)
      navigation.ts    → Helpers de navegacion (goToModule, expectBreadcrumb)
```

### 3.2 Page Object Model (patron recomendado)

```typescript
// tests/e2e/pages/booking.page.ts
import { type Page, type Locator, expect } from '@playwright/test'

export class BookingPage {
  readonly page: Page
  readonly heroTitle: Locator
  readonly reserveButton: Locator
  readonly wizard: Locator
  readonly occasionCards: Locator
  readonly partySizeCounter: Locator
  readonly nextButton: Locator

  constructor(page: Page) {
    this.page = page
    this.heroTitle = page.locator('[data-testid="hero-title"]')
    this.reserveButton = page.locator('[data-testid="reserve-button"]')
    this.wizard = page.locator('#booking-wizard')
    this.occasionCards = page.locator('[data-testid="occasion-card"]')
    this.partySizeCounter = page.locator('[data-testid="party-counter"]')
    this.nextButton = page.locator('[data-testid="wizard-next"]')
  }

  async goto() {
    await this.page.goto('/')
    await this.heroTitle.waitFor()
  }

  async scrollToWizard() {
    await this.wizard.scrollIntoViewIfNeeded()
  }

  async selectOccasion(type: string) {
    await this.occasionCards.filter({ hasText: type }).click()
    await this.page.waitForTimeout(400) // animation delay
  }

  async setPartySize(size: number) {
    // implementation
  }

  async fillGuestInfo(data: { name: string; phone: string; email?: string }) {
    await this.page.fill('[data-testid="guest-name"]', data.name)
    await this.page.fill('[data-testid="guest-phone"]', data.phone)
    if (data.email) await this.page.fill('[data-testid="guest-email"]', data.email)
  }

  async submitBooking() {
    await this.page.click('[data-testid="confirm-booking"]')
  }
}
```

### 3.3 Auth Fixtures

```typescript
// tests/e2e/fixtures/auth.ts
import { type Page } from '@playwright/test'

export const TEST_USERS = {
  admin:   { email: 'test-admin@cheers.test',   password: 'TestP@ss2026!' },
  manager: { email: 'test-manager@cheers.test', password: 'TestP@ss2026!' },
  waiter:  { email: 'test-waiter@cheers.test',  password: 'TestP@ss2026!' },
  kitchen: { email: 'test-kitchen@cheers.test', password: 'TestP@ss2026!' },
  bar:     { email: 'test-bar@cheers.test',     password: 'TestP@ss2026!' },
  dj:      { email: 'test-dj@cheers.test',      password: 'TestP@ss2026!' },
} as const

export type TestRole = keyof typeof TEST_USERS

export async function loginAs(page: Page, role: TestRole) {
  const user = TEST_USERS[role]
  await page.goto('/login')
  await page.fill('[data-testid="login-email"]', user.email)
  await page.fill('[data-testid="login-password"]', user.password)
  await page.click('[data-testid="login-submit"]')
  await page.waitForURL(/dashboard|staff|menu/, { timeout: 10000 })
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]')
  await page.click('[data-testid="logout-button"]')
  await page.waitForURL('/login')
}
```

### 3.4 Custom Assertions

```typescript
// tests/e2e/helpers/assertions.ts
import { type Page, expect } from '@playwright/test'

export async function expectNoConsoleErrors(page: Page) {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('hydration')) {
      errors.push(msg.text())
    }
  })
  return { verify: () => expect(errors).toHaveLength(0) }
}

export async function expectToast(page: Page, text: string | RegExp) {
  const toast = page.locator('[data-sonner-toast]').filter({ hasText: text })
  await expect(toast).toBeVisible({ timeout: 5000 })
}

export async function expectNoHorizontalScroll(page: Page) {
  const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
  const clientWidth = await page.evaluate(() => document.body.clientWidth)
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
}
```

---

## 4. Test Suite Completa — Inventario por Modulo

### 4.1 Public Pages (Prioridad 1 — Customer-facing)

#### `booking-flow.spec.ts` (NUEVO — reemplaza booking-i18n.spec.ts)
| # | Test Case | Tipo | Prioridad |
|---|-----------|------|-----------|
| 1 | Hero carga con titulo, logo y CTA | smoke | P1 |
| 2 | Scroll indicator se anima correctamente | visual | P3 |
| 3 | Floating reserve button aparece al scrollear pasado hero | flow | P1 |
| 4 | Floating reserve button desaparece cuando wizard esta en viewport | flow | P1 |
| 5 | Click en CTA scrollea suavemente al wizard | flow | P1 |
| 6 | Experience showcase renderiza 3 bloques parallax | visual | P2 |
| 7 | Stats counters se animan al entrar en viewport | visual | P3 |
| 8 | Featured carousel muestra items del menu | smoke | P1 |
| 9 | Featured carousel: grid en desktop, carousel en mobile | responsive | P2 |
| 10 | Tonight events banner aparece si hay eventos | flow | P2 |
| 11 | Wizard Step 1: seleccionar occasion auto-avanza | flow | P1 |
| 12 | Wizard Step 2: seleccionar fecha y hora | flow | P1 |
| 13 | Wizard Step 2: fechas pasadas estan deshabilitadas | validation | P1 |
| 14 | Wizard Step 3: counter incrementa/decrementa correctamente | flow | P1 |
| 15 | Wizard Step 3: presets cambian el counter | flow | P2 |
| 16 | Wizard Step 3: mensaje para grupos >12 | flow | P2 |
| 17 | Wizard Step 4: validacion nombre requerido | validation | P1 |
| 18 | Wizard Step 4: validacion telefono E.164 | validation | P1 |
| 19 | Wizard Step 4: email opcional pero validado si presente | validation | P1 |
| 20 | Wizard Step 4: privacy consent requerido | validation | P1 |
| 21 | Wizard Step 5: review muestra datos correctos | flow | P1 |
| 22 | Wizard Step 5: edit links llevan al step correcto | flow | P2 |
| 23 | Wizard Step 5: availability check se ejecuta automaticamente | flow | P1 |
| 24 | Wizard: progress bar refleja el step actual | visual | P2 |
| 25 | Wizard: navegacion atras funciona | flow | P1 |
| 26 | Wizard: click en step completado navega de vuelta | flow | P2 |
| 27 | Booking success: confetti + checkmark animado | visual | P3 |
| 28 | Booking success: datos de reserva correctos | flow | P1 |
| 29 | Booking success: share WhatsApp genera URL correcta | flow | P2 |
| 30 | Booking success: add to calendar descarga .ics | flow | P2 |
| 31 | Trust section: rating counter se anima | visual | P3 |
| 32 | Trust section: reviews son scrollables | flow | P2 |
| 33 | Newsletter: subscribe con email valido | flow | P2 |
| 34 | Footer: links legales funcionan | smoke | P2 |

#### `booking-i18n.spec.ts` (REFACTOR)
| # | Test Case | Tipo | Prioridad |
|---|-----------|------|-----------|
| 1 | Default: pagina carga en ingles | i18n | P1 |
| 2 | Selector de idioma cambia a espanol | i18n | P1 |
| 3 | Selector de idioma cambia a holandes | i18n | P1 |
| 4 | Selector de idioma cambia a aleman | i18n | P1 |
| 5 | Wizard labels se traducen correctamente | i18n | P1 |
| 6 | Occasion cards se traducen | i18n | P2 |
| 7 | Error messages se traducen | i18n | P2 |
| 8 | Success page se traduce | i18n | P2 |
| 9 | Footer se traduce | i18n | P3 |
| 10 | No quedan translation keys visibles (raw keys) | i18n | P1 |

#### `booking-responsive.spec.ts` (NUEVO)
| # | Test Case | Viewport | Prioridad |
|---|-----------|----------|-----------|
| 1 | Hero ocupa 100vh en mobile | 375x812 | P1 |
| 2 | Hero ocupa 100vh en desktop | 1440x900 | P1 |
| 3 | Language selector es accesible en mobile | 375x812 | P1 |
| 4 | Wizard steps no overflow horizontal | 375x812 | P1 |
| 5 | Occasion grid: 2 cols mobile, 3 cols desktop | 375/1440 | P2 |
| 6 | Party size counter es touch-friendly (44px min) | 375x812 | P1 |
| 7 | Inputs son confortables en mobile (py-3 min) | 375x812 | P2 |
| 8 | Floating button: full-width en mobile, pill en desktop | 375/1440 | P1 |
| 9 | Featured cards: carousel mobile, grid desktop | 375/1440 | P2 |
| 10 | Reviews: scroll horizontal funciona con touch | 375x812 | P2 |

#### `gift-flow.spec.ts` (NUEVO)
| # | Test Case | Tipo | Prioridad |
|---|-----------|------|-----------|
| 1 | Gift page carga con presets de monto | smoke | P1 |
| 2 | Seleccionar preset actualiza el monto | flow | P1 |
| 3 | Custom amount funciona | flow | P1 |
| 4 | Formulario de recipiente valida campos | validation | P1 |
| 5 | Checkout redirige a pago | flow | P1 |
| 6 | Success page muestra codigo del voucher | flow | P1 |
| 7 | Codigo es copiable | flow | P2 |
| 8 | Redencion: codigo valido muestra saldo | flow | P1 |
| 9 | Redencion: codigo invalido muestra error | validation | P1 |

#### `digital-menu.spec.ts` (REFACTOR — mejorar assertions)
| # | Test Case | Tipo | Prioridad |
|---|-----------|------|-----------|
| 1 | Menu carga con categorias e items | smoke | P1 |
| 2 | Filtro por categoria funciona | flow | P1 |
| 3 | Busqueda filtra items correctamente | flow | P1 |
| 4 | Click en item abre sheet de detalle | flow | P1 |
| 5 | Detalle muestra precio, descripcion, alergenos | flow | P1 |
| 6 | Cambio de idioma actualiza nombres e items | i18n | P1 |
| 7 | Alergenos legend es visible y funcional | flow | P2 |
| 8 | Table number badge se muestra si hay param | flow | P2 |
| 9 | Mobile: categorias son scrollables | responsive | P2 |
| 10 | Mobile: grid 2 cols, items legibles | responsive | P2 |

### 4.2 Admin Panel — Auth & Dashboard (Prioridad 1)

#### `auth.spec.ts` (REFACTOR)
| # | Test Case | Tipo | Prioridad |
|---|-----------|------|-----------|
| 1 | Login con credenciales validas redirige a dashboard | flow | P1 |
| 2 | Login con credenciales invalidas muestra error | validation | P1 |
| 3 | Login con password vacio muestra validacion | validation | P1 |
| 4 | Acceder a ruta protegida sin auth redirige a login | security | P1 |
| 5 | Cada rol ve solo sus nav items en sidebar | security | P1 |
| 6 | Admin ve todos los modulos | security | P1 |
| 7 | Kitchen solo ve menu/stock | security | P1 |
| 8 | Waiter solo ve reservations/customers | security | P1 |
| 9 | Logout limpia la sesion | flow | P1 |
| 10 | Session expira y redirige a login | security | P2 |

#### `dashboard.spec.ts` (NUEVO)
| # | Test Case | Tipo | Prioridad |
|---|-----------|------|-----------|
| 1 | Dashboard carga con KPI cards | smoke | P1 |
| 2 | Stats muestran datos reales (no zeros) | data | P1 |
| 3 | Quick links llevan a las paginas correctas | flow | P1 |
| 4 | Profile info card muestra datos del usuario | flow | P2 |
| 5 | Responsive: cards se apilan en mobile | responsive | P2 |
| 6 | Dark mode: stats cards se ven correctamente | visual | P3 |

### 4.3 Admin Panel — Modulos (Prioridad 2)

#### Para cada modulo admin, el patron de test es:

```
1. SMOKE
   - Pagina carga sin errores de consola
   - Layout correcto (sidebar, header, content)
   - Datos se cargan (no empty state si hay datos)

2. CRUD
   - Crear: form valida, submit exitoso, item aparece en lista
   - Read: lista/tabla muestra items, detalle se abre
   - Update: editar item, guardar, cambios visibles
   - Delete: confirmar, item desaparece

3. VALIDATION
   - Campos requeridos muestran error si vacios
   - Formatos invalidos son rechazados (email, phone, dates)
   - Limites se respetan (max party size, max advance days)

4. FLOWS
   - Flujos multi-step completan correctamente
   - Estados intermedios (loading, saving) se muestran
   - Confirmaciones destructivas aparecen antes de borrar

5. RESPONSIVE
   - Tabla/grid se adapta a mobile
   - Formularios son usables en 375px
   - Touch targets son 44px minimo

6. RBAC
   - Solo roles autorizados ven las opciones
   - Roles no autorizados reciben redirect
```

### 4.4 Tests por Modulo — Resumen

| Modulo | Spec File | Tests Existentes | Tests Nuevos Necesarios | Prioridad |
|--------|-----------|------------------|-------------------------|-----------|
| Booking Flow | `booking-flow.spec.ts` | 4 (i18n only) | 34 | P1 |
| Booking Responsive | `booking-responsive.spec.ts` | 0 | 10 | P1 |
| Booking i18n | `booking-i18n.spec.ts` | 4 → refactor | 10 | P1 |
| Gift Flow | `gift-flow.spec.ts` | 0 | 9 | P1 |
| Digital Menu | `digital-menu.spec.ts` | 7 → refactor | 10 | P1 |
| Auth | `auth.spec.ts` | 13 → refactor | 10 | P1 |
| Dashboard | `dashboard.spec.ts` | 0 | 6 | P1 |
| Staff | `staff.spec.ts` | 36 → review | 5 | P2 |
| Menu | `menu.spec.ts` | 16 → review | 8 | P2 |
| Reservations | `reservations.spec.ts` | 23 → review | 5 | P2 |
| Sales | `sales.spec.ts` | varies | 5 | P2 |
| Finance | `finance.spec.ts` | 34 → review | 3 | P2 |
| Events | `events.spec.ts` | 48 → review | 3 | P2 |
| Marketing | `marketing.spec.ts` | 32 → review | 3 | P2 |
| CRM | `crm.spec.ts` | 20 → review | 3 | P2 |
| Stock | `stock.spec.ts` | 21 → review | 3 | P2 |
| Settings | `settings.spec.ts` | 0 | 12 | P2 |
| Ads | `ads.spec.ts` | 0 | 8 | P3 |
| Coupons | `coupons.spec.ts` | 0 | 8 | P3 |
| Floor Plan | `floorplan.spec.ts` | 0 | 6 | P3 |
| Kitchen | `kitchen.spec.ts` | 25 → review | 3 | P3 |
| Kiosk | `kiosk-flow.spec.ts` | varies | 3 | P3 |

---

## 5. data-testid Convenciones

### Naming Convention

```
[module]-[component]-[element]

Ejemplos:
  hero-title
  hero-reserve-button
  wizard-step-occasion
  wizard-next
  wizard-back
  occasion-card
  party-counter
  party-increment
  party-decrement
  guest-name
  guest-phone
  guest-email
  confirm-booking
  booking-success
  login-email
  login-password
  login-submit
  user-menu
  logout-button
  sidebar-nav
  sidebar-link-{module}
  toast-message
  modal-close
  table-row
  table-cell-{column}
  filter-search
  filter-status
  filter-date
  form-submit
  form-cancel
  delete-confirm
```

### Donde agregar data-testid (componentes criticos)

| Componente | Archivo | Elementos |
|-----------|---------|-----------|
| BookingHero | `booking-hero.tsx` | hero-title, hero-reserve-button |
| BookingWizard | `booking-wizard.tsx` | wizard-next, wizard-back |
| StepOccasion | `step-occasion.tsx` | occasion-card |
| StepPartySize | `step-party-size.tsx` | party-counter, party-increment, party-decrement |
| StepGuestInfo | `step-guest-info.tsx` | guest-name, guest-phone, guest-email |
| StepReview | `step-review.tsx` | confirm-booking |
| ProgressBar | `progress-bar.tsx` | progress-step-{n} |
| FloatingButton | `floating-reserve-button.tsx` | floating-reserve |
| LoginForm | `login-form.tsx` | login-email, login-password, login-submit |
| AppSidebar | `app-sidebar.tsx` | sidebar-nav, sidebar-link-{module} |
| UserNav | `user-nav.tsx` | user-menu, logout-button |

---

## 6. Chrome Extension Testing Workflow

### Cuando usar Chrome vs Playwright

| Escenario | Chrome | Playwright |
|-----------|--------|------------|
| Verificar animaciones (Framer Motion) | YES | No |
| Verificar Ken Burns effect | YES | No |
| Verificar parallax scroll | YES | No |
| Dark mode visual check | YES | Parcial |
| Verificar glass-morphism rendering | YES | No |
| Responsive testing rapido | YES | YES |
| Regression suite automatizada | No | YES |
| CI/CD pipeline | No | YES |
| Testing de 28 combinaciones (4 locales x 7 devices) | No | YES |
| Debugging visual de un bug | YES | No |
| Accesibilidad con screen reader | YES | Parcial |
| Performance profiling | YES (DevTools) | No |

### Chrome Testing Checklist

```markdown
## Visual QA — Chrome Extension

### Hero Section
- [ ] Ken Burns animation suave (no jank)
- [ ] Blur-in de texto se ejecuta al cargar
- [ ] Scroll indicator se anima
- [ ] Al scrollear: hero fade + scale funciona
- [ ] Language selector glass pill es legible
- [ ] En dark mode: contraste adecuado

### Experience Showcase
- [ ] Parallax es sutil (no nauseabundo)
- [ ] Texto aparece al scrollear
- [ ] Stats counters se animan
- [ ] Imagenes cargan sin CLS

### Booking Wizard
- [ ] Step transitions blur-slide son suaves
- [ ] Progress bar anima el progreso
- [ ] Glass card tiene backdrop-blur visible
- [ ] Glow hover en botones funciona
- [ ] Occasion cards: glow border al hover
- [ ] Party counter: animacion del numero

### Trust Section
- [ ] Fondo oscuro contrasta bien
- [ ] Rating counter se anima
- [ ] Reviews scroll horizontal con momentum
- [ ] Newsletter form es usable

### Mobile (375px)
- [ ] Hero 100vh sin overflow
- [ ] Floating button full-width
- [ ] Touch targets >44px
- [ ] No horizontal scroll en ningun punto
- [ ] Inputs confortables para pulgar
```

---

## 7. CI/CD Integration

### GitHub Actions (recomendado)

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install
      - run: pnpm exec playwright install --with-deps chromium

      - run: pnpm exec playwright test --project=chromium
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 8. Orden de Implementacion

### Sprint 1 — Fundacion (3-5 dias)
1. Crear fixtures: `auth.ts`, `assertions.ts`
2. Agregar `data-testid` a componentes criticos (booking, login, sidebar)
3. Refactorizar `booking-i18n.spec.ts` con mejores assertions
4. Crear `booking-flow.spec.ts` (34 tests)
5. Crear `booking-responsive.spec.ts` (10 tests)

### Sprint 2 — Public Pages (2-3 dias)
6. Crear `gift-flow.spec.ts` (9 tests)
7. Refactorizar `digital-menu.spec.ts` (10 tests)
8. Crear `dashboard.spec.ts` (6 tests)
9. Refactorizar `auth.spec.ts` con RBAC tests (10 tests)

### Sprint 3 — Admin Cleanup (3-5 dias)
10. Eliminar `expect(true).toBe(true)` de todos los specs
11. Reemplazar `waitForTimeout` por waiters apropiados
12. Agregar `data-testid` a componentes admin
13. Crear `settings.spec.ts` (12 tests)
14. Crear Page Objects para modulos principales

### Sprint 4 — Coverage Expansion (3-5 dias)
15. Crear `ads.spec.ts`, `coupons.spec.ts`, `floorplan.spec.ts`
16. Agregar a11y tests con `axe-playwright`
17. Configurar CI/CD pipeline
18. Visual regression con screenshots baseline

---

## 9. Comandos de Referencia

```bash
# Ejecutar todos los tests
pnpm run test:e2e

# Ejecutar un spec especifico
pnpm exec playwright test tests/e2e/booking-flow.spec.ts

# Ejecutar con browser visible
pnpm exec playwright test tests/e2e/booking-flow.spec.ts --headed

# Ejecutar solo en mobile
pnpm exec playwright test --project="Mobile Chrome"

# Ejecutar un test por nombre
pnpm exec playwright test -g "should complete booking flow"

# UI interactivo
pnpm run test:e2e:ui

# Generar y ver reporte HTML
pnpm exec playwright test --reporter=html
pnpm exec playwright show-report

# Debug mode (pausa en cada paso)
pnpm exec playwright test --debug

# Actualizar screenshots baseline
pnpm exec playwright test --update-snapshots

# Chrome extension (visual testing)
claude --chrome
# o dentro de una sesion:
/chrome
```
