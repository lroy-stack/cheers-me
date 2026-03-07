-- Add DNI/NIE, IBAN, address fields, and expanded Spanish contract types to employees
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS dni_nie TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS address_street TEXT,
  ADD COLUMN IF NOT EXISTS address_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS address_city TEXT,
  ADD COLUMN IF NOT EXISTS address_province TEXT,
  ADD COLUMN IF NOT EXISTS address_country TEXT DEFAULT 'España',
  ADD COLUMN IF NOT EXISTS contract_type_es TEXT;
