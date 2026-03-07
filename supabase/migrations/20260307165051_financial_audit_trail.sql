CREATE OR REPLACE FUNCTION log_financial_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec_id := OLD.id;
    INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES (TG_TABLE_NAME, rec_id, 'DELETE', to_jsonb(OLD), NULL, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    rec_id := NEW.id;
    INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES (TG_TABLE_NAME, rec_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    rec_id := NEW.id;
    INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES (TG_TABLE_NAME, rec_id, 'INSERT', NULL, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;
