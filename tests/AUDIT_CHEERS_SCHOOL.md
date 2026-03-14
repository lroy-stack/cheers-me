# Auditoria: Cheers School — Sistema de Formacion

**Fecha:** 2026-03-14
**Estado:** Auditoria completa contra DB real + codigo

---

## Resumen Ejecutivo

| Metrica | Valor |
|---------|-------|
| Guias totales | 73 (6 categorias) |
| Preguntas en DB | 2,048 (64 guias x 4 idiomas x 8 preguntas) |
| Registros de training | 75 eventos |
| Asignaciones | 10 |
| Certificados descargados | 6 |
| Idiomas con contenido | 4 (en/es/nl/de) — completos |
| Guias sin preguntas | 9 (G-FS-014 a G-FS-022) — CRITICO |
| Bugs criticos | 3 |
| Gaps funcionales | 7 |

---

## Arquitectura

```
Metadata (73 guias)          → src/lib/data/resource-guides.ts (TypeScript)
Contenido (secciones, etc)   → src/i18n/messages/{lang}/guides/{code}.json (292 archivos)
Preguntas de test            → training_test_questions table (PostgreSQL)
Materiales (config DB)       → training_materials table (73 rows)
Registros de progreso        → training_records table (event log)
Asignaciones                 → training_assignments table (manager-assigned)
Compliance fichas            → compliance_records + compliance_ficha_types (10 tipos)
Certificados                 → Generados con pdfkit (PDF A4 landscape)
Verificacion publica         → GET /api/staff/training/verify/[certNumber] (sin auth)
```

## 6 Categorias de Guias

| Categoria | Codigo | Cantidad | Roles |
|-----------|--------|----------|-------|
| Food Safety | G-FS-* | 22 | kitchen, bar, waiter |
| Occupational Health | G-PRL-* | 18 | Todos |
| Labor Regulations | G-LAB-* | 9 | Todos |
| Role Specific | G-ROL-* | 14 | Por rol |
| Required Docs | G-DOC-* | 5 | Todos |
| Environmental | G-ENV-* | 5 | Todos |

## Flujo del Empleado

```
1. Abrir Resources → ver guias filtradas por rol
2. Click guia → ResourceGuideDetail (resumen, key points, legal basis)
3. "Start Study" → CourseStudyView (seccion por seccion, progress bar)
4. Marcar cada seccion como leida → training_records.section_viewed
5. Todas leidas → CTA "Take Test"
6. Test → 8 preguntas multiple choice, 1 a la vez
7. Submit → submit_training_test RPC → calcula score
8. Si >= 70% → test_passed → certificado disponible
9. Si < 70% → test_failed → revision de respuestas + retry
10. Download Certificate → PDF con logo, nombre, score, fecha, numero verificable
```

## 3 Bugs Criticos

### Bug 1: Admin page schema mismatch
**Archivo:** `src/app/staff/training/admin/page.tsx`
**Problema:** El formulario envia `title`, `description`, `category` pero la tabla `training_materials` NO tiene esas columnas. Supabase ignora los campos desconocidos silenciosamente.
**Impacto:** Los materiales creados desde admin no tienen titulo ni descripcion.

### Bug 2: 9 guias sin preguntas de test
**Guias:** G-FS-014 a G-FS-022 (Food Safety)
**Problema:** Tienen metadata y contenido JSON en 4 idiomas pero CERO filas en `training_test_questions`.
**Impacto:** Empleados ven "Take Test" pero reciben 404 al intentarlo.

### Bug 3: G-PRL-013 solo tiene preguntas en ingles
**Problema:** 8 preguntas en EN, 0 en ES/NL/DE.
**Impacto:** Empleados holandeses/españoles/alemanes reciben 404 al tomar el test.

## 7 Gaps Funcionales

1. **No hay automatizacion de overdue** — ningun cron/trigger cambia assignments de `pending` a `overdue` cuando pasa la `due_date`
2. **Guias mandatorias no aparecen sin asignacion** — "My Training" solo muestra guias con assignment explicito, no las marcadas `is_mandatory`
3. **No hay QR code en certificados** — el PDF dice "verificable" pero no incluye QR al endpoint de verificacion
4. **Admin page sin link desde sidebar** — los managers deben conocer la URL `/staff/training/admin`
5. **`test_started` nunca se registra** — el enum existe pero ningun codigo lo usa
6. **Contenido no editable desde UI** — las guias son JSON staticos, requieren deploy para editar
7. **CourseCard "Download Certificate" abre el study view** en vez de descargar el certificado directamente

## Tablas DB

| Tabla | Rows | Funcion |
|-------|------|---------|
| training_materials | 73 | Catalogo de guias (config) |
| training_test_questions | 2,048 | Preguntas MCQ por guia/idioma |
| training_records | 75 | Event log de acciones del empleado |
| training_assignments | 10 | Asignaciones manager→empleado |
| compliance_records | 1 | Fichas de compliance operacional |
| compliance_ficha_types | 10 | Plantillas de fichas (HACCP, etc.) |

## API Endpoints (11 rutas)

| Endpoint | Metodo | Auth | Funcion |
|----------|--------|------|---------|
| `/api/staff/training/guide-content/[code]` | GET | Auth | Contenido JSON de guia |
| `/api/staff/training/tests/[code]` | GET | Auth | Preguntas (sin respuesta correcta) |
| `/api/staff/training/tests/[code]/submit` | POST | Auth | Evaluar test, registrar resultado |
| `/api/staff/training/certificate/[code]` | GET | Auth | Generar PDF certificado |
| `/api/staff/training/pdf/[code]` | GET | Auth | Generar PDF de la guia completa |
| `/api/staff/training/records` | GET/POST | Auth | Leer/crear registros de progreso |
| `/api/staff/training/records/[empId]` | GET | Manager | Registros de un empleado |
| `/api/staff/training/assignments` | GET/POST | Auth/Manager | Listar/crear asignaciones |
| `/api/staff/training/compliance` | GET | Manager | Stats de compliance agregados |
| `/api/staff/training/materials` | CRUD | Auth/Admin | Gestionar materiales |
| `/api/staff/training/verify/[cert]` | GET | **Publico** | Verificar certificado |

## Archivos (35 archivos, ~4,600 lineas de codigo)

- 11 API routes
- 10 componentes React
- 8 hooks
- 1 lib data file (guide metadata)
- 1 PDF generator
- 292 JSON content files (73 guias x 4 idiomas)
- 6+ migrations
