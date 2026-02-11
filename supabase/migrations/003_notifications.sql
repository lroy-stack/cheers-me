-- ============================================================================
-- Notifications System for Push Notifications
-- Supports Web Push API for staff schedule alerts
-- ============================================================================

-- ============================================================================
-- NOTIFICATION TYPE ENUM
-- ============================================================================

CREATE TYPE notification_type AS ENUM (
  'schedule_published',
  'shift_assigned',
  'shift_changed',
  'shift_reminder',
  'swap_requested',
  'swap_approved',
  'swap_rejected',
  'clock_reminder',
  'system'
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PUSH SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  device_name VARCHAR(255),
  user_agent TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid());

-- Only system can create notifications (via functions/triggers)
CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can manage their own push subscriptions
CREATE POLICY "Users can read own push subscriptions"
ON push_subscriptions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create own push subscriptions"
ON push_subscriptions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own push subscriptions"
ON push_subscriptions FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own push subscriptions"
ON push_subscriptions FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Update push_subscriptions.updated_at on changes
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_subscriptions_updated_at
BEFORE UPDATE ON push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title VARCHAR,
  p_body TEXT,
  p_data JSONB DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data, action_url)
  VALUES (p_user_id, p_type, p_title, p_body, p_data, p_action_url)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify all employees when schedule is published
CREATE OR REPLACE FUNCTION notify_schedule_published()
RETURNS TRIGGER AS $$
DECLARE
  v_employee RECORD;
  v_shift_date DATE;
BEGIN
  -- Get the date of the new/updated shift
  v_shift_date := NEW.date;

  -- Only notify if this is a new shift or status changed to 'published'
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published'))) THEN
    -- Get employee profile for this shift
    SELECT p.id, p.full_name, p.email
    INTO v_employee
    FROM employees e
    JOIN profiles p ON p.id = e.profile_id
    WHERE e.id = NEW.employee_id;

    -- Create notification for the employee
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to send notification when shift is created or published
CREATE TRIGGER notify_on_shift_published
AFTER INSERT OR UPDATE ON shifts
FOR EACH ROW
EXECUTE FUNCTION notify_schedule_published();

-- Function to notify on shift swap request
CREATE OR REPLACE FUNCTION notify_shift_swap_request()
RETURNS TRIGGER AS $$
DECLARE
  v_requester RECORD;
  v_offered_to RECORD;
  v_shift RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get requester info
    SELECT p.id, p.full_name
    INTO v_requester
    FROM employees e
    JOIN profiles p ON p.id = e.profile_id
    WHERE e.id = NEW.requested_by;

    -- Get offered_to employee info
    SELECT p.id, p.full_name
    INTO v_offered_to
    FROM employees e
    JOIN profiles p ON p.id = e.profile_id
    WHERE e.id = NEW.offered_to;

    -- Get shift details
    SELECT date, shift_type, start_time, end_time
    INTO v_shift
    FROM shifts
    WHERE id = NEW.shift_id;

    -- Notify the employee being offered the swap
    PERFORM create_notification(
      v_offered_to.id,
      'swap_requested',
      'Shift Swap Request',
      format('%s wants to swap their %s shift on %s', v_requester.full_name, v_shift.shift_type, to_char(v_shift.date, 'DD/MM/YYYY')),
      jsonb_build_object(
        'swap_request_id', NEW.id,
        'shift_id', NEW.shift_id,
        'requester_name', v_requester.full_name,
        'shift_date', v_shift.date,
        'shift_type', v_shift.shift_type
      ),
      '/staff/schedule'
    );

  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- Notify requester of status change
    SELECT p.id, p.full_name
    INTO v_requester
    FROM employees e
    JOIN profiles p ON p.id = e.profile_id
    WHERE e.id = NEW.requested_by;

    -- Get shift details
    SELECT date, shift_type
    INTO v_shift
    FROM shifts
    WHERE id = NEW.shift_id;

    IF NEW.status = 'approved' THEN
      PERFORM create_notification(
        v_requester.id,
        'swap_approved',
        'Shift Swap Approved',
        format('Your shift swap request for %s on %s has been approved', v_shift.shift_type, to_char(v_shift.date, 'DD/MM/YYYY')),
        jsonb_build_object('swap_request_id', NEW.id, 'shift_id', NEW.shift_id),
        '/staff/schedule'
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM create_notification(
        v_requester.id,
        'swap_rejected',
        'Shift Swap Declined',
        format('Your shift swap request for %s on %s was declined', v_shift.shift_type, to_char(v_shift.date, 'DD/MM/YYYY')),
        jsonb_build_object('swap_request_id', NEW.id, 'shift_id', NEW.shift_id),
        '/staff/schedule'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for shift swap notifications
CREATE TRIGGER notify_on_swap_request
AFTER INSERT OR UPDATE ON shift_swap_requests
FOR EACH ROW
EXECUTE FUNCTION notify_shift_swap_request();

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================

-- Enable realtime for notifications so they appear instantly
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
