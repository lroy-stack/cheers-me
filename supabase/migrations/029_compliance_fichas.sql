-- =============================================================================
-- Migration 029: Compliance Fichas (Inspection & Control Records)
-- =============================================================================
-- Implements EU/Spanish hospitality compliance record-keeping:
--   - APPCC (HACCP) temperature logs, cooking controls, oil checks
--   - Cleaning records (daily + deep)
--   - Goods receiving inspection
--   - Pest control, maintenance, incident reporting
--   - Training certificate tracking
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUM TYPES (idempotent)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE compliance_ficha_category AS ENUM (
    'ld','appcc','prl','receiving','pest_control','maintenance','incident','training','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE compliance_record_status AS ENUM (
    'completed','flagged','requires_review'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLE: compliance_ficha_types (template definitions)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS compliance_ficha_types (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code              VARCHAR(20) NOT NULL UNIQUE,
  category          compliance_ficha_category NOT NULL,
  name_en           VARCHAR(255) NOT NULL,
  name_es           VARCHAR(255) NOT NULL,
  name_nl           VARCHAR(255),
  name_de           VARCHAR(255),
  description_en    TEXT,
  description_es    TEXT,
  description_nl    TEXT,
  description_de    TEXT,
  legal_basis       TEXT,
  fields_schema     JSONB       NOT NULL DEFAULT '[]'::jsonb,
  frequency         VARCHAR(20),
  applicable_roles  TEXT[]      DEFAULT '{}',
  is_active         BOOLEAN     DEFAULT true,
  sort_order        INTEGER     DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3. TABLE: compliance_records (individual entries)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS compliance_records (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_type_id     UUID        NOT NULL REFERENCES compliance_ficha_types(id) ON DELETE RESTRICT,
  ficha_type_code   VARCHAR(20) NOT NULL,
  recorded_by       UUID        NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  values            JSONB       NOT NULL DEFAULT '{}'::jsonb,
  notes             TEXT,
  status            compliance_record_status DEFAULT 'completed',
  reviewed_by       UUID        REFERENCES profiles(id),
  reviewed_at       TIMESTAMPTZ,
  review_notes      TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 4. INDEXES
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_compliance_ficha_types_code
  ON compliance_ficha_types (code);

CREATE INDEX IF NOT EXISTS idx_compliance_ficha_types_category
  ON compliance_ficha_types (category);

CREATE INDEX IF NOT EXISTS idx_compliance_records_ficha_type_id
  ON compliance_records (ficha_type_id);

CREATE INDEX IF NOT EXISTS idx_compliance_records_ficha_type_code
  ON compliance_records (ficha_type_code);

CREATE INDEX IF NOT EXISTS idx_compliance_records_recorded_by
  ON compliance_records (recorded_by);

CREATE INDEX IF NOT EXISTS idx_compliance_records_recorded_at
  ON compliance_records (recorded_at);

CREATE INDEX IF NOT EXISTS idx_compliance_records_status
  ON compliance_records (status);

-- ---------------------------------------------------------------------------
-- 5. UPDATED_AT TRIGGER FUNCTION & TRIGGERS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_compliance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_compliance_ficha_types_updated_at ON compliance_ficha_types;
CREATE TRIGGER trg_compliance_ficha_types_updated_at
  BEFORE UPDATE ON compliance_ficha_types
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS trg_compliance_records_updated_at ON compliance_records;
CREATE TRIGGER trg_compliance_records_updated_at
  BEFORE UPDATE ON compliance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

-- ---------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

ALTER TABLE compliance_ficha_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_records     ENABLE ROW LEVEL SECURITY;

-- compliance_ficha_types -------------------------------------------------------

DROP POLICY IF EXISTS "compliance_ficha_types_select" ON compliance_ficha_types;
CREATE POLICY "compliance_ficha_types_select"
  ON compliance_ficha_types FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "compliance_ficha_types_insert" ON compliance_ficha_types;
CREATE POLICY "compliance_ficha_types_insert"
  ON compliance_ficha_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','manager','owner')
    )
  );

DROP POLICY IF EXISTS "compliance_ficha_types_update" ON compliance_ficha_types;
CREATE POLICY "compliance_ficha_types_update"
  ON compliance_ficha_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','manager','owner')
    )
  );

DROP POLICY IF EXISTS "compliance_ficha_types_delete" ON compliance_ficha_types;
CREATE POLICY "compliance_ficha_types_delete"
  ON compliance_ficha_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','manager','owner')
    )
  );

-- compliance_records -----------------------------------------------------------

-- SELECT: admin/manager/owner see all; staff see own records
DROP POLICY IF EXISTS "compliance_records_select" ON compliance_records;
CREATE POLICY "compliance_records_select"
  ON compliance_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','manager','owner')
    )
    OR recorded_by IN (
      SELECT id FROM employees WHERE profile_id = auth.uid()
    )
  );

-- INSERT: any authenticated user
DROP POLICY IF EXISTS "compliance_records_insert" ON compliance_records;
CREATE POLICY "compliance_records_insert"
  ON compliance_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: admin/manager/owner update any; staff update own where status != 'completed'
DROP POLICY IF EXISTS "compliance_records_update" ON compliance_records;
CREATE POLICY "compliance_records_update"
  ON compliance_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','manager','owner')
    )
    OR (
      recorded_by IN (
        SELECT id FROM employees WHERE profile_id = auth.uid()
      )
      AND status != 'completed'
    )
  );

-- DELETE: admin/manager/owner only
DROP POLICY IF EXISTS "compliance_records_delete" ON compliance_records;
CREATE POLICY "compliance_records_delete"
  ON compliance_records FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','manager','owner')
    )
  );

-- ---------------------------------------------------------------------------
-- 7. NOTIFICATION TYPES (idempotent ADD VALUE)
-- ---------------------------------------------------------------------------

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'compliance_flagged';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'compliance_review';

-- ---------------------------------------------------------------------------
-- 8. REALTIME
-- ---------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE compliance_records;

-- ---------------------------------------------------------------------------
-- 9. SEED DATA: 10 ficha types with complete fields_schema
-- ---------------------------------------------------------------------------

INSERT INTO compliance_ficha_types (code, category, name_en, name_es, name_nl, name_de, description_en, description_es, legal_basis, fields_schema, frequency, applicable_roles, sort_order)
VALUES

-- LD-001: Daily Cleaning Record
(
  'LD-001',
  'ld',
  'Daily Cleaning Record',
  'Registro de Limpieza Diaria',
  'Dagelijks Schoonmaakregister',
  'Tägliches Reinigungsprotokoll',
  'Record of daily cleaning activities for all zones. Must be completed each shift.',
  'Registro de actividades de limpieza diaria para todas las zonas. Debe completarse en cada turno.',
  'EU Regulation 852/2004, Annex II',
  '[
    {
      "key": "zone",
      "type": "select",
      "label_en": "Zone",
      "label_es": "Zona",
      "required": true,
      "options": [
        {"value": "kitchen",  "label_en": "Kitchen",  "label_es": "Cocina"},
        {"value": "bar",      "label_en": "Bar",      "label_es": "Barra"},
        {"value": "dining",   "label_en": "Dining",   "label_es": "Comedor"},
        {"value": "terrace",  "label_en": "Terrace",  "label_es": "Terraza"},
        {"value": "bathroom", "label_en": "Bathroom", "label_es": "Baño"},
        {"value": "storage",  "label_en": "Storage",  "label_es": "Almacén"}
      ]
    },
    {
      "key": "surface_equipment",
      "type": "text",
      "label_en": "Surface / Equipment",
      "label_es": "Superficie / Equipo",
      "required": true,
      "placeholder_en": "e.g. Countertops, floors, ovens",
      "placeholder_es": "ej. Encimeras, suelos, hornos"
    },
    {
      "key": "product_used",
      "type": "text",
      "label_en": "Product Used",
      "label_es": "Producto Utilizado",
      "required": true,
      "placeholder_en": "Cleaning product name",
      "placeholder_es": "Nombre del producto de limpieza"
    },
    {
      "key": "dilution",
      "type": "text",
      "label_en": "Dilution",
      "label_es": "Dilución",
      "required": false,
      "placeholder_en": "e.g. 1:10",
      "placeholder_es": "ej. 1:10"
    },
    {
      "key": "contact_time_minutes",
      "type": "number",
      "label_en": "Contact Time (minutes)",
      "label_es": "Tiempo de Contacto (minutos)",
      "required": false,
      "min": 0,
      "max": null,
      "unit": null
    },
    {
      "key": "method",
      "type": "select",
      "label_en": "Method",
      "label_es": "Método",
      "required": true,
      "options": [
        {"value": "spray",     "label_en": "Spray",     "label_es": "Pulverización"},
        {"value": "immersion", "label_en": "Immersion", "label_es": "Inmersión"},
        {"value": "wipe",      "label_en": "Wipe",      "label_es": "Paño"},
        {"value": "mop",       "label_en": "Mop",       "label_es": "Fregona"},
        {"value": "machine",   "label_en": "Machine",   "label_es": "Máquina"}
      ]
    },
    {
      "key": "result_ok",
      "type": "boolean",
      "label_en": "Result OK",
      "label_es": "Resultado OK",
      "required": true
    },
    {
      "key": "observations",
      "type": "textarea",
      "label_en": "Observations",
      "label_es": "Observaciones",
      "required": false,
      "placeholder_en": "Any additional notes",
      "placeholder_es": "Notas adicionales"
    }
  ]'::jsonb,
  'daily',
  '{kitchen,bar,waiter,manager,owner}',
  1
),

-- LD-002: Deep Cleaning
(
  'LD-002',
  'ld',
  'Deep Cleaning',
  'Limpieza Profunda',
  'Grondige Reiniging',
  'Grundreinigung',
  'Weekly deep cleaning record for thorough sanitization of equipment and surfaces.',
  'Registro de limpieza profunda semanal para desinfección exhaustiva de equipos y superficies.',
  'EU Regulation 852/2004, Annex II',
  '[
    {
      "key": "zone",
      "type": "select",
      "label_en": "Zone",
      "label_es": "Zona",
      "required": true,
      "options": [
        {"value": "kitchen",  "label_en": "Kitchen",  "label_es": "Cocina"},
        {"value": "bar",      "label_en": "Bar",      "label_es": "Barra"},
        {"value": "dining",   "label_en": "Dining",   "label_es": "Comedor"},
        {"value": "terrace",  "label_en": "Terrace",  "label_es": "Terraza"},
        {"value": "bathroom", "label_en": "Bathroom", "label_es": "Baño"},
        {"value": "storage",  "label_en": "Storage",  "label_es": "Almacén"}
      ]
    },
    {
      "key": "equipment_detail",
      "type": "textarea",
      "label_en": "Equipment / Areas Detail",
      "label_es": "Detalle de Equipos / Áreas",
      "required": true,
      "placeholder_en": "Describe equipment and areas cleaned in detail",
      "placeholder_es": "Describe en detalle equipos y áreas limpiados"
    },
    {
      "key": "product_used",
      "type": "text",
      "label_en": "Product Used",
      "label_es": "Producto Utilizado",
      "required": true,
      "placeholder_en": "Cleaning product name",
      "placeholder_es": "Nombre del producto de limpieza"
    },
    {
      "key": "dilution",
      "type": "text",
      "label_en": "Dilution",
      "label_es": "Dilución",
      "required": false,
      "placeholder_en": "e.g. 1:10",
      "placeholder_es": "ej. 1:10"
    },
    {
      "key": "contact_time_minutes",
      "type": "number",
      "label_en": "Contact Time (minutes)",
      "label_es": "Tiempo de Contacto (minutos)",
      "required": false,
      "min": 0,
      "max": null,
      "unit": null
    },
    {
      "key": "degreaser_used",
      "type": "boolean",
      "label_en": "Degreaser Used",
      "label_es": "Desengrasante Utilizado",
      "required": true
    },
    {
      "key": "sanitizer_used",
      "type": "boolean",
      "label_en": "Sanitizer Used",
      "label_es": "Desinfectante Utilizado",
      "required": true
    },
    {
      "key": "result_ok",
      "type": "boolean",
      "label_en": "Result OK",
      "label_es": "Resultado OK",
      "required": true
    },
    {
      "key": "next_scheduled_date",
      "type": "date",
      "label_en": "Next Scheduled Date",
      "label_es": "Próxima Fecha Programada",
      "required": false
    },
    {
      "key": "observations",
      "type": "textarea",
      "label_en": "Observations",
      "label_es": "Observaciones",
      "required": false,
      "placeholder_en": "Any additional notes",
      "placeholder_es": "Notas adicionales"
    }
  ]'::jsonb,
  'weekly',
  '{kitchen,bar,manager,owner}',
  2
),

-- APPCC-TEMP-001: Temperature Log - Refrigerators/Freezers
(
  'APPCC-TEMP-001',
  'appcc',
  'Temperature Log - Refrigerators/Freezers',
  'Registro de Temperaturas - Frigoríficos/Congeladores',
  'Temperatuurlog - Koelkasten/Vriezers',
  'Temperaturprotokoll - Kühlschränke/Gefrierschränke',
  'Daily temperature monitoring of all cold storage equipment. Critical HACCP control point.',
  'Monitorización diaria de temperaturas de todos los equipos de frío. Punto de control crítico APPCC.',
  'RD 3484/2000, EU 852/2004',
  '[
    {
      "key": "equipment_name",
      "type": "text",
      "label_en": "Equipment Name",
      "label_es": "Nombre del Equipo",
      "required": true,
      "placeholder_en": "e.g. Main kitchen fridge #1",
      "placeholder_es": "ej. Frigorífico principal cocina #1"
    },
    {
      "key": "equipment_type",
      "type": "select",
      "label_en": "Equipment Type",
      "label_es": "Tipo de Equipo",
      "required": true,
      "options": [
        {"value": "refrigerator",   "label_en": "Refrigerator",   "label_es": "Frigorífico"},
        {"value": "freezer",        "label_en": "Freezer",        "label_es": "Congelador"},
        {"value": "display_fridge", "label_en": "Display Fridge", "label_es": "Vitrina Refrigerada"}
      ]
    },
    {
      "key": "temperature_reading",
      "type": "temperature",
      "label_en": "Temperature Reading",
      "label_es": "Lectura de Temperatura",
      "required": true,
      "unit": "°C",
      "min": null,
      "max": null
    },
    {
      "key": "time_of_reading",
      "type": "time",
      "label_en": "Time of Reading",
      "label_es": "Hora de Lectura",
      "required": true
    },
    {
      "key": "within_limits",
      "type": "boolean",
      "label_en": "Within Limits",
      "label_es": "Dentro de Límites",
      "required": true
    },
    {
      "key": "corrective_action",
      "type": "textarea",
      "label_en": "Corrective Action",
      "label_es": "Acción Correctiva",
      "required": false,
      "placeholder_en": "Describe corrective actions if out of limits",
      "placeholder_es": "Describe acciones correctivas si fuera de límites"
    },
    {
      "key": "observations",
      "type": "textarea",
      "label_en": "Observations",
      "label_es": "Observaciones",
      "required": false,
      "placeholder_en": "Any additional notes",
      "placeholder_es": "Notas adicionales"
    }
  ]'::jsonb,
  'daily',
  '{kitchen,manager,owner}',
  3
),

-- APPCC-COOK-001: Cooking Temperature Control
(
  'APPCC-COOK-001',
  'appcc',
  'Cooking Temperature Control',
  'Control de Temperatura de Cocción',
  'Kooktemperatuurcontrole',
  'Kochtemperaturkontrolle',
  'Temperature verification during and after cooking. Critical control point for food safety.',
  'Verificación de temperatura durante y después de la cocción. Punto de control crítico para seguridad alimentaria.',
  'RD 3484/2000',
  '[
    {
      "key": "dish_name",
      "type": "text",
      "label_en": "Dish Name",
      "label_es": "Nombre del Plato",
      "required": true,
      "placeholder_en": "Name of the dish being cooked",
      "placeholder_es": "Nombre del plato que se cocina"
    },
    {
      "key": "cooking_temp",
      "type": "temperature",
      "label_en": "Cooking Temperature",
      "label_es": "Temperatura de Cocción",
      "required": true,
      "unit": "°C",
      "min": 63,
      "max": null
    },
    {
      "key": "holding_temp",
      "type": "temperature",
      "label_en": "Holding Temperature",
      "label_es": "Temperatura de Mantenimiento",
      "required": true,
      "unit": "°C",
      "min": 63,
      "max": null
    },
    {
      "key": "time_checked",
      "type": "time",
      "label_en": "Time Checked",
      "label_es": "Hora de Comprobación",
      "required": true
    },
    {
      "key": "probe_used",
      "type": "boolean",
      "label_en": "Probe Used",
      "label_es": "Sonda Utilizada",
      "required": true
    },
    {
      "key": "within_limits",
      "type": "boolean",
      "label_en": "Within Limits",
      "label_es": "Dentro de Límites",
      "required": true
    },
    {
      "key": "corrective_action",
      "type": "textarea",
      "label_en": "Corrective Action",
      "label_es": "Acción Correctiva",
      "required": false,
      "placeholder_en": "Describe corrective actions if out of limits",
      "placeholder_es": "Describe acciones correctivas si fuera de límites"
    },
    {
      "key": "observations",
      "type": "textarea",
      "label_en": "Observations",
      "label_es": "Observaciones",
      "required": false,
      "placeholder_en": "Any additional notes",
      "placeholder_es": "Notas adicionales"
    }
  ]'::jsonb,
  'per_event',
  '{kitchen,manager,owner}',
  4
),

-- APPCC-REC-001: Goods Receiving Inspection
(
  'APPCC-REC-001',
  'receiving',
  'Goods Receiving Inspection',
  'Inspección de Recepción de Mercancías',
  'Goederenontvangst Inspectie',
  'Warenannahme-Inspektion',
  'Inspection checklist for all incoming deliveries. Verify temperature, packaging, labeling and quality.',
  'Lista de comprobación para todas las entregas recibidas. Verificar temperatura, embalaje, etiquetado y calidad.',
  'RD 3484/2000, EU 178/2002',
  '[
    {
      "key": "supplier_name",
      "type": "text",
      "label_en": "Supplier Name",
      "label_es": "Nombre del Proveedor",
      "required": true,
      "placeholder_en": "Supplier or delivery company",
      "placeholder_es": "Proveedor o empresa de reparto"
    },
    {
      "key": "delivery_note_number",
      "type": "text",
      "label_en": "Delivery Note Number",
      "label_es": "Número de Albarán",
      "required": true,
      "placeholder_en": "Reference number on delivery note",
      "placeholder_es": "Número de referencia del albarán"
    },
    {
      "key": "products_description",
      "type": "textarea",
      "label_en": "Products Description",
      "label_es": "Descripción de Productos",
      "required": true,
      "placeholder_en": "List products received",
      "placeholder_es": "Lista de productos recibidos"
    },
    {
      "key": "temp_on_arrival",
      "type": "temperature",
      "label_en": "Temperature on Arrival",
      "label_es": "Temperatura a la Llegada",
      "required": true,
      "unit": "°C",
      "min": null,
      "max": null
    },
    {
      "key": "packaging_intact",
      "type": "boolean",
      "label_en": "Packaging Intact",
      "label_es": "Embalaje Intacto",
      "required": true
    },
    {
      "key": "labeling_correct",
      "type": "boolean",
      "label_en": "Labeling Correct",
      "label_es": "Etiquetado Correcto",
      "required": true
    },
    {
      "key": "expiry_dates_ok",
      "type": "boolean",
      "label_en": "Expiry Dates OK",
      "label_es": "Fechas de Caducidad OK",
      "required": true
    },
    {
      "key": "organoleptic_ok",
      "type": "boolean",
      "label_en": "Organoleptic Check OK",
      "label_es": "Control Organoléptico OK",
      "required": true
    },
    {
      "key": "accepted",
      "type": "boolean",
      "label_en": "Accepted",
      "label_es": "Aceptado",
      "required": true
    },
    {
      "key": "rejected_items",
      "type": "textarea",
      "label_en": "Rejected Items",
      "label_es": "Artículos Rechazados",
      "required": false,
      "placeholder_en": "List any rejected items and reasons",
      "placeholder_es": "Lista de artículos rechazados y motivos"
    },
    {
      "key": "observations",
      "type": "textarea",
      "label_en": "Observations",
      "label_es": "Observaciones",
      "required": false,
      "placeholder_en": "Any additional notes",
      "placeholder_es": "Notas adicionales"
    }
  ]'::jsonb,
  'per_event',
  '{kitchen,bar,manager,owner}',
  5
),

-- PEST-001: Pest Control Inspection
(
  'PEST-001',
  'pest_control',
  'Pest Control Inspection',
  'Inspección de Control de Plagas',
  'Ongediertebestrijding Inspectie',
  'Schädlingsbekämpfung Inspektion',
  'Monthly pest control inspection record. Must be performed by certified company.',
  'Registro de inspección mensual de control de plagas. Debe ser realizado por empresa certificada.',
  'RD 830/2010, EU 852/2004',
  '[
    {
      "key": "inspection_date",
      "type": "date",
      "label_en": "Inspection Date",
      "label_es": "Fecha de Inspección",
      "required": true
    },
    {
      "key": "company_name",
      "type": "text",
      "label_en": "Company Name",
      "label_es": "Nombre de la Empresa",
      "required": true,
      "placeholder_en": "Pest control company name",
      "placeholder_es": "Nombre de la empresa de control de plagas"
    },
    {
      "key": "technician_name",
      "type": "text",
      "label_en": "Technician Name",
      "label_es": "Nombre del Técnico",
      "required": true,
      "placeholder_en": "Name of the technician",
      "placeholder_es": "Nombre del técnico"
    },
    {
      "key": "areas_inspected",
      "type": "multi_select",
      "label_en": "Areas Inspected",
      "label_es": "Áreas Inspeccionadas",
      "required": true,
      "options": [
        {"value": "kitchen",  "label_en": "Kitchen",  "label_es": "Cocina"},
        {"value": "bar",      "label_en": "Bar",      "label_es": "Barra"},
        {"value": "storage",  "label_en": "Storage",  "label_es": "Almacén"},
        {"value": "terrace",  "label_en": "Terrace",  "label_es": "Terraza"},
        {"value": "bathroom", "label_en": "Bathroom", "label_es": "Baño"},
        {"value": "exterior", "label_en": "Exterior", "label_es": "Exterior"}
      ]
    },
    {
      "key": "traps_checked",
      "type": "number",
      "label_en": "Traps Checked",
      "label_es": "Trampas Revisadas",
      "required": true,
      "min": 0,
      "max": null
    },
    {
      "key": "activity_detected",
      "type": "boolean",
      "label_en": "Activity Detected",
      "label_es": "Actividad Detectada",
      "required": true
    },
    {
      "key": "pest_type",
      "type": "text",
      "label_en": "Pest Type",
      "label_es": "Tipo de Plaga",
      "required": false,
      "placeholder_en": "Type of pest if detected",
      "placeholder_es": "Tipo de plaga si se detecta"
    },
    {
      "key": "treatment_applied",
      "type": "text",
      "label_en": "Treatment Applied",
      "label_es": "Tratamiento Aplicado",
      "required": false,
      "placeholder_en": "Description of treatment",
      "placeholder_es": "Descripción del tratamiento"
    },
    {
      "key": "products_used",
      "type": "text",
      "label_en": "Products Used",
      "label_es": "Productos Utilizados",
      "required": false,
      "placeholder_en": "Products and active ingredients",
      "placeholder_es": "Productos e ingredientes activos"
    },
    {
      "key": "certificate_number",
      "type": "text",
      "label_en": "Certificate Number",
      "label_es": "Número de Certificado",
      "required": false,
      "placeholder_en": "Service certificate number",
      "placeholder_es": "Número de certificado de servicio"
    },
    {
      "key": "next_visit_date",
      "type": "date",
      "label_en": "Next Visit Date",
      "label_es": "Fecha de Próxima Visita",
      "required": false
    },
    {
      "key": "observations",
      "type": "textarea",
      "label_en": "Observations",
      "label_es": "Observaciones",
      "required": false,
      "placeholder_en": "Any additional notes",
      "placeholder_es": "Notas adicionales"
    }
  ]'::jsonb,
  'monthly',
  '{manager,owner}',
  6
),

-- MAINT-001: Equipment Maintenance
(
  'MAINT-001',
  'maintenance',
  'Equipment Maintenance',
  'Mantenimiento de Equipos',
  'Apparatuuronderhoud',
  'Gerätewartung',
  'Record of equipment maintenance activities, both preventive and corrective.',
  'Registro de actividades de mantenimiento de equipos, tanto preventivo como correctivo.',
  'RD 1215/1997, EU 852/2004',
  '[
    {
      "key": "equipment_name",
      "type": "text",
      "label_en": "Equipment Name",
      "label_es": "Nombre del Equipo",
      "required": true,
      "placeholder_en": "Name or identifier of equipment",
      "placeholder_es": "Nombre o identificador del equipo"
    },
    {
      "key": "equipment_location",
      "type": "select",
      "label_en": "Equipment Location",
      "label_es": "Ubicación del Equipo",
      "required": true,
      "options": [
        {"value": "kitchen", "label_en": "Kitchen", "label_es": "Cocina"},
        {"value": "bar",     "label_en": "Bar",     "label_es": "Barra"},
        {"value": "storage", "label_en": "Storage", "label_es": "Almacén"},
        {"value": "other",   "label_en": "Other",   "label_es": "Otro"}
      ]
    },
    {
      "key": "maintenance_type",
      "type": "select",
      "label_en": "Maintenance Type",
      "label_es": "Tipo de Mantenimiento",
      "required": true,
      "options": [
        {"value": "preventive", "label_en": "Preventive", "label_es": "Preventivo"},
        {"value": "corrective", "label_en": "Corrective", "label_es": "Correctivo"},
        {"value": "emergency",  "label_en": "Emergency",  "label_es": "Emergencia"}
      ]
    },
    {
      "key": "description_of_work",
      "type": "textarea",
      "label_en": "Description of Work",
      "label_es": "Descripción del Trabajo",
      "required": true,
      "placeholder_en": "Detailed description of maintenance performed",
      "placeholder_es": "Descripción detallada del mantenimiento realizado"
    },
    {
      "key": "performed_by",
      "type": "text",
      "label_en": "Performed By",
      "label_es": "Realizado Por",
      "required": true,
      "placeholder_en": "Name of person or technician",
      "placeholder_es": "Nombre de la persona o técnico"
    },
    {
      "key": "external_company",
      "type": "text",
      "label_en": "External Company",
      "label_es": "Empresa Externa",
      "required": false,
      "placeholder_en": "External service company (if applicable)",
      "placeholder_es": "Empresa de servicio externo (si aplica)"
    },
    {
      "key": "parts_replaced",
      "type": "text",
      "label_en": "Parts Replaced",
      "label_es": "Piezas Reemplazadas",
      "required": false,
      "placeholder_en": "List any parts replaced",
      "placeholder_es": "Lista de piezas reemplazadas"
    },
    {
      "key": "cost",
      "type": "number",
      "label_en": "Cost (€)",
      "label_es": "Coste (€)",
      "required": false,
      "min": 0,
      "max": null
    },
    {
      "key": "equipment_operational",
      "type": "boolean",
      "label_en": "Equipment Operational",
      "label_es": "Equipo Operativo",
      "required": true
    },
    {
      "key": "next_maintenance_date",
      "type": "date",
      "label_en": "Next Maintenance Date",
      "label_es": "Fecha de Próximo Mantenimiento",
      "required": false
    },
    {
      "key": "observations",
      "type": "textarea",
      "label_en": "Observations",
      "label_es": "Observaciones",
      "required": false,
      "placeholder_en": "Any additional notes",
      "placeholder_es": "Notas adicionales"
    }
  ]'::jsonb,
  'on_demand',
  '{kitchen,bar,manager,owner}',
  7
),

-- INC-001: Incident Report
(
  'INC-001',
  'incident',
  'Incident Report',
  'Informe de Incidentes',
  'Incidentenrapport',
  'Vorfallbericht',
  'Report for workplace incidents including injuries, near misses, property damage and food safety events.',
  'Informe para incidentes laborales incluyendo lesiones, casi accidentes, daños materiales y eventos de seguridad alimentaria.',
  'Ley 31/1995, RD 39/1997',
  '[
    {
      "key": "incident_date",
      "type": "date",
      "label_en": "Incident Date",
      "label_es": "Fecha del Incidente",
      "required": true
    },
    {
      "key": "incident_time",
      "type": "time",
      "label_en": "Incident Time",
      "label_es": "Hora del Incidente",
      "required": true
    },
    {
      "key": "location",
      "type": "select",
      "label_en": "Location",
      "label_es": "Ubicación",
      "required": true,
      "options": [
        {"value": "kitchen", "label_en": "Kitchen", "label_es": "Cocina"},
        {"value": "bar",     "label_en": "Bar",     "label_es": "Barra"},
        {"value": "dining",  "label_en": "Dining",  "label_es": "Comedor"},
        {"value": "terrace", "label_en": "Terrace", "label_es": "Terraza"},
        {"value": "storage", "label_en": "Storage", "label_es": "Almacén"},
        {"value": "other",   "label_en": "Other",   "label_es": "Otro"}
      ]
    },
    {
      "key": "incident_type",
      "type": "select",
      "label_en": "Incident Type",
      "label_es": "Tipo de Incidente",
      "required": true,
      "options": [
        {"value": "injury",          "label_en": "Injury",          "label_es": "Lesión"},
        {"value": "near_miss",       "label_en": "Near Miss",       "label_es": "Casi Accidente"},
        {"value": "property_damage", "label_en": "Property Damage", "label_es": "Daño Material"},
        {"value": "food_safety",     "label_en": "Food Safety",     "label_es": "Seguridad Alimentaria"},
        {"value": "other",           "label_en": "Other",           "label_es": "Otro"}
      ]
    },
    {
      "key": "severity",
      "type": "select",
      "label_en": "Severity",
      "label_es": "Gravedad",
      "required": true,
      "options": [
        {"value": "minor",    "label_en": "Minor",    "label_es": "Leve"},
        {"value": "moderate", "label_en": "Moderate", "label_es": "Moderado"},
        {"value": "serious",  "label_en": "Serious",  "label_es": "Grave"}
      ]
    },
    {
      "key": "persons_involved",
      "type": "textarea",
      "label_en": "Persons Involved",
      "label_es": "Personas Involucradas",
      "required": true,
      "placeholder_en": "Names and roles of persons involved",
      "placeholder_es": "Nombres y roles de personas involucradas"
    },
    {
      "key": "description",
      "type": "textarea",
      "label_en": "Description",
      "label_es": "Descripción",
      "required": true,
      "placeholder_en": "Detailed description of what happened",
      "placeholder_es": "Descripción detallada de lo ocurrido"
    },
    {
      "key": "immediate_actions",
      "type": "textarea",
      "label_en": "Immediate Actions Taken",
      "label_es": "Acciones Inmediatas Tomadas",
      "required": true,
      "placeholder_en": "What actions were taken immediately",
      "placeholder_es": "Qué acciones se tomaron de inmediato"
    },
    {
      "key": "first_aid_administered",
      "type": "boolean",
      "label_en": "First Aid Administered",
      "label_es": "Primeros Auxilios Administrados",
      "required": true
    },
    {
      "key": "medical_attention_required",
      "type": "boolean",
      "label_en": "Medical Attention Required",
      "label_es": "Atención Médica Requerida",
      "required": true
    },
    {
      "key": "root_cause",
      "type": "textarea",
      "label_en": "Root Cause",
      "label_es": "Causa Raíz",
      "required": false,
      "placeholder_en": "Analysis of the root cause",
      "placeholder_es": "Análisis de la causa raíz"
    },
    {
      "key": "corrective_actions",
      "type": "textarea",
      "label_en": "Corrective Actions",
      "label_es": "Acciones Correctivas",
      "required": false,
      "placeholder_en": "Actions to prevent recurrence",
      "placeholder_es": "Acciones para prevenir recurrencia"
    },
    {
      "key": "reported_to_authority",
      "type": "boolean",
      "label_en": "Reported to Authority",
      "label_es": "Reportado a la Autoridad",
      "required": true
    },
    {
      "key": "observations",
      "type": "textarea",
      "label_en": "Observations",
      "label_es": "Observaciones",
      "required": false,
      "placeholder_en": "Any additional notes",
      "placeholder_es": "Notas adicionales"
    }
  ]'::jsonb,
  'on_demand',
  '{kitchen,bar,waiter,dj,manager,owner,admin}',
  8
),

-- APPCC-OIL-001: Frying Oil Quality Check
(
  'APPCC-OIL-001',
  'appcc',
  'Frying Oil Quality Check',
  'Control de Calidad del Aceite de Fritura',
  'Frituurolie Kwaliteitscontrole',
  'Frittieröl-Qualitätskontrolle',
  'Daily check of frying oil quality. Polar compounds must not exceed 25%.',
  'Control diario de calidad del aceite de fritura. Los compuestos polares no deben superar el 25%.',
  'RD 2207/1995',
  '[
    {
      "key": "fryer_id",
      "type": "text",
      "label_en": "Fryer ID",
      "label_es": "ID de la Freidora",
      "required": true,
      "placeholder_en": "Identifier of the fryer",
      "placeholder_es": "Identificador de la freidora"
    },
    {
      "key": "oil_type",
      "type": "text",
      "label_en": "Oil Type",
      "label_es": "Tipo de Aceite",
      "required": true,
      "placeholder_en": "e.g. Sunflower, Olive, Blend",
      "placeholder_es": "ej. Girasol, Oliva, Mezcla"
    },
    {
      "key": "polar_compounds_percent",
      "type": "number",
      "label_en": "Polar Compounds (%)",
      "label_es": "Compuestos Polares (%)",
      "required": true,
      "min": 0,
      "max": 100
    },
    {
      "key": "temperature",
      "type": "temperature",
      "label_en": "Oil Temperature",
      "label_es": "Temperatura del Aceite",
      "required": true,
      "unit": "°C",
      "min": null,
      "max": 180
    },
    {
      "key": "oil_changed",
      "type": "boolean",
      "label_en": "Oil Changed",
      "label_es": "Aceite Cambiado",
      "required": true
    },
    {
      "key": "last_change_date",
      "type": "date",
      "label_en": "Last Oil Change Date",
      "label_es": "Fecha del Último Cambio de Aceite",
      "required": false
    },
    {
      "key": "within_limits",
      "type": "boolean",
      "label_en": "Within Limits",
      "label_es": "Dentro de Límites",
      "required": true
    },
    {
      "key": "corrective_action",
      "type": "textarea",
      "label_en": "Corrective Action",
      "label_es": "Acción Correctiva",
      "required": false,
      "placeholder_en": "Describe corrective actions if out of limits",
      "placeholder_es": "Describe acciones correctivas si fuera de límites"
    },
    {
      "key": "observations",
      "type": "textarea",
      "label_en": "Observations",
      "label_es": "Observaciones",
      "required": false,
      "placeholder_en": "Any additional notes",
      "placeholder_es": "Notas adicionales"
    }
  ]'::jsonb,
  'daily',
  '{kitchen,manager,owner}',
  9
),

-- TRAIN-CERT-001: Training Certificate Record
(
  'TRAIN-CERT-001',
  'training',
  'Training Certificate Record',
  'Registro de Certificado de Formación',
  'Opleidingscertificaat Registratie',
  'Schulungszertifikat Nachweis',
  'Record of employee training certificates, including food handler cards, PRL, first aid, etc.',
  'Registro de certificados de formación de empleados, incluyendo carnet de manipulador, PRL, primeros auxilios, etc.',
  'Ley 31/1995 Art.19, EU 852/2004',
  '[
    {
      "key": "employee_name",
      "type": "text",
      "label_en": "Employee Name",
      "label_es": "Nombre del Empleado",
      "required": true,
      "placeholder_en": "Full name of the employee",
      "placeholder_es": "Nombre completo del empleado"
    },
    {
      "key": "training_topic",
      "type": "text",
      "label_en": "Training Topic",
      "label_es": "Tema de Formación",
      "required": true,
      "placeholder_en": "Subject of the training",
      "placeholder_es": "Tema de la formación"
    },
    {
      "key": "training_provider",
      "type": "text",
      "label_en": "Training Provider",
      "label_es": "Proveedor de Formación",
      "required": true,
      "placeholder_en": "Training center or company",
      "placeholder_es": "Centro o empresa de formación"
    },
    {
      "key": "training_date",
      "type": "date",
      "label_en": "Training Date",
      "label_es": "Fecha de Formación",
      "required": true
    },
    {
      "key": "duration_hours",
      "type": "number",
      "label_en": "Duration (hours)",
      "label_es": "Duración (horas)",
      "required": true,
      "min": 0,
      "max": null
    },
    {
      "key": "certificate_number",
      "type": "text",
      "label_en": "Certificate Number",
      "label_es": "Número de Certificado",
      "required": false,
      "placeholder_en": "Certificate reference number",
      "placeholder_es": "Número de referencia del certificado"
    },
    {
      "key": "expiry_date",
      "type": "date",
      "label_en": "Expiry Date",
      "label_es": "Fecha de Caducidad",
      "required": false
    },
    {
      "key": "certificate_type",
      "type": "select",
      "label_en": "Certificate Type",
      "label_es": "Tipo de Certificado",
      "required": true,
      "options": [
        {"value": "food_handler", "label_en": "Food Handler",  "label_es": "Manipulador de Alimentos"},
        {"value": "prl",          "label_en": "PRL",           "label_es": "PRL"},
        {"value": "first_aid",    "label_en": "First Aid",     "label_es": "Primeros Auxilios"},
        {"value": "fire_safety",  "label_en": "Fire Safety",   "label_es": "Prevención de Incendios"},
        {"value": "allergens",    "label_en": "Allergens",     "label_es": "Alérgenos"},
        {"value": "other",        "label_en": "Other",         "label_es": "Otro"}
      ]
    },
    {
      "key": "passed",
      "type": "boolean",
      "label_en": "Passed",
      "label_es": "Aprobado",
      "required": true
    },
    {
      "key": "observations",
      "type": "textarea",
      "label_en": "Observations",
      "label_es": "Observaciones",
      "required": false,
      "placeholder_en": "Any additional notes",
      "placeholder_es": "Notas adicionales"
    }
  ]'::jsonb,
  'on_demand',
  '{manager,owner,admin}',
  10
)
ON CONFLICT (code) DO NOTHING;
