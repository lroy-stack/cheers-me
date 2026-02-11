-- ============================================================================
-- Stock Alerts Notifications Enhancement
-- Version: 0.1.0
-- Description: Integrate stock alerts with push notification system
-- ============================================================================

-- ============================================================================
-- EXTEND NOTIFICATION TYPES
-- ============================================================================

-- Add stock alert notification types to the enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'stock_low';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'stock_out';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'beer_keg_low';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'stock_critical';

COMMENT ON TYPE notification_type IS 'Notification types including stock alerts: stock_low, stock_out, beer_keg_low, stock_critical';

-- ============================================================================
-- FUNCTIONS: Stock Alert Notifications
-- ============================================================================

-- Function to notify relevant staff when stock alert is created
CREATE OR REPLACE FUNCTION notify_stock_alert()
RETURNS TRIGGER AS $$
DECLARE
  v_employee RECORD;
  v_notification_type notification_type;
  v_title TEXT;
  v_body TEXT;
BEGIN
  -- Only send notification for new unresolved alerts
  IF TG_OP = 'INSERT' AND NEW.resolved = false THEN

    -- Determine notification type based on alert_type
    CASE NEW.alert_type
      WHEN 'out_of_stock' THEN
        v_notification_type := 'stock_out';
        v_title := 'Out of Stock Alert';
      WHEN 'low_stock' THEN
        v_notification_type := 'stock_low';
        v_title := 'Low Stock Alert';
      WHEN 'beer_low' THEN
        v_notification_type := 'beer_keg_low';
        v_title := 'Beer Keg Running Low';
      WHEN 'expiring_soon' THEN
        v_notification_type := 'stock_critical';
        v_title := 'Product Expiring Soon';
      ELSE
        v_notification_type := 'stock_critical';
        v_title := 'Stock Alert';
    END CASE;

    -- Use the message from the alert
    v_body := NEW.message;

    -- Notify all kitchen and bar staff (they manage stock)
    FOR v_employee IN
      SELECT DISTINCT p.id
      FROM employees e
      JOIN profiles p ON p.id = e.profile_id
      WHERE e.role IN ('kitchen', 'bar', 'manager', 'admin')
        AND e.is_active = true
    LOOP
      -- Create notification for each relevant employee
      PERFORM create_notification(
        v_employee.id,
        v_notification_type,
        v_title,
        v_body,
        jsonb_build_object(
          'alert_id', NEW.id,
          'product_id', NEW.product_id,
          'alert_type', NEW.alert_type,
          'current_value', NEW.current_value,
          'threshold_value', NEW.threshold_value
        ),
        '/stock' -- Link to stock management page
      );
    END LOOP;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_stock_alert IS 'Sends push notifications to kitchen/bar staff when stock alerts are triggered';

-- ============================================================================
-- TRIGGERS: Auto-notify on stock alerts
-- ============================================================================

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS stock_alert_notification ON stock_alerts;

-- Create trigger to send notifications when stock alerts are created
CREATE TRIGGER stock_alert_notification
AFTER INSERT ON stock_alerts
FOR EACH ROW
EXECUTE FUNCTION notify_stock_alert();

-- ============================================================================
-- HELPER FUNCTION: Get staff needing stock alerts
-- ============================================================================

-- Function to get all employees who should receive stock alerts
CREATE OR REPLACE FUNCTION get_stock_alert_recipients()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as user_id,
    p.full_name,
    p.email,
    e.role::TEXT
  FROM employees e
  JOIN profiles p ON p.id = e.profile_id
  WHERE e.role IN ('kitchen', 'bar', 'manager', 'admin')
    AND e.is_active = true
  ORDER BY
    CASE e.role
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'kitchen' THEN 3
      WHEN 'bar' THEN 4
      ELSE 5
    END,
    p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_stock_alert_recipients IS 'Returns all active staff members who should receive stock alert notifications';

-- ============================================================================
-- MANUAL ALERT TRIGGER FUNCTION
-- ============================================================================

-- Function to manually check all products for alerts (useful for testing and manual runs)
CREATE OR REPLACE FUNCTION trigger_all_stock_alerts()
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  alert_type TEXT,
  alert_created BOOLEAN
) AS $$
DECLARE
  v_product RECORD;
  v_alert_created BOOLEAN;
BEGIN
  -- Check all products
  FOR v_product IN
    SELECT id, name, current_stock, min_stock, category
    FROM products
    WHERE is_active = true
  LOOP
    -- Check and create alerts if needed
    PERFORM check_low_stock_alert(v_product.id);

    -- Check if an alert was created
    SELECT EXISTS (
      SELECT 1 FROM stock_alerts
      WHERE product_id = v_product.id
        AND resolved = false
        AND created_at > NOW() - INTERVAL '1 minute'
    ) INTO v_alert_created;

    -- Return info about products that triggered alerts
    IF v_alert_created THEN
      RETURN QUERY
      SELECT
        v_product.id,
        v_product.name,
        CASE
          WHEN v_product.current_stock <= 0 THEN 'out_of_stock'
          WHEN v_product.current_stock < v_product.min_stock THEN 'low_stock'
          ELSE 'unknown'
        END::TEXT,
        true;
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trigger_all_stock_alerts IS 'Manually check all products and trigger stock alerts. Returns products that triggered new alerts.';

-- ============================================================================
-- VIEWS: Alert Statistics
-- ============================================================================

-- View for stock alert statistics by category
CREATE OR REPLACE VIEW v_stock_alert_stats AS
SELECT
  p.category,
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (WHERE sa.alert_type = 'out_of_stock') as out_of_stock_count,
  COUNT(*) FILTER (WHERE sa.alert_type = 'low_stock') as low_stock_count,
  COUNT(*) FILTER (WHERE sa.alert_type = 'beer_low') as beer_low_count,
  COUNT(*) FILTER (WHERE sa.resolved = false) as unresolved_count,
  AVG(EXTRACT(EPOCH FROM (COALESCE(sa.resolved_at, NOW()) - sa.created_at)) / 3600)::DECIMAL(10,2) as avg_resolution_hours,
  MIN(sa.created_at) as oldest_unresolved_alert
FROM stock_alerts sa
JOIN products p ON p.id = sa.product_id
WHERE sa.created_at > NOW() - INTERVAL '30 days'
GROUP BY p.category
ORDER BY unresolved_count DESC, p.category;

COMMENT ON VIEW v_stock_alert_stats IS 'Stock alert statistics by category for last 30 days';

-- View for critical stock alerts requiring immediate attention
CREATE OR REPLACE VIEW v_critical_stock_alerts AS
SELECT
  sa.id as alert_id,
  p.id as product_id,
  p.name as product_name,
  p.category,
  sa.alert_type,
  sa.current_value,
  sa.threshold_value,
  sa.message,
  sa.created_at,
  EXTRACT(EPOCH FROM (NOW() - sa.created_at)) / 3600 as hours_unresolved,
  s.name as supplier_name,
  s.contact_person as supplier_contact,
  s.phone as supplier_phone,
  CASE sa.alert_type
    WHEN 'out_of_stock' THEN 1
    WHEN 'beer_low' THEN 2
    WHEN 'low_stock' THEN 3
    ELSE 4
  END as priority_order
FROM stock_alerts sa
JOIN products p ON p.id = sa.product_id
LEFT JOIN suppliers s ON p.supplier_id = s.id
WHERE sa.resolved = false
ORDER BY priority_order ASC, hours_unresolved DESC;

COMMENT ON VIEW v_critical_stock_alerts IS 'All unresolved stock alerts with supplier info, ordered by priority';

-- ============================================================================
-- FUNCTION: Resolve expired alerts
-- ============================================================================

-- Function to auto-resolve alerts that are no longer valid
-- (e.g., stock was replenished but alert wasn't manually resolved)
CREATE OR REPLACE FUNCTION resolve_outdated_alerts()
RETURNS TABLE (
  alert_id UUID,
  product_name TEXT,
  alert_type TEXT
) AS $$
BEGIN
  -- Resolve low_stock alerts where stock is now above minimum
  UPDATE stock_alerts sa
  SET resolved = true, resolved_at = NOW()
  FROM products p
  WHERE sa.product_id = p.id
    AND sa.alert_type = 'low_stock'
    AND sa.resolved = false
    AND p.current_stock >= COALESCE(p.min_stock, 0);

  -- Resolve out_of_stock alerts where stock is now available
  UPDATE stock_alerts sa
  SET resolved = true, resolved_at = NOW()
  FROM products p
  WHERE sa.product_id = p.id
    AND sa.alert_type = 'out_of_stock'
    AND sa.resolved = false
    AND p.current_stock > 0;

  -- Return resolved alerts
  RETURN QUERY
  SELECT
    sa.id,
    p.name,
    sa.alert_type::TEXT
  FROM stock_alerts sa
  JOIN products p ON p.id = sa.product_id
  WHERE sa.resolved = true
    AND sa.resolved_at > NOW() - INTERVAL '1 minute';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION resolve_outdated_alerts IS 'Auto-resolves alerts that are no longer valid based on current stock levels';

-- ============================================================================
-- SCHEDULED TASK SUGGESTION
-- ============================================================================

-- NOTE: This function should be called periodically via:
-- 1. Supabase Edge Function with cron trigger (recommended)
-- 2. External cron job calling API endpoint
-- 3. pg_cron extension (if available)
--
-- Example cron schedule: Every 15 minutes during operating hours
-- SELECT resolve_outdated_alerts();
-- SELECT trigger_all_stock_alerts();

COMMENT ON TABLE stock_alerts IS 'Stock alerts with automatic notifications to kitchen/bar staff. Alerts trigger push notifications via notify_stock_alert() function.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Ensure authenticated users can execute these functions
GRANT EXECUTE ON FUNCTION trigger_all_stock_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_outdated_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_stock_alert_recipients() TO authenticated;

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMENT ON SCHEMA public IS 'Stock alerts now integrated with push notification system. Alerts sent to kitchen/bar/manager staff automatically.';
