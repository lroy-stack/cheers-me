-- ============================================================================
-- 027b: Fix task notification triggers (message -> body)
-- The notifications table uses column 'body', not 'message'
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body)
    SELECT
      e.profile_id,
      'task_assigned',
      'New Task Assigned',
      'You have been assigned a new task: ' || NEW.title
    FROM employees e
    WHERE e.id = NEW.assigned_to;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_task_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO notifications (user_id, type, title, body)
    VALUES (
      NEW.assigned_by,
      'task_completed',
      'Task Completed',
      'Task "' || NEW.title || '" has been completed.'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
