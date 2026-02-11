-- ============================================
-- 038: Add INSERT/UPDATE/DELETE RLS policies to events table
-- Fix: "new row violates row-level security policy for table events"
-- The events table only had a SELECT policy (from 004_fix_rls_recursion.sql)
-- ============================================

-- INSERT: admin, manager, dj can create events
CREATE POLICY "Staff can create events"
ON events FOR INSERT
WITH CHECK (get_user_role() IN ('admin', 'manager', 'dj'));

-- UPDATE: admin, manager, dj can update events
CREATE POLICY "Staff can update events"
ON events FOR UPDATE
USING (get_user_role() IN ('admin', 'manager', 'dj'));

-- DELETE: admin, manager can delete events
CREATE POLICY "Managers can delete events"
ON events FOR DELETE
USING (get_user_role() IN ('admin', 'manager'));
