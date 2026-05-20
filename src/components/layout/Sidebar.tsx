import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Store,
  Users,
  MessageSquare,
  ShoppingBag,
  Truck,
  Wrench,
  Bug,
  LineChart,
  Wallet,
  Globe2,
  Shield,
  Sprout,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABEL, useAuth } from "@/lib/auth-context";

export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/marketplace", label: "Marketplace", icon: Store },
  { to: "/farmers", label: "Farmers", icon: Users },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/shops", label: "Shops", icon: ShoppingBag },
  { to: "/transport", label: "Transport", icon: Truck },
  { to: "/equipment", label: "Equipment", icon: Wrench },
  { to: "/disease-id", label: "Disease ID", icon: Bug },
  { to: "/market-intelligence", label: "Market Intelligence", icon: LineChart },
  { to: "/financial-hub", label: "Financial Hub", icon: Wallet },
  { to: "/community", label: "Community", icon: Globe2 },
  { to: "/admin", label: "Admin", icon: Shield },
] as const;

type Props = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export function Sidebar({ mobileOpen, onCloseMobile }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const content = (
    <div className="flex h-full flex-col gap-6 p-5">
      <Link
        to="/"
        onClick={onCloseMobile}
        className="flex items-center gap-3 px-2 py-1"
      >
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary ring-1 ring-secondary/40">
          <Sprout className="h-5 w-5 text-secondary" />
        </div>
        <div className="leading-tight">
          <div className="font-display text-lg tracking-tight">Harvest Hub</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-secondary/80">
            Zimbabwe
          </div>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active =
            to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={onCloseMobile}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "text-secondary"
                  : "text-foreground/75 hover:text-foreground hover:bg-white/[0.03]"
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-secondary/10 ring-1 ring-secondary/25"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <Icon className="relative h-[18px] w-[18px] shrink-0" />
              <span className="relative truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Season
        </div>
        <div className="mt-1 font-display text-lg">2025 / 26</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Summer cropping window
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-72 z-40">
        <div className="glass-strong h-full rounded-r-2xl">{content}</div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-50 transition-opacity",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div
          className="absolute inset-0 bg-background/70 backdrop-blur-sm"
          onClick={onCloseMobile}
        />
        <motion.aside
          initial={false}
          animate={{ x: mobileOpen ? 0 : "-100%" }}
          transition={{ type: "spring", stiffness: 400, damping: 40 }}
          className="glass-strong absolute inset-y-0 left-0 w-72 rounded-r-2xl"
        >
          <button
            onClick={onCloseMobile}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
          {content}
        </motion.aside>
      </div>
    </>
  );
}
