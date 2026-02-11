-- ============================================================================
-- Migration 020: Fix shift notification trigger
-- Only notify when a shift belongs to a PUBLISHED schedule plan,
-- not on every INSERT (which fires during draft creation/sync).
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_schedule_published()
RETURNS TRIGGER AS $$
DECLARE
  v_employee RECORD;
  v_plan_status TEXT;
BEGIN
  -- Only notify if the shift belongs to a published schedule plan
  -- or if it's a standalone shift (no plan) that was explicitly created
  IF NEW.schedule_plan_id IS NOT NULL THEN
    SELECT status INTO v_plan_status
    FROM schedule_plans
    WHERE id = NEW.schedule_plan_id;

    -- Skip notification if plan is still draft
    IF v_plan_status IS DISTINCT FROM 'published' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Only notify on INSERT or when status changes to 'published'
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published'))) THEN
    SELECT p.id, p.full_name, p.email
    INTO v_employee
    FROM employees e
    JOIN profiles p ON p.id = e.profile_id
    WHERE e.id = NEW.employee_id;

    IF v_employee.id IS NOT NULL THEN
      PERFORM create_notification(
        v_employee.id,
        'shift_assigned',
        'New Shift Assigned',
        format('You have been scheduled for a %s shift on %s', NEW.shift_type, to_char(NEW.date, 'DD/MM/YYYY')),
        jsonb_build_object(
          'shift_id', NEW.id,
          'shift_type', NEW.shift_type,
          'date', NEW.date,
          'start_time', NEW.start_time,
          'end_time', NEW.end_time
        ),
        '/staff/schedule'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
