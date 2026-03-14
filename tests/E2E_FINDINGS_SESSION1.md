# E2E Testing Findings — Session 1

> Fecha: 2026-03-14
> Tester: Claude via Playwright MCP
> Paginas testeadas: ~20 rutas (landing, login, dashboard, staff, menu, stock, reservations, sales, events, finance, settings, kiosk, gift)
> Viewports: 1440x900 (desktop), 375x812 (mobile)
> Temas: dark mode (default) + light mode
> Screenshots: 25 capturas en `/e2e-*.png`

---

## CRITICAL (bloquea funcionalidad)

### C1. PWA Install Dialog aparece en TODAS las paginas — incluida landing publica
**Afecta:** `/`, `/login`, `/dashboard`, `/staff`, y cada pagina admin
**Problema:** El dialog "Install GrandCafe Cheers Manager" se muestra a visitantes publicos y a cada navegacion de pagina admin. Deberia mostrarse SOLO a usuarios autenticados del staff, maximo 1 vez por sesion, y NUNCA en la landing publica.
**Impacto:** Bloquea la interaccion del usuario hasta que se cierra manualmente. Expone branding "Manager" a clientes.
**Screenshot:** `e2e-05-login-page.png`, `e2e-07-staff-list.png`

### C2. Kiosk Turnstile CAPTCHA siempre falla — bloquea check-in/out
**Afecta:** `/kiosk` — flow de check-in para empleados
**Problema:** Tras introducir PIN correcto (7291), la pantalla de "Security Check" con Turnstile falla con error 110200. "Security verification failed. Please try again." con Retry que tambien falla.
**Impacto:** Ningun empleado puede hacer clock-in/out via kiosk.
**Screenshot:** `e2e-22-kiosk-turnstile.png`
**Console:** `[Turnstile] Widget error callback triggered`, `[Cloudflare Turnstile] Error: 110200`

### C3. Stats counter muestra "48" en lugar de "4.8" en landing
**Afecta:** `/` — seccion Experience Showcase stats
**Problema:** El AnimatedCounter recibe `value={48}` (entero) pero deberia mostrar `4.8` (decimal). Muestra "48/5" lo cual es incorrecto e ilegible.
**Archivo:** `src/components/booking/experience-showcase.tsx:128` — `<AnimatedCounter value={48} suffix="" />`
**Screenshot:** `e2e-17-landing-mobile-scroll2.png`

---

## HIGH (funcionalidad degradada)

### H1. Footer y Trust section no respetan light/dark mode — colores hardcoded
**Afecta:** Landing `/` — footer y seccion Trust & Community
**Problema:** Ambas secciones usan colores oklch hardcoded:
  - Footer: `bg-[oklch(0.10_0.02_15)]` (siempre negro)
  - Trust: `bg-[oklch(0.12_0.03_15)]` (siempre negro)
  - Textos: `text-white/80`, `text-white/35` (siempre blanco)
En light mode, estas secciones permanecen oscuras mientras el resto de la pagina es claro.
**Deberia usar:** `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground` (semantic tokens)
**Screenshot:** `e2e-25-landing-lightmode-footer.png`

### H2. Pagina /gift completa en ingles — no respeta idioma seleccionado
**Afecta:** `/gift` — flow completo de compra de gift voucher
**Problema:** Toda la pagina esta hardcoded en ingles ("Give the Gift of Cheers", "Select an amount", "Choose a Style", "Custom amount", "Personalize", "Your Details", "Payment") sin importar el idioma seleccionado en la landing. No usa BookingLanguageProvider ni next-intl.
**Inconsistencia:** "IVA incluido (21%)" esta en espanol mezclado con el resto en ingles.
**Screenshot:** `e2e-23-gift-page.png`

### H3. Console errors en Sales y Finance — APIs fallan
**Afecta:** `/sales`, `/finance`
**Problema:**
  - Sales: "Error fetching top sellers" + "Error fetching sales dashboard" — fetch background falla
  - Finance: "Error fetching finance dashboard" — fetch background falla
Las paginas renderizan con datos vacios pero los errores de consola indican problemas de API.

### H4. Dashboard: card "Active Staff" linkea a `/sales` en vez de `/staff`
**Afecta:** `/dashboard`
**Problema:** La primera KPI card "Active Staff" con valor "6" linkea a `/sales` en lugar de `/staff`. Semanticamente incorrecto.
**Archivo:** `src/app/dashboard/page.tsx:137-147`

### H5. Dashboard: cards duplicadas "Active Staff" y "Team Size"
**Afecta:** `/dashboard`
**Problema:** Dos cards muestran exactamente la misma informacion: "6" + "Active employees". Desperdicio de espacio y confusion.

---

## MEDIUM (UX/Visual)

### M1. favicon.ico devuelve 404
**Afecta:** Todas las paginas
**Problema:** `http://localhost:3000/favicon.ico` devuelve 404. Console error en cada navegacion.

### M2. Hydration warnings en multiples paginas
**Afecta:** `/stock`, `/events`, `/menu`, `/reservations`
**Problema:** "A tree hydrated but some attributes of the server-rendered HTML didn't match" — indica mismatch server/client.

### M3. Kiosk: "Enter your 4-digit PIN" hardcoded en ingles
**Afecta:** `/kiosk`
**Problema:** Todo el kiosk esta en ingles sin importar el idioma del dispositivo. Textos: "Touch to begin", "Enter your 4-digit PIN", "Security Check", "Back".

### M4. Floating reserve button se solapa con boton de chat
**Afecta:** Landing `/` mobile y desktop
**Problema:** El floating "Reserva Tu Mesa" y el boton de chat (circulo rojo) se solapan visualmente en la esquina inferior derecha.
**Screenshot:** `e2e-03-experience-section.png`

### M5. Cookie consent en ingles
**Afecta:** Todas las paginas
**Problema:** "We use cookies to provide essential functionality and improve your experience" no se traduce.

### M6. Landing: idioma cambia a ingles al navegar a /gift y /kiosk
**Afecta:** `/gift`, `/kiosk`
**Problema:** El usuario selecciona espanol en la landing, pero al navegar a `/gift` o `/kiosk` todo aparece en ingles. El contexto de idioma se pierde entre rutas.

---

## i18n (Traduccion)

### i1. Footer landing: headings en ingles
**Textos:** "Visit Us", "Contact", "Hours", "Get Directions →", "All rights reserved"
**Deberia:** Usar `t()` con keys de traduccion

### i2. Footer landing: legal links en ingles
**Textos:** "Digital Menu", "Privacy", "Terms", "Refunds"
**Deberia:** Traducir segun idioma seleccionado

### i3. Sales page: "No sales data for today" en ingles
**Archivo:** `src/app/sales/page.tsx:151-155`

### i4. Finance page: "No financial data for today" en ingles
**Archivo:** `src/app/finance/page.tsx`

### i5. Dashboard: "Welcome back", "Your Profile", "Quick Access" en ingles
**Afecta:** Todo el admin panel esta en ingles sin i18n

### i6. Kiosk: todo el UI en ingles
**Textos:** "Touch to begin", "Enter your 4-digit PIN", "Security Check", "Back"

### i7. Gift page: todo en ingles
**Textos:** "Give the Gift of Cheers", "Select an amount", "Choose a Style", etc.

### i8. Cookie consent: todo en ingles
**Texto:** "We use cookies to provide essential functionality..."

---

## RESPONSIVE

### R1. Landing mobile 375px: stats muestran "48" (ver C3)
**Screenshot:** `e2e-17-landing-mobile-scroll2.png`

### R2. Landing mobile: floating button + chat button se solapan (ver M4)
**Screenshot:** Visible en mobile scroll

### R3. Admin en mobile: no testeado aun
**Nota:** El admin panel no ha sido testeado en mobile 375px en esta sesion. Pendiente para sesion 2.

---

## SEGURIDAD

### S1. PWA Install Dialog expone "Manager" a publico (ver C1)
**Impacto:** Un visitante publico ve "Install GrandCafe Cheers Manager" — revela que es un sistema de gestion.

### S2. Kiosk accesible sin autenticacion
**Afecta:** `/kiosk`
**Problema:** Cualquier persona puede acceder a `/kiosk` y ver la pantalla de PIN. Deberia requerir alguna validacion previa o estar protegida por red/VPN.

### S3. Gift page accesible con datos de pricing internos
**Afecta:** `/gift`
**Problema:** Muestra "IVA incluido (21%)" — informacion fiscal interna expuesta a publico.

---

## PROXIMOS PASOS (Session 2)

1. **Admin mobile responsive** — testear todas las paginas admin en 375px
2. **Employee detail page** — probar CRUD de empleados
3. **Menu builder interaction** — crear/editar items
4. **Reservations flow** — crear reserva desde admin
5. **Role-based access** — login como waiter/kitchen y verificar restricciones de sidebar
6. **Digital menu** — probar con diferentes idiomas
7. **Marketing/Newsletter** — probar crear post, enviar newsletter
8. **Settings** — probar guardar cambios en restaurant settings
9. **Theme light mode en admin** — barrido completo de paginas
10. **Legal pages** — verificar que cargan y tienen contenido

---

## RESUMEN

| Severidad | Cantidad |
|-----------|----------|
| CRITICAL | 3 |
| HIGH | 5 |
| MEDIUM | 6 |
| i18n | 8 |
| RESPONSIVE | 3 |
| SECURITY | 3 |
| **TOTAL** | **28** |
