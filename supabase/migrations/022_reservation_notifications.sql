-- ============================================================================
-- Reservation Notifications Enhancement
-- Version: 0.1.0
-- Description: Integrate reservations with push notification system
-- ============================================================================

-- ============================================================================
-- EXTEND NOTIFICATION TYPES
-- ============================================================================

-- Add reservation notification types to the enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'reservation_new';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'reservation_confirmed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'reservation_cancelled';

COMMENT ON TYPE notification_type IS 'Notification types including reservation alerts: reservation_new, reservation_confirmed, reservation_cancelled';

-- ============================================================================
-- FUNCTIONS: Reservation Notifications
-- ============================================================================

-- Function to notify relevant staff when a new online reservation is created
CREATE OR REPLACE FUNCTION notify_on_new_reservation()
RETURNS TRIGGER AS $$
DECLARE
  v_employee RECORD;
  v_title TEXT;
  v_body TEXT;
BEGIN
  -- Only send notification for website (public booking) reservations
  IF TG_OP = 'INSERT' AND NEW.source = 'website' THEN

    v_title := 'New Online Reservation';
    v_body := NEW.guest_name || ' - ' || NEW.party_size || ' guests on ' ||
              TO_CHAR(NEW.reservation_date, 'Mon DD') || ' at ' ||
              SUBSTRING(NEW.start_time::TEXT FROM 1 FOR 5);

    -- Notify all admin, manager, and owner profiles
    FOR v_employee IN
      SELECT DISTINCT p.id
      FROM employees e
      JOIN profiles p ON p.id = e.profile_id
      WHERE e.role IN ('admin', 'manager', 'owner')
        AND e.is_active = true
    LOOP
      -- Create notification for each relevant staff member
      PERFORM create_notification(
        v_employee.id,
        'reservation_new'::notification_type,
        v_title,
        v_body,
        jsonb_build_object(
          'reservation_id', NEW.id,
          'guest_name', NEW.guest_name,
          'party_size', NEW.party_size,
          'date', NEW.reservation_date,
          'time', NEW.start_time
        ),
        '/reservations'
      );
    END LOOP;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_on_new_reservation IS 'Sends push notifications to admin/manager/owner staff when a new online reservation is created';

-- ============================================================================
-- TRIGGERS: Auto-notify on new reservations
-- ============================================================================

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS reservation_new_notification ON reservations;

-- Create trigger to send notifications when reservations are created
CREATE TRIGGER reservation_new_notification
AFTER INSERT ON reservations
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_reservation();

-- ============================================================================
-- RLS: Allow staff to INSERT reservation confirmations
-- (Migration 009 only added SELECT policy)
-- ============================================================================

CREATE POLICY "Staff can insert reservation confirmations"
  ON reservation_confirmations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'waiter')
    )
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION notify_on_new_reservation() TO authenticated;

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMENT ON TABLE reservations IS 'Reservations now integrated with push notification system. New online reservations trigger notifications to admin/manager/owner staff automatically.';
