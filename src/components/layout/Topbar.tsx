import { Bell, Menu, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Props = { onOpenMobile: () => void };

export function Topbar({ onOpenMobile }: Props) {
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
          <span className="font-display text-base tracking-tight">
            Harvest Hub
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-secondary/80">
            ZW
          </span>
        </div>

        <div className="flex-1">
          <div
            className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm text-muted-foreground"
            aria-disabled
          >
            <Search className="h-4 w-4" />
            <span className="truncate">
              Search farmers, produce, shops, equipment…
            </span>
            <kbd className="ml-auto hidden sm:inline-flex h-5 items-center rounded border border-white/10 bg-white/5 px-1.5 text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </div>
        </div>

        <button
          className="relative grid h-9 w-9 place-items-center rounded-lg text-foreground/80 hover:bg-white/5 hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />
        </button>

        <Avatar className="h-9 w-9 ring-1 ring-secondary/40">
          <AvatarFallback className="bg-primary text-secondary font-display">
            HH
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
