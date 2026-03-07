-- Migration 059: Clock record immutability trigger (Feature #38)
-- Prevents modification of clock_in_time after insertion.
-- Only allows clock_out_time update if currently NULL.
-- Logs rejected attempts to audit_log.

CREATE OR REPLACE FUNCTION prevent_clock_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Block any change to clock_in_time
  IF OLD.clock_in_time IS DISTINCT FROM NEW.clock_in_time THEN
    -- Log the rejected attempt
    INSERT INTO audit_log (
      table_name, record_id, action, changed_by,
      old_values, new_values, rejection_reason
    ) VALUES (
      'clock_in_out',
      OLD.id,
      'REJECTED',
      auth.uid(),
      jsonb_build_object('clock_in_time', OLD.clock_in_time),
      jsonb_build_object('clock_in_time', NEW.clock_in_time),
      'clock_in_time is immutable after insertion'
    );
    RAISE EXCEPTION 'clock_in_time cannot be modified after insertion';
  END IF;

  -- Block update to clock_out_time if it is already set (not NULL)
  IF OLD.clock_out_time IS NOT NULL AND OLD.clock_out_time IS DISTINCT FROM NEW.clock_out_time THEN
    -- Log the rejected attempt
    INSERT INTO audit_log (
      table_name, record_id, action, changed_by,
      old_values, new_values, rejection_reason
    ) VALUES (
      'clock_in_out',
      OLD.id,
      'REJECTED',
      auth.uid(),
      jsonb_build_object('clock_out_time', OLD.clock_out_time),
      jsonb_build_object('clock_out_time', NEW.clock_out_time),
      'clock_out_time cannot be changed once set'
    );
    RAISE EXCEPTION 'clock_out_time cannot be modified once set';
  END IF;

  -- Log legitimate updates to audit_log
  INSERT INTO audit_log (
    table_name, record_id, action, changed_by,
    old_values, new_values
  ) VALUES (
    'clock_in_out',
    OLD.id,
    'UPDATE',
    auth.uid(),
    jsonb_build_object(
      'clock_in_time', OLD.clock_in_time,
      'clock_out_time', OLD.clock_out_time
    ),
    jsonb_build_object(
      'clock_in_time', NEW.clock_in_time,
      'clock_out_time', NEW.clock_out_time
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
