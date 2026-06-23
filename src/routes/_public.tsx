import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Loader2, Sprout } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth-context";
import { FieldMapBackground } from "@/components/brand/FieldMapBackground";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});

/**
 * Adaptive layout for publicly browsable pages (marketplace, market-intelligence).
 * - Authenticated users see the full app layout (sidebar + topbar).
 * - Guests see a minimal branded header with Sign In / Get Started buttons.
 */
function PublicLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background ambient-glow">
        <Loader2 className="h-5 w-5 animate-spin text-secondary" />
      </div>
    );
  }

  // Logged-in users get the full experience
  if (session) return <AppLayout />;

  // Guests get a minimal branded header
  return (
    <div className="min-h-screen ambient-glow mesh-bg">
      <FieldMapBackground />

      {/* Public nav */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary">
              <Sprout className="h-4 w-4 text-secondary" />
            </div>
            <span className="font-display text-lg text-foreground">
              Harvest Hub
            </span>
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
