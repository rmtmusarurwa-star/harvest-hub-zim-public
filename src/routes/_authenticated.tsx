import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Menu, X } from "lucide-react";
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
      <div className="relative grid min-h-screen place-items-center" style={{ zIndex: 1 }}>
        <Loader2 className="h-5 w-5 animate-spin text-secondary" />
      </div>
    );
  }

  // Non-public route and no session → will redirect, show spinner
  if (!session && !isPublicBrowsable) {
    return (
      <div className="relative grid min-h-screen place-items-center" style={{ zIndex: 1 }}>
        <Loader2 className="h-5 w-5 animate-spin text-secondary" />
      </div>
    );
  }

  // Auth users get the full app experience
  if (session) return <AppLayout />;

  // Guests on landing page: no extra wrapper, the page is self-contained
  if (pathname === "/") return <Outlet />;

  // Guests on marketplace / market-intelligence: minimal public nav
  return <GuestLayout />;
}

function GuestLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="relative min-h-screen" style={{ zIndex: 1 }}>
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-6">
          <Link to="/" onClick={() => setMobileOpen(false)}>
            <Wordmark size={32} />
          </Link>

          {/* Desktop nav */}
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
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-secondary px-3.5 py-2 text-sm font-medium text-primary transition-colors hover:bg-secondary/90"
            >
              Get Started
            </Link>
            {/* Mobile hamburger */}
            <button
              className="grid h-9 w-9 place-items-center rounded-md border border-white/10 text-muted-foreground hover:bg-white/5 md:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="border-t border-white/5 bg-background/95 px-4 pb-4 pt-3 md:hidden">
            <nav className="flex flex-col gap-1">
              <Link
                to="/marketplace"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                Marketplace
              </Link>
              <Link
                to="/market-intelligence"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                Market Prices
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                Sign in
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 lg:px-6">
        <Outlet />
      </main>
    </div>
  );
}
