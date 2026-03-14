# Analisis: Sistema de Horarios (/staff/schedule)

**Fecha:** 2026-03-14
**Estado:** Auditoria completa de arquitectura, datos reales, y gaps

---

## 1. Arquitectura Actual

### 1.1 Tamaño del Sistema

| Componente | Lineas |
|-----------|--------|
| `use-schedule-grid.ts` (hook principal) | 683 |
| `schedule/page.tsx` | 370 |
| 11 componentes en `components/staff/schedule/` | ~1700 |
| `schedule-validation.ts` | 256 |
| 6 API routes en `schedule-plans/` | ~500 |
| 2 API routes en `shifts/` | ~200 |
| **TOTAL** | ~3700 lineas |

### 1.2 Tablas DB (datos reales)

```
schedule_plans (5 registros)
  ├── id, week_start_date, status (draft/published), version, notes
  ├── created_by, published_at, published_by, copied_from_plan_id
  └── 1:N → shifts (via schedule_plan_id)

shifts (19 registros)
  ├── id, employee_id, date, shift_type (morning/afternoon/night/split)
  ├── start_time, end_time, break_duration_minutes
  ├── status (scheduled/completed/cancelled), is_day_off
  ├── second_start_time, second_end_time (para turnos split, varchar)
  ├── schedule_plan_id (FK, nullable), notes
  └── Referenced by: clock_in_out, shift_sales, shift_tips, shift_swap_requests, zone_assignments

schedule_plan_history (4 registros)
  ├── id, schedule_plan_id, action, changed_by, changes (JSONB)
  └── Solo registra publicaciones, NO cambios granulares

shift_templates (0 registros)
  ├── id, name, shift_type, start_time, end_time, break_duration_minutes
  └── Nunca se han creado plantillas

shift_swap_requests (0 registros)
  ├── id, shift_id, requested_by, offered_to, status, reason
  └── Sistema de intercambio de turnos (sin uso)

availability (0 registros)
  ├── id, employee_id, date, available (bool), notes
  └── Disponibilidad de empleados (sin uso)
```

### 1.3 Datos Reales — Problemas Detectados

**Problema 1: Turnos duplicados**
Pablo Waiter tiene turnos duplicados en practicamente todos los dias:
- 2026-02-10: 2 turnos identicos (afternoon 17:00-02:00)
- 2026-02-11: 2 turnos identicos (morning 10:00-18:00)
- 2026-02-12: 2 turnos identicos (night 19:00-03:00)
- 2026-02-13: 2 turnos identicos (afternoon 17:00-02:00)
- 2026-02-14: 2 turnos identicos (day off)

Anna Bar tambien tiene duplicados en 2026-02-12 y 2026-02-13.

**Causa probable:** Las versiones del plan (v1→v4 para semana 2026-02-09) NO borran los turnos de versiones anteriores. Al crear v2/v3/v4, el sistema creaba nuevos shifts sin eliminar los de la version anterior. Los planes v1 (0 shifts), v2 (0 shifts), v3 (7 shifts), v4 (11 shifts) sugieren que se fueron acumulando.

**Problema 2: Schedule plan v1-v2 vacios**
Las versiones 1 y 2 de la semana 2026-02-09 tienen 0 shifts. Esto sugiere que se crearon planes vacios al hacer "Save Draft" repetidamente antes de añadir turnos.

**Problema 3: Week 2026-03-09 en draft sin shifts**
Hay un plan draft para la semana actual (2026-03-09) con 0 shifts. Creado pero nunca usado.

**Problema 4: Day-off shifts con 00:00-00:00**
Los dias libres se almacenan como shifts con start_time=00:00 y end_time=00:00. Funciona pero es semanticamente confuso — un dia libre no deberia tener horas.

### 1.4 API Endpoints

| Endpoint | Metodo | Funcion |
|----------|--------|---------|
| `/api/staff/schedule-plans` | GET | Busca plan por week_start_date (ultimo version) |
| `/api/staff/schedule-plans` | POST | Crea nuevo plan (auto-incrementa version) |
| `/api/staff/schedule-plans/[id]` | GET | Plan + sus shifts |
| `/api/staff/schedule-plans/[id]/sync` | POST | Bulk create/update/delete shifts para un plan |
| `/api/staff/schedule-plans/[id]/publish` | POST | Cambia status a published, registra en history |
| `/api/staff/schedule-plans/[id]/copy` | POST | Copia plan a otra semana |
| `/api/staff/schedule-plans/[id]/validate` | POST | Valida contra restricciones laborales |
| `/api/staff/shifts` | GET/POST | CRUD individual de shifts |
| `/api/staff/shifts/[id]` | GET/PATCH/DELETE | CRUD individual de shift |

### 1.5 Frontend Features

| Feature | Componente | Estado |
|---------|-----------|--------|
| Grid semanal (Lun-Dom x empleados) | `ScheduleGrid` + `ScheduleRow` + `ScheduleCell` | Funcional |
| Tipos de turno (M/T/N/P/D) con click | `ScheduleCell` + `setCellType` | Funcional |
| Save Draft | `useScheduleGrid.saveDraft()` | Funcional (con bugs) |
| Publish | `useScheduleGrid.publish()` | Funcional |
| Copy Previous Week | `useScheduleGrid.copyPreviousWeek()` | Funcional |
| Undo/Redo (Ctrl+Z/Y) | Reducer con undo/redo stacks (max 20) | Funcional |
| Keyboard shortcut Ctrl+S | Event listener | Funcional |
| Stats panel (total hours, violations) | `ScheduleStatsPanel` | Funcional |
| Violations panel (labor law checks) | `ScheduleViolationsPanel` | Funcional |
| Print view (CSS print mode) | `SchedulePrintView` | Funcional |
| Excel export | `schedule-excel-export.ts` | Funcional |
| Shift form dialog (custom times) | `ShiftFormDialog` | Funcional |
| Monthly registry view | `MonthlyRegistryView` | Presente |
| Leave management tab | `LeaveManagementView` | Presente |
| Department grouping (by role) | `DepartmentGroup` | Funcional |
| Shift templates (DB-configurable) | Leidos via `useRestaurantSettings` | Parcial (0 templates en DB) |
| Drag & drop shifts | — | NO EXISTE |
| Shift swap requests | DB tabla existe | NO HAY UI |
| Employee availability | DB tabla existe | NO HAY UI |

### 1.6 Validaciones Implementadas

El sistema valida ANTES de publicar:
1. **Max weekly hours** — error si > maxWeeklyHours (configurable)
2. **Min rest between shifts** — error si < 12h entre turnos
3. **Min days off per week** — error si < minDaysOffPerWeek
4. **Leave conflict** — error si turno cae en vacaciones aprobadas
5. **Availability conflict** — error si turno cae en dia no disponible
6. **Sunday coverage** — warning si nadie trabaja un domingo
7. **Split shift support** — calcula horas de second_start_time/second_end_time
8. **Overtime warning** — warning si se acerca al limite

---

## 2. Gaps y Bugs

### BUG 1: Turnos duplicados entre versiones (CRITICO)
**Causa:** Cuando se crea una nueva version de un plan ya publicado, `saveDraft()` re-crea TODOS los shifts del plan anterior (lineas 363-378 de use-schedule-grid.ts) pero NO elimina los shifts de la version anterior que estan vinculados al plan viejo.
**Impacto:** Empleados aparecen con turnos dobles, distorsiona calculo de horas, confunde el sistema de clock-in (multiples shifts para el mismo dia).
**Solucion:** La query de auto-link shift (`shifts.eq('employee_id', X).eq('date', today).single()`) puede fallar si hay multiples shifts. Necesita `.limit(1)` o deduplicacion.

### BUG 2: confirm() nativo en Publish
**Archivo:** `page.tsx:139`
**Codigo:** `if (!confirm('Publish this schedule? Staff will be able to see it.')) return`
**Impacto:** Usa ventana nativa del browser (el usuario pidio eliminar todos los confirm nativos).
**Solucion:** Reemplazar con ConfirmDialog.

### GAP 1: No hay historial visible de versiones anteriores
**Estado actual:** `schedule_plan_history` solo guarda publicaciones. No hay UI para ver versiones anteriores ni revertir.
**Impacto:** Si se publica un schedule equivocado, no hay rollback.

### GAP 2: No hay notificacion a empleados al publicar
**Estado actual:** El trigger `notify_schedule_published` existe en DB pero no hay canal de comunicacion visible (no push, no email, no in-app notification).
**Impacto:** Empleados no saben cuando se publica su horario.

### GAP 3: Shift templates vacios
**Estado actual:** 0 templates en DB. Los templates se leen de `restaurant_settings` via `useRestaurantSettings()` como JSON, no de la tabla `shift_templates`.
**Impacto:** La tabla `shift_templates` esta desconectada del sistema. Los templates reales viven en `restaurant_settings.shift_templates` como JSONB.

### GAP 4: Shift swap requests — sin UI
**Estado actual:** Tabla + RLS + trigger de notificacion existen. No hay pagina ni componente.
**Impacto:** Empleados no pueden solicitar intercambios de turno.

### GAP 5: Availability — sin UI
**Estado actual:** Tabla + RLS existen. No hay pagina ni componente para que empleados marquen disponibilidad.
**Impacto:** Managers no pueden ver disponibilidad al crear horarios.

### GAP 6: Convenio Baleares no implementado en validaciones
**Estado actual:** Las validaciones usan constantes genericas (maxWeeklyHours, minRestBetweenShifts). No implementan reglas especificas:
- Max 1.776 horas/año (no se trackea anual)
- Min 2h descanso entre turnos split (solo valida 12h entre jornadas, no entre partes de split)
- 5 dias antelacion para comunicar horarios
- Turno continuo > 6h requiere pausa (ya existe en clock pero no en schedule validation)

### GAP 7: No hay vista "My Schedule" con turnos futuros vs pasados
**Estado actual:** `/staff/my-schedule` existe pero no se audito aqui. Los empleados deberian poder ver sus proximos turnos y los pasados con horas reales vs programadas.

---

## 3. Flujo Actual (como funciona hoy)

```
1. Manager va a /staff/schedule
2. Selecciona semana con navigation (< Prev | Week of Mar 9 | Next >)
3. Ve grid: Departamentos > Empleados > 7 columnas (Lun-Dom)
4. Click en celda → cicla tipo: null → M → T → N → P → D → null
5. Cada click genera pendingChanges en el reducer (in-memory)
6. "Save Draft" → POST /schedule-plans (crea plan si no existe) → POST /sync (bulk shifts)
7. "Publish" → guarda primero si dirty → POST /publish (cambia status, registra history)
8. "Copy Previous Week" → busca plan de semana anterior → POST /copy
9. Undo/Redo → reducer stack, max 20 pasos
10. Validation → calcula en frontend via schedule-validation.ts
11. Print → window.print() con CSS @media print
12. Excel → ExcelJS genera archivo .xlsx
```

---

## 4. Archivos del Sistema

| Archivo | Lineas | Funcion |
|---------|--------|---------|
| `src/app/staff/schedule/page.tsx` | 370 | Pagina principal |
| `src/hooks/use-schedule-grid.ts` | 683 | Hook central: state, reducer, API calls |
| `src/lib/utils/schedule-validation.ts` | 256 | Validacion laboral |
| `src/lib/utils/schedule-excel-export.ts` | ~200 | Export Excel |
| `src/lib/constants/schedule.ts` | ~100 | Shift types, colors, labor constraints |
| `src/components/staff/schedule/schedule-grid.tsx` | ~150 | Grid wrapper |
| `src/components/staff/schedule/schedule-row.tsx` | ~100 | Fila de empleado |
| `src/components/staff/schedule/schedule-cell.tsx` | ~120 | Celda clickeable |
| `src/components/staff/schedule/schedule-toolbar.tsx` | ~200 | Barra herramientas |
| `src/components/staff/schedule/schedule-page-header.tsx` | ~80 | Header con navigation |
| `src/components/staff/schedule/schedule-stats-panel.tsx` | ~100 | Stats cards |
| `src/components/staff/schedule/schedule-violations-panel.tsx` | ~80 | Panel de violaciones |
| `src/components/staff/schedule/schedule-print-view.tsx` | ~150 | Vista impresion |
| `src/components/staff/schedule/monthly-registry-view.tsx` | ~150 | Vista mensual |
| `src/components/staff/schedule/leave-management-view.tsx` | ~150 | Gestion de vacaciones |
| `src/components/staff/schedule/department-group.tsx` | ~80 | Agrupacion por departamento |
| `src/components/staff/shift-form-dialog.tsx` | ~250 | Dialog para turno custom |
| `src/components/staff/shift-card.tsx` | ~80 | Card de turno |
| `src/app/api/staff/schedule-plans/route.ts` | 142 | GET/POST planes |
| `src/app/api/staff/schedule-plans/[id]/route.ts` | ~80 | GET plan individual |
| `src/app/api/staff/schedule-plans/[id]/sync/route.ts` | ~120 | Sync bulk shifts |
| `src/app/api/staff/schedule-plans/[id]/publish/route.ts` | ~60 | Publicar plan |
| `src/app/api/staff/schedule-plans/[id]/copy/route.ts` | ~80 | Copiar plan |
| `src/app/api/staff/schedule-plans/[id]/validate/route.ts` | 86 | Validar plan |
| `src/app/api/staff/shifts/route.ts` | ~100 | CRUD shifts |
| `src/app/api/staff/shifts/[id]/route.ts` | ~100 | CRUD shift individual |

---

## 5. Resumen de Prioridades

| # | Issue | Severidad | Tipo |
|---|-------|-----------|------|
| 1 | Turnos duplicados entre versiones de plan | CRITICO | Bug |
| 2 | confirm() nativo en Publish | MEDIO | Bug (UX) |
| 3 | Sin historial/rollback de versiones | ALTO | Gap |
| 4 | Sin notificacion a empleados al publicar | ALTO | Gap |
| 5 | Shift templates desconectados | BAJO | Gap |
| 6 | Shift swap requests sin UI | MEDIO | Gap |
| 7 | Employee availability sin UI | MEDIO | Gap |
| 8 | Convenio Baleares no completo en validaciones | ALTO | Gap (legal) |
| 9 | Auto-link clock-in puede fallar con duplicados | CRITICO | Bug |
