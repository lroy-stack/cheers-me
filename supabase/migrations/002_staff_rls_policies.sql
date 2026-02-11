-- ============================================================================
-- Staff Management: Additional RLS Policies
-- Adds INSERT/UPDATE/DELETE policies for complete CRUD operations
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON MISSING STAFF TABLES
-- ============================================================================

ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SHIFT TEMPLATES POLICIES
-- ============================================================================

-- Only managers/admins can read shift templates
CREATE POLICY "Managers can read shift templates"
ON shift_templates FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Only managers/admins can create shift templates
CREATE POLICY "Managers can create shift templates"
ON shift_templates FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Only managers/admins can update shift templates
CREATE POLICY "Managers can update shift templates"
ON shift_templates FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Only managers/admins can delete shift templates
CREATE POLICY "Managers can delete shift templates"
ON shift_templates FOR DELETE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- ============================================================================
-- EMPLOYEES POLICIES (INSERT/UPDATE/DELETE)
-- ============================================================================

-- Only managers/admins can create employees
CREATE POLICY "Managers can create employees"
ON employees FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Only managers/admins can update employees
CREATE POLICY "Managers can update employees"
ON employees FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Only admins can delete employees (soft delete recommended via date_terminated)
CREATE POLICY "Admins can delete employees"
ON employees FOR DELETE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- ============================================================================
-- SHIFTS POLICIES (INSERT/UPDATE/DELETE)
-- ============================================================================

-- Managers can create shifts for anyone
CREATE POLICY "Managers can create shifts"
ON shifts FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Managers can update any shift, staff can update notes on their own shifts
CREATE POLICY "Managers can update shifts"
ON shifts FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager') OR
  (employee_id = (SELECT id FROM employees WHERE profile_id = auth.uid()))
);

-- Only managers can delete shifts
CREATE POLICY "Managers can delete shifts"
ON shifts FOR DELETE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- ============================================================================
-- AVAILABILITY POLICIES
-- ============================================================================

-- Staff can read their own availability, managers can read all
CREATE POLICY "Staff can read own availability"
ON availability FOR SELECT
USING (
  employee_id = (SELECT id FROM employees WHERE profile_id = auth.uid()) OR
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Staff can mark their own availability
CREATE POLICY "Staff can create own availability"
ON availability FOR INSERT
WITH CHECK (
  employee_id = (SELECT id FROM employees WHERE profile_id = auth.uid())
);

-- Staff can update their own availability
CREATE POLICY "Staff can update own availability"
ON availability FOR UPDATE
USING (
  employee_id = (SELECT id FROM employees WHERE profile_id = auth.uid())
);

-- Staff can delete their own availability records
CREATE POLICY "Staff can delete own availability"
ON availability FOR DELETE
USING (
  employee_id = (SELECT id FROM employees WHERE profile_id = auth.uid())
);

-- ============================================================================
-- CLOCK IN/OUT POLICIES
-- ============================================================================

-- Staff can read their own clock records, managers can read all
CREATE POLICY "Staff can read own clock records"
ON clock_in_out FOR SELECT
USING (
  employee_id = (SELECT id FROM employees WHERE profile_id = auth.uid()) OR
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Staff can clock in (create new clock record)
CREATE POLICY "Staff can clock in"
ON clock_in_out FOR INSERT
WITH CHECK (
  employee_id = (SELECT id FROM employees WHERE profile_id = auth.uid())
);

-- Staff can clock out (update their own record to add clock_out_time)
CREATE POLICY "Staff can clock out"
ON clock_in_out FOR UPDATE
USING (
  employee_id = (SELECT id FROM employees WHERE profile_id = auth.uid()) OR
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Only managers can delete clock records (in case of errors)
CREATE POLICY "Managers can delete clock records"
ON clock_in_out FOR DELETE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- ============================================================================
-- SHIFT SWAP REQUESTS POLICIES
-- ============================================================================

-- Staff can read swap requests involving them, managers can read all
CREATE POLICY "Staff can read relevant swap requests"
ON shift_swap_requests FOR SELECT
USING (
  requested_by = (SELECT id FROM employees WHERE profile_id = auth.uid()) OR
  offered_to = (SELECT id FROM employees WHERE profile_id = auth.uid()) OR
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Staff can create swap requests for their own shifts
CREATE POLICY "Staff can create swap requests"
ON shift_swap_requests FOR INSERT
WITH CHECK (
  requested_by = (SELECT id FROM employees WHERE profile_id = auth.uid())
);

-- Staff can update swap requests they're involved in (to accept/reject)
-- Managers can update any swap request
CREATE POLICY "Staff can update relevant swap requests"
ON shift_swap_requests FOR UPDATE
USING (
  requested_by = (SELECT id FROM employees WHERE profile_id = auth.uid()) OR
  offered_to = (SELECT id FROM employees WHERE profile_id = auth.uid()) OR
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Staff can delete their own pending swap requests, managers can delete any
CREATE POLICY "Staff can delete own swap requests"
ON shift_swap_requests FOR DELETE
USING (
  requested_by = (SELECT id FROM employees WHERE profile_id = auth.uid()) OR
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- ============================================================================
-- REALTIME PUBLICATION (for shift updates notifications)
-- ============================================================================

-- Enable realtime for shifts table so staff receive live schedule updates
ALTER PUBLICATION supabase_realtime ADD TABLE shifts;

-- Enable realtime for shift_swap_requests so staff see swap approvals instantly
ALTER PUBLICATION supabase_realtime ADD TABLE shift_swap_requests;

-- Enable realtime for clock_in_out for manager dashboard live updates
ALTER PUBLICATION supabase_realtime ADD TABLE clock_in_out;
