import { useAuth } from "@/lib/auth-context";

/** Only this email address has admin access. */
const ADMIN_EMAIL = "rmtmusarurwa@icloud.com";

/**
 * Returns true only for the single designated admin account.
 * Check is purely on the authenticated Supabase email — no extra DB query.
 */
export function useIsAdmin() {
  const { user, loading } = useAuth();

  const isAdmin = !loading && !!user && user.email === ADMIN_EMAIL;

  return { isAdmin, loading };
}
