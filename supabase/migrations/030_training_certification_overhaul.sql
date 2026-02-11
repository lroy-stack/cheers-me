-- ============================================================================
-- 030: Training Certification Overhaul
-- Adds section_viewed and certificate_downloaded action types,
-- updates all training materials to require tests,
-- and sets realistic estimated times.
-- ============================================================================

-- 1. Add new action types to training_action enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'section_viewed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'training_action')) THEN
    ALTER TYPE training_action ADD VALUE 'section_viewed';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'certificate_downloaded' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'training_action')) THEN
    ALTER TYPE training_action ADD VALUE 'certificate_downloaded';
  END IF;
END$$;

-- 2. All guides require test
UPDATE training_materials SET requires_test = true WHERE requires_test = false;

-- 3. Update estimated_minutes by category
UPDATE training_materials SET estimated_minutes = 30 WHERE guide_code LIKE 'G-FS-%';
UPDATE training_materials SET estimated_minutes = 25 WHERE guide_code LIKE 'G-PRL-%';
UPDATE training_materials SET estimated_minutes = 20 WHERE guide_code LIKE 'G-LAB-%';
UPDATE training_materials SET estimated_minutes = 20 WHERE guide_code LIKE 'G-ROL-%';
UPDATE training_materials SET estimated_minutes = 15 WHERE guide_code LIKE 'G-DOC-%';
UPDATE training_materials SET estimated_minutes = 15 WHERE guide_code LIKE 'G-ENV-%';

-- 4. Ensure RLS allows reading training_records metadata for section tracking
-- (training_records already has policies from 028_training_compliance.sql)
