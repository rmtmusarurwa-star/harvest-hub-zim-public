import { Menu, ShoppingCart } from "lucide-react";
import { NotificationsBell } from "./NotificationsBell";
import { GlobalSearch } from "./GlobalSearch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ROLE_LABEL, useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { Wordmark } from "@/components/brand/Wordmark";

type Props = { onOpenMobile: () => void };

export function Topbar({ onOpenMobile }: Props) {
  const { profile, user } = useAuth();
  const { count, open } = useCart();

  const displayName =
    profile?.full_name?.trim() || user?.email?.split("@")[0] || "Account";
  const initials = (displayName || "HH")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const roleLabel = profile ? ROLE_LABEL[profile.role] : "Member";

  return (
    <header className="sticky top-0 z-30">
      <div className="glass mx-3 mt-3 flex items-center gap-3 rounded-2xl px-3 py-2.5 lg:mx-6 lg:mt-5 lg:px-5 lg:py-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden grid h-9 w-9 place-items-center rounded-lg text-foreground/80 hover:bg-white/5 hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden lg:flex items-center gap-2 pr-2">
          <Wordmark size={30} />
        </div>

        <GlobalSearch />


        <button
          onClick={open}
          className="relative grid h-9 w-9 place-items-center rounded-lg text-foreground/80 hover:bg-white/5 hover:text-foreground"
          aria-label="Cart"
        >
          <ShoppingCart className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-secondary px-1 text-[10px] font-semibold text-secondary-foreground">
              {count}
            </span>
          )}
        </button>
        <NotificationsBell />


        <div className="hidden sm:block text-right leading-tight">
          <div className="max-w-[140px] truncate text-sm text-foreground">
            {displayName}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-secondary/80">
            {roleLabel}
          </div>
        </div>

        <Avatar className="h-9 w-9 ring-1 ring-secondary/40">
          <AvatarFallback className="bg-primary text-secondary font-display">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
