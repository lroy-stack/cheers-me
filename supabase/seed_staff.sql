-- ============================================================================
-- Staff Management: Seed Data for Development
-- Provides sample employees, shifts, templates for testing
-- ============================================================================

-- NOTE: This seed assumes profiles have been created via Supabase Auth.
-- In real setup, create test users via Supabase Dashboard or auth API first.

-- ============================================================================
-- SHIFT TEMPLATES
-- ============================================================================

INSERT INTO shift_templates (name, shift_type, start_time, end_time, break_duration_minutes) VALUES
  ('Morning Shift', 'morning', '10:30', '17:00', 30),
  ('Afternoon Shift', 'afternoon', '17:00', '23:00', 30),
  ('Night Shift', 'night', '23:00', '03:00', 15),
  ('Lunch Rush', 'afternoon', '12:00', '16:00', 0),
  ('Dinner Service', 'afternoon', '18:00', '22:00', 15),
  ('Weekend Double', 'morning', '10:30', '23:00', 90);

-- ============================================================================
-- SAMPLE EMPLOYEES
-- ============================================================================

-- NOTE: Replace these UUIDs with actual profile IDs from your Supabase Auth
-- For development, create test users first, then update these INSERT statements

-- Example structure (DO NOT RUN AS-IS - update with real profile_ids):

/*
INSERT INTO employees (profile_id, hourly_rate, contract_type, date_hired) VALUES
  ('00000000-0000-0000-0000-000000000001', 15.50, 'full_time', '2024-04-01'),  -- Manager
  ('00000000-0000-0000-0000-000000000002', 12.00, 'part_time', '2024-05-15'),  -- Kitchen
  ('00000000-0000-0000-0000-000000000003', 11.50, 'part_time', '2024-06-01'),  -- Waiter
  ('00000000-0000-0000-0000-000000000004', 11.50, 'casual', '2024-06-10'),     -- Waiter
  ('00000000-0000-0000-0000-000000000005', 12.50, 'part_time', '2024-05-20'),  -- Bar
  ('00000000-0000-0000-0000-000000000006', 80.00, 'contractor', '2024-04-01'); -- DJ
*/

-- ============================================================================
-- SAMPLE AVAILABILITY
-- ============================================================================

-- Example: Employee 2 (kitchen staff) marks unavailable dates

/*
INSERT INTO availability (employee_id, date, available, reason) VALUES
  ((SELECT id FROM employees WHERE profile_id = '00000000-0000-0000-0000-000000000002'), '2026-02-10', false, 'Personal appointment'),
  ((SELECT id FROM employees WHERE profile_id = '00000000-0000-0000-0000-000000000002'), '2026-02-15', false, 'Family event');
*/

-- ============================================================================
-- SAMPLE SHIFTS (Current Week)
-- ============================================================================

-- Example: Create shifts for the week of Feb 10-16, 2026

/*
-- Monday Feb 10
INSERT INTO shifts (employee_id, date, shift_type, start_time, end_time, break_duration_minutes, status) VALUES
  ((SELECT id FROM employees WHERE profile_id = '00000000-0000-0000-0000-000000000002'), '2026-02-10', 'morning', '10:30', '17:00', 30, 'scheduled'),
  ((SELECT id FROM employees WHERE profile_id = '00000000-0000-0000-0000-000000000003'), '2026-02-10', 'afternoon', '17:00', '23:00', 30, 'scheduled'),
  ((SELECT id FROM employees WHERE profile_id = '00000000-0000-0000-0000-000000000005'), '2026-02-10', 'afternoon', '17:00', '23:00', 30, 'scheduled'),
  ((SELECT id FROM employees WHERE profile_id = '00000000-0000-0000-0000-000000000006'), '2026-02-10', 'night', '22:00', '03:00', 0, 'scheduled');

-- Tuesday Feb 11
INSERT INTO shifts (employee_id, date, shift_type, start_time, end_time, break_duration_minutes, status) VALUES
  ((SELECT id FROM employees WHERE profile_id = '00000000-0000-0000-0000-000000000002'), '2026-02-11', 'morning', '10:30', '17:00', 30, 'scheduled'),
  ((SELECT id FROM employees WHERE profile_id = '00000000-0000-0000-0000-000000000004'), '2026-02-11', 'afternoon', '17:00', '23:00', 30, 'scheduled'),
  ((SELECT id FROM employees WHERE profile_id = '00000000-0000-0000-0000-000000000005'), '2026-02-11', 'afternoon', '17:00', '23:00', 30, 'scheduled'),
  ((SELECT id FROM employees WHERE profile_id = '00000000-0000-0000-0000-000000000006'), '2026-02-11', 'night', '22:00', '03:00', 0, 'scheduled');

-- (Continue for rest of week...)
*/

-- ============================================================================
-- SAMPLE CLOCK IN/OUT RECORDS
-- ============================================================================

-- Example: Yesterday's completed shifts

/*
INSERT INTO clock_in_out (employee_id, shift_id, clock_in_time, clock_out_time) VALUES
  (
    (SELECT id FROM employees WHERE profile_id = '00000000-0000-0000-0000-000000000002'),
    (SELECT id FROM shifts WHERE employee_id = (SELECT id FROM employees WHERE profile_id = '00000000-0000-0000-0000-000000000002') AND date = '2026-02-09' LIMIT 1),
    '2026-02-09 10:28:00+00',
    '2026-02-09 17:05:00+00'
  ),
  (
    (SELECT id FROM employees WHERE profile_id = '00000000-0000-0000-0000-000000000003'),
    (SELECT id FROM shifts WHERE employee_id = (SELECT id FROM employees WHERE profile_id = '00000000-0000-0000-0000-000000000003') AND date = '2026-02-09' LIMIT 1),
    '2026-02-09 16:55:00+00',
    '2026-02-09 23:10:00+00'
  );
*/

-- ============================================================================
-- SAMPLE SHIFT SWAP REQUEST
-- ============================================================================

-- Example: Employee 3 (waiter) wants to swap shift with Employee 4 (another waiter)

/*
INSERT INTO shift_swap_requests (shift_id, requested_by, offered_to, status, reason) VALUES
  (
    (SELECT id FROM shifts WHERE employee_id = (SELECT id FROM employees WHERE profile_id = '00000000-0000-0000-0000-000000000003') AND date = '2026-02-14' LIMIT 1),
    (SELECT id FROM employees WHERE profile_id = '00000000-0000-0000-0000-000000000003'),
    (SELECT id FROM employees WHERE profile_id = '00000000-0000-0000-0000-000000000004'),
    'pending',
    'Need to attend family birthday'
  );
*/

-- ============================================================================
-- DEVELOPMENT HELPERS
-- ============================================================================

-- View to see full employee details (profiles + employment data)
CREATE OR REPLACE VIEW v_employees_full AS
SELECT
  e.id AS employee_id,
  e.hourly_rate,
  e.contract_type,
  e.date_hired,
  e.date_terminated,
  p.id AS profile_id,
  p.email,
  p.full_name,
  p.role,
  p.phone,
  p.emergency_contact,
  p.emergency_phone,
  p.active
FROM employees e
JOIN profiles p ON e.profile_id = p.id
ORDER BY p.full_name;

-- View to see this week's shifts with employee names
CREATE OR REPLACE VIEW v_shifts_this_week AS
SELECT
  s.id AS shift_id,
  s.date,
  s.shift_type,
  s.start_time,
  s.end_time,
  s.break_duration_minutes,
  s.status,
  p.full_name AS employee_name,
  p.role AS employee_role,
  e.hourly_rate,
  -- Calculate shift hours (assuming no overnight shifts for simplicity)
  ROUND(
    (EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600) - (s.break_duration_minutes / 60.0),
    2
  ) AS hours_scheduled
FROM shifts s
JOIN employees e ON s.employee_id = e.id
JOIN profiles p ON e.profile_id = p.id
WHERE s.date >= DATE_TRUNC('week', CURRENT_DATE)
  AND s.date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
ORDER BY s.date, s.start_time;

-- View to see pending shift swap requests with employee names
CREATE OR REPLACE VIEW v_pending_swap_requests AS
SELECT
  ssr.id AS swap_request_id,
  s.date AS shift_date,
  s.start_time,
  s.end_time,
  p_req.full_name AS requested_by_name,
  p_off.full_name AS offered_to_name,
  ssr.reason,
  ssr.status,
  ssr.created_at
FROM shift_swap_requests ssr
JOIN shifts s ON ssr.shift_id = s.id
JOIN employees e_req ON ssr.requested_by = e_req.id
JOIN profiles p_req ON e_req.profile_id = p_req.id
JOIN employees e_off ON ssr.offered_to = e_off.id
JOIN profiles p_off ON e_off.profile_id = p_off.id
WHERE ssr.status = 'pending'
ORDER BY ssr.created_at;

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================

/*
1. Create test users via Supabase Dashboard:
   - Go to Authentication > Users
   - Add users with emails like: manager@cheers.test, kitchen@cheers.test, etc.
   - Copy their UUIDs

2. Update profiles with correct roles:
   UPDATE profiles SET role = 'manager' WHERE email = 'manager@cheers.test';
   UPDATE profiles SET role = 'kitchen' WHERE email = 'kitchen@cheers.test';
   UPDATE profiles SET role = 'waiter' WHERE email = 'waiter@cheers.test';
   UPDATE profiles SET role = 'bar' WHERE email = 'bar@cheers.test';
   UPDATE profiles SET role = 'dj' WHERE email = 'dj@cheers.test';

3. Replace profile_id UUIDs in the commented INSERT statements above

4. Uncomment and run the INSERT statements

5. Test RLS policies by logging in as different users and querying tables

6. Use the views to quickly see aggregated data:
   SELECT * FROM v_employees_full;
   SELECT * FROM v_shifts_this_week;
   SELECT * FROM v_pending_swap_requests;
*/
