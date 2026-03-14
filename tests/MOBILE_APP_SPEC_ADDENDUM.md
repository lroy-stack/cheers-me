# ADDENDUM: Correcciones al Development Spec

**Fecha:** 2026-03-14
**Aplica a:** MOBILE_APP_DEVELOPMENT_SPEC.md + ANALYSIS_MOBILE_APP_RN.md

---

## CORRECCION CRITICA: Clock In/Out NO esta en la app movil

### Regla

**Clock in/out se realiza UNICAMENTE desde la tablet del restaurante (kiosk con PIN).**
La app movil NO permite fichar. Esto es una decision de negocio firme.

### Razon

- La tablet esta fisicamente en el restaurante → geofence implicito
- Autenticacion con usuario kiosk dedicado + Turnstile anti-fraude
- PIN personal de cada empleado → previene buddy punching
- Control centralizado → el manager ve quien ficha en tiempo real
- Cumplimiento normativo español → registro en punto fijo

### Lo que cambia en el spec

| Antes (INCORRECTO) | Ahora (CORRECTO) |
|---------------------|-------------------|
| Tab 3: "Clock" con botones Clock In/Out | Tab 3: **"Hours"** — solo visualizacion |
| `clock.tsx` con ClockButton, BreakToggle, GeolocationIndicator | `hours.tsx` con HoursSummary, ClockHistory (read-only) |
| `lib/api/clock.ts` con clockIn(), clockOut(), startBreak() | `lib/api/clock.ts` con getClockStatus(), getClockHistory() (solo GET) |
| `stores/clock-store.ts` con pendingClockIn/Out | **ELIMINAR** — no hay acciones de clock pendientes |
| Offline queue para clock actions | **ELIMINAR** — no hay clock actions offline |
| Post-shift survey en la app | **NO** — el survey ocurre en el kiosk al hacer clock-out |
| Geolocation para clock-in | **NO** — geolocation no es necesaria en la app |
| "Clock In Now" push action button | **NO** — reemplazar por "View Schedule" |

### Tab "Hours" — Especificacion corregida

**Route:** `/(tabs)/hours`
**Nombre:** My Hours
**Tipo:** Solo lectura

**Contenido:**

1. **Status card (si esta fichado)**
   - Badge "Working" verde + hora de entrada
   - Timer en vivo (lee de `clock_in_out` via Supabase Realtime)
   - Turno vinculado (tipo + horas programadas)
   - Es informativo — el empleado ve que esta fichado pero no puede fichar desde aqui

2. **Resumen de horas**
   - Esta semana: X horas Y minutos (netas, breaks descontados)
   - Este mes: X horas Y minutos
   - Calculado desde `clock_in_out` + `clock_breaks` via API GET

3. **Historial de fichajes**
   - Lista scrollable de los ultimos 50 registros
   - Cada registro: fecha, hora entrada, hora salida, breaks, duracion total
   - Status badge: "Completed" o "Active" (si aun fichado)
   - Pull-to-refresh

4. **NO tiene:**
   - Boton de Clock In/Out
   - Boton de Start/End Break
   - Survey post-turno
   - Geolocation indicator
   - Grace period warnings

**Data sources (solo GET):**
- `GET /api/staff/clock?employee_id={id}` — historial
- Supabase Realtime subscription en `clock_in_out` para status activo

### Tabs corregidas

```
[ Home ]  [ Schedule ]  [ Hours ]  [ Chat ]  [ More ]
```

### Quick Actions del Home corregidas

| Antes | Ahora |
|-------|-------|
| Clock In/Out (clock icon + green dot) | **My Hours** (clock icon, read-only) |
| My Tasks | My Tasks (sin cambio) |
| Swap Shift | Swap Shift (sin cambio) |
| Leave | Leave (sin cambio) |

### Push Notification Actions corregidas

| Tipo | Antes | Ahora |
|------|-------|-------|
| `shift_reminder` | Boton "Clock In Now" | Boton **"View Schedule"** |
| `clock_in_missed` | **ELIMINAR** — no aplica si el clock-in es en kiosk | Reemplazar por **"Reminder: Your shift started"** (informativo, sin accion) |

### Offline Queue corregida

Eliminar de la cola offline:
- ~~clock_in~~
- ~~clock_out~~
- ~~break_start~~
- ~~break_end~~

Solo quedan en la cola offline:
- leave_request
- swap_request
- availability
- (survey se elimina tambien — ocurre en kiosk)

### Archivos del proyecto que cambian

| Archivo spec | Cambio |
|-------------|--------|
| `app/(tabs)/clock.tsx` | Renombrar a `hours.tsx` |
| `components/clock/clock-button.tsx` | **ELIMINAR** |
| `components/clock/break-toggle.tsx` | **ELIMINAR** |
| `components/clock/geolocation-indicator.tsx` | **ELIMINAR** |
| `components/clock/shift-timer.tsx` | Mantener (read-only timer) |
| `components/clock/clock-summary.tsx` | Renombrar a `hours-summary.tsx` |
| `lib/api/clock.ts` | Solo funciones GET (getClockStatus, getClockHistory) |
| `hooks/use-clock-status.ts` | Solo lee status, no modifica |
| `stores/clock-store.ts` | **ELIMINAR** |
| `stores/offline-queue.ts` | Remover tipos clock_in/out/break |

---

## NOTA: Kiosk vs App

| Aspecto | Kiosk (tablet) | App movil |
|---------|---------------|-----------|
| Clock in/out | SI | NO |
| Breaks | SI | NO (solo ve) |
| Survey post-turno | SI | NO |
| PIN authentication | SI | NO (usa email/password) |
| Geofence | Implicito (tablet en restaurante) | No necesario |
| Ver horario | NO (solo fichaje) | SI |
| Ver horas trabajadas | Resumen basico | Completo con historial |
| Push notifications | NO | SI |
| Compartir horario | NO | SI |
| Calendario iOS | NO | SI |
