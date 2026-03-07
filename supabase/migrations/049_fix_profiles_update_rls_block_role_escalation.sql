-- ============================================================================
-- Fix AUTH-01: Block role self-escalation via profiles UPDATE RLS
-- Users must not be able to change their own role column.
-- Only admin and owner can change any user's role.
-- ============================================================================

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (
  -- Allow: user updating their own profile, OR admin/owner updating any profile
  auth.uid() = id
  OR get_user_role() IN ('admin', 'owner')
)
WITH CHECK (
  -- Admins and owners can set any role
  get_user_role() IN ('admin', 'owner')
  OR
  -- Regular users can update their own profile but the role column must remain unchanged
  (auth.uid() = id AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid()))
);
