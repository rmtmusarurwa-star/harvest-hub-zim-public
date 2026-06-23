import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth-context";
import { Wordmark } from "@/components/brand/Wordmark";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

/**
 * Adaptive layout:
 * - Auth users   → full AppLayout (sidebar + topbar) for ALL routes
 * - Guests on public-browsable routes (/, /marketplace, /market-intelligence)
 *     → minimal branded header (or no header for landing page which is self-contained)
 * - Guests on any other route → redirect to /login
 */

/** Paths that guests may browse without an account */
const PUBLIC_PATHS = ["/marketplace", "/market-intelligence"];

function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isPublicBrowsable =
    pathname === "/" ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  useEffect(() => {
    if (!loading && !session && !isPublicBrowsable) {
      navigate({ to: "/login" });
    }
  }, [loading, session, isPublicBrowsable, navigate]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background ambient-glow">
        <Loader2 className="h-5 w-5 animate-spin text-secondary" />
      </div>
    );
  }

  // Non-public route and no session → will redirect, show spinner
  if (!session && !isPublicBrowsable) {
    return (
      <div className="grid min-h-screen place-items-center bg-background ambient-glow">
        <Loader2 className="h-5 w-5 animate-spin text-secondary" />
      </div>
    );
  }

  // Auth users get the full app experience
  if (session) return <AppLayout />;

  // Guests on landing page: no extra wrapper, the page is self-contained
  if (pathname === "/") return <Outlet />;

  // Guests on marketplace / market-intelligence: minimal public nav
  return (
    <div className="min-h-screen ambient-glow mesh-bg">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-6">
          <Link to="/">
            <Wordmark size={32} />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              to="/marketplace"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Marketplace
            </Link>
            <Link
              to="/market-intelligence"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Market Prices
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-secondary px-3.5 py-2 text-sm font-medium text-primary transition-colors hover:bg-secondary/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 lg:px-6">
        <Outlet />
      </main>
    </div>
  );
}
