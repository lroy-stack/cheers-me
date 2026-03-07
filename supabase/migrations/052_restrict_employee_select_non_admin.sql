-- ============================================================================
-- Fix D-04: Restrict employee SELECT so non-admin staff can only see own record
-- Audit finding: Waiter/bar/kitchen/dj can read ALL employee columns (salary, SSN, PIN)
-- Solution: Admin/owner/manager can read all; other staff can only read own row
-- ============================================================================

DROP POLICY IF EXISTS "Staff can read employees" ON employees;

CREATE POLICY "Staff can read employees"
ON employees FOR SELECT
USING (
  -- Admin and owner can read all employees
  get_user_role() IN ('admin', 'owner')
  OR
  -- Manager can read all employees (needed for scheduling, payroll)
  get_user_role() = 'manager'
  OR
  -- Other staff (kitchen, bar, waiter, dj) can only read their own record
  (
    get_user_role() IN ('kitchen', 'bar', 'waiter', 'dj')
    AND profile_id = auth.uid()
  )
);
