# Analisis: Pipeline Shift → Clock → Feedback

**Fecha:** 2026-03-14
**Estado:** Analisis de arquitectura actual + gaps + investigacion normativa + mejores practicas

---

## 1. Arquitectura Actual (DB Real)

### 1.1 Tablas y Relaciones

```
schedule_plans (4 registros)
  ├── id, week_start_date, status (draft/published), version
  └── 1:N → shifts

shifts (19 registros)
  ├── id, employee_id (FK→employees), date, shift_type, start_time, end_time
  ├── break_duration_minutes (pausas previstas), status, schedule_plan_id
  ├── is_day_off, second_start_time/end_time (turnos split)
  └── 1:N → clock_in_out (via shift_id, NULLABLE)

clock_in_out (14 registros)
  ├── id, employee_id (FK→employees), shift_id (FK→shifts, NULLABLE)
  ├── clock_in_time, clock_out_time (NULL = aun trabajando)
  ├── metadata (JSONB: IP, user_agent, geolocation)
  └── 1:N → clock_breaks
  └── 1:1 → shift_survey_responses

clock_breaks (5 registros)
  ├── id, clock_record_id (FK→clock_in_out)
  ├── start_time, end_time (NULL = pausa activa)
  └── Indices: idx_clock_breaks_active (WHERE end_time IS NULL)

shift_survey_responses (1 registro)
  ├── id, clock_record_id (FK→clock_in_out, UNIQUE), employee_id
  ├── rating (1-5 CHECK), feedback (texto libre)
  ├── shift_type, worked_minutes, scheduled_minutes
  ├── variance_minutes, break_variance_minutes
  ├── anomaly_type, anomaly_reason, anomaly_comment
  ├── ai_analysis (JSONB: sentiment, themes, suggestions)
  ├── manager_reviewed, manager_reviewed_by, manager_reviewed_at, manager_notes
  └── Indices: idx_survey_flagged (rating <= 2), idx_survey_unreviewed
```

### 1.2 Datos Reales Observados

**Problema critico:** De 14 registros de clock_in_out, solo 1 tiene `shift_id` vinculado. Los otros 13 son clock-ins sin turno asignado. Esto significa que:
- Los empleados hacen clock-in SIN que el sistema vincule automaticamente a su turno del dia
- No se puede calcular varianza horaria si no hay vinculo shift↔clock

**Unico survey existente:**
- Rating: 3/5 (neutral)
- Feedback: "Logis y no estabamos preparados para ese Bus"
- worked_minutes: 0 (no calculado)
- scheduled_minutes: NULL (no tenia turno vinculado)
- variance_minutes: NULL
- Ya fue revisado por manager

### 1.3 Funciones DB Relevantes

| Funcion | Uso |
|---------|-----|
| `prevent_clock_modification` | Trigger BEFORE UPDATE: impide modificar registros cerrados |
| `notify_schedule_published` | Trigger AFTER INSERT/UPDATE en shifts: notifica al publicar |
| `notify_shift_swap_request` | Trigger en shift_swap_requests |
| `get_employee_id()` | Helper RLS: retorna employee_id del usuario autenticado |
| `get_user_role()` | Helper RLS: retorna rol del usuario |

### 1.4 API Endpoints Existentes

| Endpoint | Metodo | Funcion |
|----------|--------|---------|
| `/api/staff/clock?action=in` | POST | Clock-in con geolocation opcional |
| `/api/staff/clock?action=out` | POST | Clock-out, auto-cierra breaks activos |
| `/api/staff/clock` | GET | Lista registros con paginacion, filtros, CSV |
| `/api/staff/clock/break` | POST | Start/end break |
| `/api/staff/surveys` | GET | Lista surveys (managers only) |
| `/api/staff/surveys/[id]` | PATCH? | Revision de manager |

### 1.5 Frontend Existente

| Pagina | Componente | Estado |
|--------|-----------|--------|
| `/staff/clock` | TimeClock (clock in/out/break) | Funcional pero sin vinculo a shift |
| `/staff/feedback` | ShiftSurveyDashboard | Dashboard de manager para revisar surveys |
| `/staff/my-schedule` | MySchedule + MyHoursSummary | Vista del empleado de sus turnos |
| `/staff/schedule` | Schedule admin | Crear/publicar turnos semanales |

---

## 2. Gaps Identificados

### GAP 1: Clock-in NO vincula automaticamente al turno del dia (CRITICO)
**Estado actual:** `shift_id` es opcional en clock-in. El frontend NO busca el turno del dia del empleado.
**Impacto:** Sin vinculo shift↔clock, es imposible calcular horas extra, pausas excesivas, o generar preguntas inteligentes de feedback.
**Solucion:** Al hacer clock-in, el API debe buscar automaticamente el turno asignado para ese empleado en la fecha actual y vincularlo.

### GAP 2: No existe formulario de feedback post-jornada para el EMPLEADO
**Estado actual:** Solo existe el dashboard de manager (`ShiftSurveyDashboard`). No hay UI para que el empleado envie su feedback al hacer clock-out.
**Impacto:** El unico registro de survey fue creado manualmente/via test. No hay flujo automatico.
**Solucion:** Al hacer clock-out, mostrar un formulario modal con:
- Rating (1-5 emojis)
- Si hubo anomalia de horas (calculada automaticamente)
- Pregunta contextual: "Hoy trabajaste X min mas de lo asignado. ¿Por que?"
- Estado de animo libre (texto)
- Boton "Skip" (es opcional)

### GAP 3: No hay calculo automatico de varianza horaria
**Estado actual:** `shift_survey_responses` tiene campos `worked_minutes`, `scheduled_minutes`, `variance_minutes`, `break_variance_minutes` pero NO se calculan automaticamente.
**Impacto:** Los campos estan a 0 o NULL en el unico registro existente.
**Solucion:** Al clock-out, calcular:
- `scheduled_minutes` = shift.end_time - shift.start_time - shift.break_duration_minutes
- `worked_minutes` = clock_out_time - clock_in_time - SUM(breaks)
- `variance_minutes` = worked_minutes - scheduled_minutes
- `break_variance_minutes` = actual_break_total - shift.break_duration_minutes

### GAP 4: No hay API POST para crear survey desde el empleado
**Estado actual:** Solo hay GET (listar) y PATCH (manager review). Falta endpoint POST para que el empleado cree su feedback.
**Impacto:** Imposible guardar feedback sin endpoint.
**Solucion:** `POST /api/staff/surveys` con Zod schema + RLS que solo permita crear para tus propios clock records.

### GAP 5: No hay INSERT policy en shift_survey_responses
**Estado actual:** Solo existen policies SELECT y UPDATE (manager). Falta INSERT policy.
**Impacto:** Un empleado no puede crear su survey via RLS.
**Solucion:** Anadir policy INSERT que permita al empleado crear survey para sus propios clock_record_id.

### GAP 6: Turnos split no se calculan correctamente
**Estado actual:** `shifts` tiene `second_start_time` y `second_end_time` (varchar) para turnos partidos, pero el calculo de horas programadas no los tiene en cuenta.
**Impacto:** Un turno 10:00-14:00 + 18:00-22:00 calcularia solo las primeras 4h.

### GAP 7: No hay deteccion de clock-in sin turno asignado
**Estado actual:** Se permite hacer clock-in cualquier dia sin verificar si hay turno.
**Impacto:** No es bloqueante (un empleado puede necesitar fichar extra), pero deberia generar un warning o anotacion.

---

## 3. Flujo Objetivo

```
1. Manager crea schedule_plan (semanal) → asigna shifts a empleados
2. Empleado llega → clock-in (sistema auto-vincula shift_id del dia)
   - Si no hay turno: warning "No tienes turno hoy" (permite clock-in igual)
3. Durante la jornada → start_break / end_break (N breaks posibles)
4. Empleado sale → clock-out
   - Sistema calcula:
     a. worked_minutes (total fichado - breaks)
     b. scheduled_minutes (del turno asignado)
     c. variance_minutes (diferencia)
     d. break_variance_minutes (pausas reales vs asignadas)
   - Si hay anomalia (varianza > 15 min):
     → Formulario contextual con pregunta inteligente
     → Ejemplo: "Hoy trabajaste 1h30m mas (8h30 vs 7h00 asignadas). ¿Cual fue el motivo?"
     → Opciones de anomaly_reason: extra_workload, event, understaffed, personal, other
   - Si no hay anomalia:
     → Formulario simple: rating (1-5) + comentario opcional
5. Feedback guardado → visible en /staff/feedback para managers
   - Ratings <= 2 se marcan como flagged
   - Manager puede revisar, añadir notas, marcar como revisado
```

---

## 4. Archivos a Modificar/Crear

| Archivo | Accion | Descripcion |
|---------|--------|-------------|
| `src/app/api/staff/clock/route.ts` | MODIFICAR | Clock-in: auto-vincular shift_id. Clock-out: calcular varianza |
| `src/app/api/staff/surveys/route.ts` | MODIFICAR | Anadir POST para que empleados creen feedback |
| `src/components/staff/post-shift-feedback.tsx` | CREAR | Modal de feedback post clock-out |
| `src/app/staff/clock/page.tsx` (o componente clock) | MODIFICAR | Mostrar modal de feedback tras clock-out |
| DB: shift_survey_responses | MIGRAR | Anadir INSERT policy para empleados |

---

## 5. Prioridad de Implementacion

1. **Auto-vinculacion shift↔clock** — sin esto nada funciona
2. **Calculo de varianza** — core del sistema inteligente
3. **INSERT policy en DB** — prerequisito para guardar feedback
4. **POST API surveys** — endpoint para guardar
5. **UI Post-shift feedback** — formulario contextual
6. **Integracion en clock-out flow** — mostrar formulario al fichar salida

---

## 6. Marco Legal y Normativo

### 6.1 Real Decreto-ley 8/2019 (Vigente)

Desde mayo 2019, TODAS las empresas en Espana deben registrar inicio y fin de jornada de cada empleado:
- **Que registrar:** Hora inicio, hora fin, pausas (recomendado, obligatorio desde 2026)
- **Retencion:** 4 anos, disponible inmediatamente para Inspeccion de Trabajo
- **Sanciones actuales:** EUR 60 - 6.250 por infraccion

### 6.2 Reforma 2026: Registro Digital Obligatorio

Nuevo Real Decreto (borrador octubre 2025) introduce cambios criticos:
- **Solo digital:** Hojas de papel, Excel y registros manuales PROHIBIDOS
- **Acceso remoto en tiempo real:** Inspeccion de Trabajo puede consultar sin previo aviso
- **Precision al minuto:** Inicio, fin, pausas, horas extra con detalle
- **A prueba de manipulacion:** Sistema objetivo, fiable y accesible
- **Sanciones POR TRABAJADOR:** EUR 1.000 - 10.000 por empleado
- **Jornada 37,5h semanales** (reduccion desde 40h)

### 6.3 GDPR / LOPDGDD — Datos de Empleados

- **Base legal:** Art. 6(1)(c) GDPR — obligacion legal del empleador
- **Minimizacion:** Solo datos estrictamente necesarios
- **Notificacion:** Empleados deben ser informados de que datos se recopilan, para que, cuanto se retienen
- **Foto en clock-in:** Una foto simple para revision humana NO es dato biometrico (Recital 51 GDPR). Reconocimiento facial automatico SI lo es y la AEPD lo prohibe
- **Geolocalizacion:** Legal solo en el momento puntual de clock-in/out, NO rastreo continuo
- **DPIA obligatoria** si se usa biometria

### 6.4 Convenio Hosteleria Baleares XVII (2025-2028)

| Regla | Requisito |
|-------|-----------|
| Horas anuales max | 1.776 horas efectivas |
| Turnos partidos | Max 2 al dia, min 2h cada turno, min 2h descanso entre turnos |
| Descanso entre jornadas | Min 12 horas |
| Descanso semanal | 1,5 dias continuos |
| Turno continuo > 6h | Pausa minima 15 minutos |
| Menores de 18 | Pausa minima 30 min si turno > 4,5h |
| Comunicacion horarios | Min 5 dias de antelacion |
| Temporada alta | Turnos hasta 12h permitidos |

---

## 7. Mejores Practicas del Mercado

### 7.1 Ventana de Clock-in (Grace Period)

| Plataforma | Ventana default | Configurable? |
|-----------|-----------------|---------------|
| When I Work | 15 min antes | Si: 0, 5, 15, 30 min |
| Sling (Toast) | 5 min antes | Si |
| Deputy | Configurable (hasta 60 min) | Si, por local |
| Connecteam | X min antes del turno | Si |
| Homebase | Toggle prevencion clock-in temprano | Si |

**Patrones comunes:**
1. **Bloqueo duro:** No puede fichar hasta que abre la ventana (mas comun)
2. **Warning + permitir:** Avisa pero deja fichar, flaggea para manager
3. **Override manager:** Clock-in temprano requiere PIN de manager
4. **Auto-rounding:** EVITAR en Espana — la reforma 2026 exige precision al minuto

**Recomendacion:** Ventana configurable 10-15 min. Registrar hora REAL, nunca redondear. Flags para revision.

### 7.2 Prevencion de Fraude (Buddy Punching)

| Metodo | Legalidad Espana | Complejidad | Sistemas |
|--------|-----------------|-------------|----------|
| PIN unico | Legal | Baja | Todos |
| Foto en clock-in (revision humana) | Legal con aviso | Media | Homebase, Buddy Punch, Connecteam |
| Reconocimiento facial | PROHIBIDO por AEPD | Alta | — |
| Geolocalizacion puntual | Legal con condiciones | Media | Deputy, Connecteam |
| IP/WiFi del restaurante | Legal | Baja | Connecteam, Buddy Punch |
| Device ID | Legal | Media | MDM solutions |

**Decision clave:** PIN + Foto (sin reconocimiento automatico) es el enfoque mas seguro legalmente.
- La AEPD multo EUR 27.000+ a un gimnasio por usar reconocimiento facial para control horario (mayo 2024)
- Una foto para revision humana NO es dato biometrico segun Recital 51 GDPR
- Consentimiento del empleado NO es base legal valida (desequilibrio de poder)

### 7.3 Proteccion del Kiosk (Ruta Publica)

**Modelo dos capas (patron Toast/Square/Clover):**

1. **Nivel dispositivo** (configurado una vez por manager):
   - Credenciales de negocio autentican el dispositivo
   - Persiste entre turnos de empleados
   - Solo se re-autentica tras reinicio del dispositivo
   - Establece a que local pertenece el dispositivo

2. **Nivel empleado** (por cada clock-in):
   - PIN simple (4-8 digitos)
   - Entrada rapida para alto volumen
   - Determina identidad individual

**Opciones para proteger /kiosk en nuestra PWA:**

| Opcion | Descripcion | Pros | Contras |
|--------|-------------|------|---------|
| Kiosk token | Token unico por dispositivo en localStorage | Simple, sin login | Token puede copiarse |
| Usuario kiosk dedicado | User "kiosk@cheers" que desbloquea la ruta | Familiar, auditable | Requiere gestion de sesion |
| IP/red WiFi | Solo permite acceso desde la WiFi del restaurante | Transparente | IP puede cambiar con DHCP |
| iOS Guided Access | Bloquea iPad a la PWA | Seguridad fisica total | Solo iOS, config manual |
| Device ID + token | Registro de dispositivo con UUID unico | Seguro, revocable | Requiere flujo de registro |

**Recomendacion:** Usuario kiosk dedicado (no admin) + iOS Guided Access en la tablet:
- Crear usuario `kiosk@cheersmallorca.com` con rol `kiosk` (ya existe el rol en el sistema)
- Este usuario solo tiene acceso a `/kiosk`
- Manager inicia sesion una vez al dia desde la tablet
- iPad en Guided Access bloquea la app al browser
- Empleados fichan con su PIN personal encima de esta sesion

### 7.4 Feedback Post-Turno (Modelo 7shifts)

7shifts es lider en feedback de empleados en restauracion:
- Push notification 1-60 min despues del turno (configurable)
- 48h para responder
- **5 emojis:** Great, Good, Decent, Bad, Awful
- Seleccion de hasta **3 razones** de una lista predefinida (cambian segun rating positivo/negativo)
- Comentario de texto libre opcional
- **Las preguntas NO son personalizables** (estandarizadas)
- 93% de equipos reportan que ayudo a resolver conflictos

**Implicaciones legales del mood tracking:**
- **Obligatorio:** Riesgo legal — datos de animo pueden ser datos de salud (Art. 9 GDPR)
- **Opcional y sin consecuencias adversas:** Seguro — base legal: interes legitimo
- **Anonimo:** Ideal pero pierde utilidad individual
- Preguntas neutras, no dirigidas
- Breve (1-2 preguntas max para alta tasa de respuesta)

---

## 8. Decisiones de Diseno Recomendadas

| Area | Recomendacion | Base Legal/Referencia |
|------|---------------|----------------------|
| Metodo de fichaje | PIN + foto (SIN reconocimiento facial) | AEPD; GDPR Art. 9 |
| Grace period | 10-15 min antes del turno (configurable) | When I Work, Deputy, Sling |
| Precision registros | Al minuto: inicio, fin, pausas, extra | Reforma 2026 |
| Retencion datos | 4 anos | RDL 8/2019, Art. 34.9 ET |
| Formato | Digital, a prueba de manipulacion, acceso remoto | Reforma 2026 |
| Geolocalizacion | Solo en momento puntual de clock-in, no continuo | AEPD / LOPDGDD |
| Proteccion kiosk | Usuario kiosk dedicado + Guided Access iPad | Modelo Toast/Square |
| Anti-fraude | PIN + foto (revision humana, no biometrica) | GDPR proporcionalidad |
| Feedback post-turno | Opcional: emojis (1-5) + razones + texto libre | 7shifts, GDPR: opcional |
| Tracking de pausas | Obligatorio: registrar inicio/fin de todas las pausas | Reforma 2026 + Convenio Baleares |
| Alertas compliance | Auto-flag: pausa faltante (6h+), <12h descanso, <2h entre split | Convenio Hosteleria Baleares XVII |
| Clock-in sin turno | Warning "No tienes turno hoy" + permitir (con flag) | Flexibilidad operativa |
| Clock-in muy temprano | Warning "Tu turno empieza en Xmin" + bloqueo configurable | Mejores practicas mercado |
| Idioma feedback | En el idioma del perfil del empleado (NL/EN/ES/DE) | Equipo multinacional |
