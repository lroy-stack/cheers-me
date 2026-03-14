# Analisis: React Native Employee Mobile App — GrandCafe Cheers

**Fecha:** 2026-03-14
**Estado:** Investigacion completa + mapa de features + stack tecnologico

---

## 1. Features del Empleado en la Web Actual

### Lo que cada empleado (waiter/bar/kitchen/dj) puede hacer HOY:

| Feature | Pagina | Descripcion |
|---------|--------|-------------|
| Dashboard | `/dashboard` | Resumen: staff activo, reservas, stock alerts, perfil |
| Mi Horario | `/staff/my-schedule` | 4 tabs: Schedule (semana), Tasks, Hours, Leave |
| My Hours | `/staff/clock` | Visualizacion de horas trabajadas, historial de fichajes (SOLO LECTURA — clock in/out se hace UNICAMENTE desde la tablet/kiosk del restaurante) |
| Tareas | `/staff/tasks` | Ver/completar tareas asignadas, compliance fichas |
| Recursos | `/staff/resources` | Guias de formacion, tests, certificados |
| Documentos | `/staff/documents` | Contratos, nominas (solo lectura) |
| Ajustes | `/settings` | Nombre, telefono, idioma, avatar, emergencia, notificaciones |
| AI Assistant | `/assistant` | Chat con Claude (tools limitados por rol) |
| Notificaciones | Bell icon | In-app realtime via Supabase, 10 categorias configurables |

### Features adicionales por rol:
- **waiter**: Reservas, Floor Plan, Waitlist, CRM, Reviews, Coupons
- **bar**: Eventos, DJs, Sports, Stock (cerveza, movimientos), Coupons
- **kitchen**: Menu overview/builder/allergens/recipes, Stock
- **dj**: Eventos, DJs, Sports

### Gaps actuales (no existe en web):
- Empleado NO ve su historial de feedback/surveys
- Push notifications NO activas (VAPID keys vacias)
- NO hay shift swap requests (tabla existe, sin UI)
- NO hay availability management (tabla existe, sin UI)
- NO hay chat/mensajeria de equipo
- NO hay tip tracking
- NO hay acceso a nominas/payslips

---

## 2. Competencia — Apps de Empleados de Restauracion

| App | Free Tier | Coste/usuario | Mejor Para | Rating |
|-----|-----------|--------------|------------|--------|
| 7shifts | 15 users | ~$1.33-2.25 | Restauracion especifica | 4.5/5 |
| Homebase | 10 users | ~$2.50 | Restaurantes pequenos | 4.4/5 |
| Deputy | No | $4.50 | Seasonal/compliance | 4.6/5 |
| Planday | No | EUR 2.99-6.99 | Multi-location EU | 4.3/5 |
| Sling (Toast) | 30 users | $2-4 | Bajo presupuesto | 4.6/5 |
| When I Work | Trial | $1.50-4 | Scheduling simple | 4.5/5 |
| Connecteam | 10 users | ~$1-3.30 | All-in-one mobile | 4.8/5 |

**Ventaja de construir propio:**
- Sin coste recurrente por usuario (Supabase free tier cubre 30 users)
- Integracion directa con AI assistant, POS, inventario, CRM existentes
- Control total sobre 4 idiomas para staff holandes
- Flexibilidad estacional (sin pagar seats en invierno)
- Consistencia de marca con la plataforma web

---

## 3. Stack Tecnologico Recomendado

| Capa | Tecnologia | Razon |
|------|-----------|-------|
| Framework | Expo (managed + EAS Build) | OTA updates, no native code, QR testing |
| Navegacion | Expo Router | File-based (como Next.js), deep links auto |
| UI | NativeWind (Tailwind) | Equipo ya conoce Tailwind, dark mode nativo |
| Server state | TanStack Query | Cache, refetch, loading/error — para datos Supabase |
| Client state | Zustand + MMKV | Rapido, simple, almacenamiento encriptado |
| Offline DB | WatermelonDB | SQLite, sync engine integrado con Supabase |
| Auth | Supabase Auth + SecureStore | Reutiliza auth existente, RLS sin cambios |
| Real-time | Supabase Realtime | Updates en vivo de horarios/anuncios |
| Push | Expo Notifications + Supabase Edge Functions | Gratis, cross-platform, database-triggered |
| i18n | expo-localization + i18next | Deteccion automatica, reutiliza JSONs web |
| Forms | React Hook Form + Zod | Mismo patron que web |

---

## 4. Layout de la App — Tab Bar (5 tabs)

```
[ Home ]  [ Schedule ]  [ Hours ]  [ Chat ]  [ More ]
```

> **IMPORTANTE:** Clock in/out se hace UNICAMENTE desde la tablet del restaurante (kiosk con PIN).
> La app movil NO permite fichar. El tab "Hours" es solo visualizacion de horas trabajadas.

### Tab 1: Home
- Card "Next Shift": fecha, hora, countdown
- Anuncios del management (banner)
- Stats rapidos: horas esta semana, dias libres
- Widget de clima (critico para beach bar)
- Accesos rapidos a mis horas, horario, compartir

### Tab 2: Schedule
- Top: Franja horizontal de semana (Lun-Dom) con puntos de turnos
- Below: Lista scrollable de turnos del dia/semana seleccionado
- Color-coded por rol (kitchen=naranja, bar=azul, floor=verde, DJ=morado)
- Tap turno → detalle + opcion de swap
- Filtro: semana/mes

### Tab 3: Hours (central, solo lectura)
> Clock in/out se hace UNICAMENTE desde la tablet/kiosk del restaurante con PIN.
> Esta tab es solo para CONSULTAR horas trabajadas.

- Si esta fichado ahora: badge "Working" + timer en vivo (read-only, info del kiosk)
- Horas esta semana / este mes (netas, breaks descontados)
- Historial de fichajes: fecha, entrada, salida, breaks, duracion
- NO hay botones de fichar
- NO hay survey post-turno (eso ocurre en el kiosk al hacer clock-out)

### Tab 4: Chat
- Anuncios (unidireccional desde management)
- Chat de equipo (grupo general)
- Mensajes directos
- Push notifications por nuevos mensajes

### Tab 5: More
- Mi Perfil (editar nombre, telefono, avatar, idioma)
- Disponibilidad (semanal recurrente + bloqueos)
- Solicitudes de vacaciones
- Documentos (contratos, nominas)
- Formacion/Recursos
- Ajustes (notificaciones, tema, idioma)
- Cerrar sesion

---

## 5. Push Notifications — Estrategia

### Cuando enviar (por prioridad):

**Tier 1 — Inmediatas:**
- Solicitud de swap recibida/aprobada/rechazada
- Cambio en tu turno (hora, cancelacion)
- Clock-in reminder perdido (10 min post-inicio)

**Tier 2 — Oportunas (respeta DND 22:00-07:00):**
- Horario publicado (semanal)
- Reminder de turno: 2h antes
- Nuevo anuncio del management
- Solicitud de vacaciones aprobada/rechazada

**Tier 3 — Baja prioridad (digest diario o in-app only):**
- Nuevo documento subido
- Mensajes de chat (configurable)
- Resumen semanal de horas

### Limites: max 1-2 push/dia, max 8-10/semana

### Implementacion: Supabase DB Webhook → Edge Function → Expo Push API → APNs/FCM

### GDPR: opt-in explicito, toggles por categoria, right to withdraw, eliminar tokens al dejar empresa

---

## 6. Fases de Desarrollo

### Fase 1 — MVP (4-6 semanas)
- Auth (login con credenciales Supabase existentes)
- Home screen con next shift + anuncios
- Schedule viewing (mi semana/mes)
- My Hours: visualizacion de horas trabajadas + historial de fichajes (SOLO LECTURA)
- Push notifications (shift reminders + schedule published)
- Profile management (nombre, telefono, avatar, idioma)
- Anadir turno al calendario iOS
- Compartir horario por WhatsApp/share sheet
- 4 idiomas (NL/EN/ES/DE)
- Dark/light mode

> NOTA: Clock in/out NO esta en la app. Se hace desde la tablet del restaurante (kiosk con PIN).

### Fase 2 (4 semanas)
- Shift swap requests
- Time off requests
- Availability setting
- Anuncios del equipo
- Task lists (ver/completar tareas asignadas)

### Fase 3 (4 semanas)
- Team chat (grupo + DMs)
- Document access (contratos, nominas)
- Tip tracking
- Offline mode (WatermelonDB sync)
- Guia de info rapida (menu, eventos, politicas — solo lectura, sin AI chat)

---

## 8. Estrategia de IA — Separada de la App Movil

**Decision:** NO incluir el AI assistant en la app movil. La IA es infraestructura de gestion, no un chatbot para empleados.

### WhatsApp Agentic Assistant (proyecto separado)
- **Stack:** Anthropic Agent SDK + WhatsApp Business API webhook
- **Uso:** El owner/manager envia mensajes a WhatsApp → el agente ejecuta tareas
- **Capacidades:**
  - Generacion automatica de horarios (basado en preferencias, historial, demanda)
  - CRUD de empleados, turnos, eventos via API endpoints existentes
  - Consulta de KPIs, stock, reservas, ventas
  - Acceso a documentacion del negocio
- **Arquitectura:** WhatsApp webhook → Supabase Edge Function → Agent SDK → Next.js API routes
- **NO es para empleados**, solo para gestion

### En la app movil para empleados:
- Guia de informacion rapida (solo lectura)
- Horarios descargables
- Info del negocio (menu, eventos, politicas)
- Sin herramientas de escritura, sin chat con IA

---

## 7. Integracion con Backend Existente

### Lo que NO cambia:
- Supabase Auth — mismas credenciales, mismos JWTs
- RLS policies — funcionan identico desde mobile
- API routes de Next.js — la app mobile las consume via fetch
- DB schema — sin cambios

### Lo que se anade:
- Tabla `push_tokens` (user_id, token, platform)
- Supabase Edge Functions para triggers de push
- Endpoints optimizados para mobile (menos datos, paginacion eficiente)

### Arquitectura:

```
[React Native App]
    ↓ Supabase Auth (JWT)
    ↓ Supabase Realtime (WebSocket)
    ↓ Next.js API Routes (REST)
    ↓ Supabase DB (PostgreSQL + RLS)
```

La app movil se conecta al MISMO backend que la web — sin duplicar APIs.
