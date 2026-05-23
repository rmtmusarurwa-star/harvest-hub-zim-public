import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  MessageCircle,
  HandCoins,
  ShoppingBag,
  PackageCheck,
  Star,
  Truck,
  Wrench,
  MessageSquare,
  Megaphone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { Database } from "@/integrations/supabase/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

const ICONS: Record<string, typeof Bell> = {
  message: MessageCircle,
  offer: HandCoins,
  order: ShoppingBag,
  order_status: PackageCheck,
  review: Star,
  transport: Truck,
  equipment: Wrench,
  forum_reply: MessageSquare,
  announcement: Megaphone,
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!cancelled && data) setItems(data as Notification[]);
      });

    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setItems((prev) => [payload.new as Notification, ...prev].slice(0, 50));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  async function markAllRead() {
    if (!user || unread === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
  }

  async function markOne(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }

  if (!user) return null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-lg text-foreground/80 hover:bg-white/5 hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="glass absolute right-0 mt-2 w-[340px] max-w-[90vw] rounded-2xl p-2 shadow-xl z-50">
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="font-display text-sm">Notifications</div>
            <button
              onClick={markAllRead}
              disabled={unread === 0}
              className="text-[11px] text-secondary/80 hover:text-secondary disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-foreground/60">
                No notifications yet
              </div>
            ) : (
              items.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                return (
                  <Link
                    key={n.id}
                    to={n.link}
                    onClick={() => {
                      markOne(n.id);
                      setOpen(false);
                    }}
                    className={`flex gap-3 rounded-lg px-2 py-2 hover:bg-white/5 ${
                      !n.read ? "bg-white/[0.03]" : ""
                    }`}
                  >
                    <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/20 text-secondary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-foreground">
                        {n.message}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-foreground/50">
                        {timeAgo(n.created_at)} ago
                      </div>
                    </div>
                    {!n.read && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
