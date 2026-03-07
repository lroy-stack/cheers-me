ALTER TABLE employees ADD COLUMN IF NOT EXISTS grupo_cotizacion INTEGER CHECK (grupo_cotizacion BETWEEN 1 AND 11);
