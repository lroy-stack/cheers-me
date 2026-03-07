CREATE OR REPLACE FUNCTION prevent_early_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  record_date TIMESTAMPTZ;
BEGIN
  -- Determine the record date from the OLD row
  IF TG_TABLE_NAME = 'clock_in_out' THEN
    record_date := OLD.clock_in;
  ELSIF TG_TABLE_NAME = 'cash_register_closes' THEN
    record_date := OLD.created_at;
  ELSIF TG_TABLE_NAME = 'overhead_expenses' THEN
    record_date := OLD.created_at;
  ELSE
    record_date := now();
  END IF;

  IF record_date > (now() - INTERVAL '4 years') THEN
    RAISE EXCEPTION 'Cannot delete records newer than 4 years (Spanish labor law Art. 30 ET / tax retention requirements). Record date: %', record_date;
  END IF;

  RETURN OLD;
END;
$$;
