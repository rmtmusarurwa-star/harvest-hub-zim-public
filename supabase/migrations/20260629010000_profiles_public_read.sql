-- Allow any authenticated user to read any profile row.
-- This is required so that:
--   • Farmers can see buyer names in their transaction history
--   • Buyers can see seller/farmer names in their order history
--   • Chat participants can see each other's display name
--   • Community posts show the author's full_name
--
-- Phone numbers are NOT exposed here — they are protected by the
-- get_my_phone() SECURITY DEFINER RPC which only returns the caller's own number.

-- Drop any conflicting "own profile only" policies that might exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

-- Allow all authenticated users to SELECT any profile row
CREATE POLICY "Authenticated users can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Anon users can also read profiles (needed for public marketplace listings
-- that show the farmer name without requiring login).
CREATE POLICY "Anon users can read all profiles"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (true);

-- Users can still only UPDATE their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
