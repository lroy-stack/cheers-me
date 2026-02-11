-- ============================================================================
-- Fix: Allow managers and owners to read all profiles
-- Previously only admins could read other users' profiles, causing managers
-- to only see their own employee record when joining employees → profiles.
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (
  auth.uid() = id
  OR get_user_role() IN ('admin', 'manager', 'owner')
);
