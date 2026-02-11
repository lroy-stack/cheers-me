-- ============================================================================
-- Fix: Infinite recursion in RLS policies
-- All policies that do SELECT FROM profiles/employees inside USING/WITH CHECK
-- cause infinite recursion. Replace with SECURITY DEFINER helper functions.
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS (bypass RLS via SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_employee_id()
RETURNS UUID AS $$
  SELECT id FROM employees WHERE profile_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- DROP ALL AFFECTED POLICIES
-- ============================================================================

-- From 001_initial_schema
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Staff can read employees" ON employees;
DROP POLICY IF EXISTS "Staff can read own shifts" ON shifts;
DROP POLICY IF EXISTS "Kitchen and bar can read stock" ON products;
DROP POLICY IF EXISTS "Sales visible to managers and owner" ON daily_sales;
DROP POLICY IF EXISTS "Staff can read reservations" ON reservations;
DROP POLICY IF EXISTS "Staff can read events" ON events;

-- From 002_staff_rls_policies
DROP POLICY IF EXISTS "Managers can read shift templates" ON shift_templates;
DROP POLICY IF EXISTS "Managers can create shift templates" ON shift_templates;
DROP POLICY IF EXISTS "Managers can update shift templates" ON shift_templates;
DROP POLICY IF EXISTS "Managers can delete shift templates" ON shift_templates;
DROP POLICY IF EXISTS "Managers can create employees" ON employees;
DROP POLICY IF EXISTS "Managers can update employees" ON employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON employees;
DROP POLICY IF EXISTS "Managers can create shifts" ON shifts;
DROP POLICY IF EXISTS "Managers can update shifts" ON shifts;
DROP POLICY IF EXISTS "Managers can delete shifts" ON shifts;
DROP POLICY IF EXISTS "Staff can read own availability" ON availability;
DROP POLICY IF EXISTS "Staff can create own availability" ON availability;
DROP POLICY IF EXISTS "Staff can update own availability" ON availability;
DROP POLICY IF EXISTS "Staff can delete own availability" ON availability;
DROP POLICY IF EXISTS "Staff can read own clock records" ON clock_in_out;
DROP POLICY IF EXISTS "Staff can clock in" ON clock_in_out;
DROP POLICY IF EXISTS "Staff can clock out" ON clock_in_out;
DROP POLICY IF EXISTS "Managers can delete clock records" ON clock_in_out;
DROP POLICY IF EXISTS "Staff can read relevant swap requests" ON shift_swap_requests;
DROP POLICY IF EXISTS "Staff can create swap requests" ON shift_swap_requests;
DROP POLICY IF EXISTS "Staff can update relevant swap requests" ON shift_swap_requests;
DROP POLICY IF EXISTS "Staff can delete own swap requests" ON shift_swap_requests;

-- ============================================================================
-- RECREATE POLICIES (using helper functions)
-- ============================================================================

-- == PROFILES ==
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id OR get_user_role() = 'admin');

-- == EMPLOYEES ==
CREATE POLICY "Staff can read employees"
ON employees FOR SELECT
USING (get_user_role() IN ('admin', 'manager', 'kitchen', 'bar', 'waiter'));

CREATE POLICY "Managers can create employees"
ON employees FOR INSERT
WITH CHECK (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers can update employees"
ON employees FOR UPDATE
USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Admins can delete employees"
ON employees FOR DELETE
USING (get_user_role() = 'admin');

-- == SHIFTS ==
CREATE POLICY "Staff can read own shifts"
ON shifts FOR SELECT
USING (
  employee_id = get_employee_id() OR
  get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "Managers can create shifts"
ON shifts FOR INSERT
WITH CHECK (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers can update shifts"
ON shifts FOR UPDATE
USING (
  get_user_role() IN ('admin', 'manager') OR
  employee_id = get_employee_id()
);

CREATE POLICY "Managers can delete shifts"
ON shifts FOR DELETE
USING (get_user_role() IN ('admin', 'manager'));

-- == SHIFT TEMPLATES ==
CREATE POLICY "Managers can read shift templates"
ON shift_templates FOR SELECT
USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers can create shift templates"
ON shift_templates FOR INSERT
WITH CHECK (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers can update shift templates"
ON shift_templates FOR UPDATE
USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers can delete shift templates"
ON shift_templates FOR DELETE
USING (get_user_role() IN ('admin', 'manager'));

-- == PRODUCTS (Stock) ==
CREATE POLICY "Kitchen and bar can read stock"
ON products FOR SELECT
USING (get_user_role() IN ('admin', 'manager', 'kitchen', 'bar'));

-- == DAILY SALES ==
CREATE POLICY "Sales visible to managers and owner"
ON daily_sales FOR SELECT
USING (get_user_role() IN ('admin', 'manager', 'owner'));

-- == RESERVATIONS ==
CREATE POLICY "Staff can read reservations"
ON reservations FOR SELECT
USING (get_user_role() IN ('admin', 'manager', 'waiter'));

-- == EVENTS ==
CREATE POLICY "Staff can read events"
ON events FOR SELECT
USING (get_user_role() IN ('admin', 'manager', 'dj', 'bar', 'waiter'));

-- == AVAILABILITY ==
CREATE POLICY "Staff can read own availability"
ON availability FOR SELECT
USING (
  employee_id = get_employee_id() OR
  get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "Staff can create own availability"
ON availability FOR INSERT
WITH CHECK (employee_id = get_employee_id());

CREATE POLICY "Staff can update own availability"
ON availability FOR UPDATE
USING (employee_id = get_employee_id());

CREATE POLICY "Staff can delete own availability"
ON availability FOR DELETE
USING (employee_id = get_employee_id());

-- == CLOCK IN/OUT ==
CREATE POLICY "Staff can read own clock records"
ON clock_in_out FOR SELECT
USING (
  employee_id = get_employee_id() OR
  get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "Staff can clock in"
ON clock_in_out FOR INSERT
WITH CHECK (employee_id = get_employee_id());

CREATE POLICY "Staff can clock out"
ON clock_in_out FOR UPDATE
USING (
  employee_id = get_employee_id() OR
  get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "Managers can delete clock records"
ON clock_in_out FOR DELETE
USING (get_user_role() IN ('admin', 'manager'));

-- == SHIFT SWAP REQUESTS ==
CREATE POLICY "Staff can read relevant swap requests"
ON shift_swap_requests FOR SELECT
USING (
  requested_by = get_employee_id() OR
  offered_to = get_employee_id() OR
  get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "Staff can create swap requests"
ON shift_swap_requests FOR INSERT
WITH CHECK (requested_by = get_employee_id());

CREATE POLICY "Staff can update relevant swap requests"
ON shift_swap_requests FOR UPDATE
USING (
  requested_by = get_employee_id() OR
  offered_to = get_employee_id() OR
  get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "Staff can delete own swap requests"
ON shift_swap_requests FOR DELETE
USING (
  requested_by = get_employee_id() OR
  get_user_role() IN ('admin', 'manager')
);
