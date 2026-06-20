import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type Event = {
  id: string;
  text: string;
  link: string | null;
  at: string;
};

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function LiveActivityFeed() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      // Pull recent agent activity + recent notifications, merge.
      const [activity, notifs] = await Promise.all([
        supabase
          .from("agent_activity_log")
          .select("id, title, link, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("notifications")
          .select("id, message, link, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      if (cancelled) return;
      const merged: Event[] = [
        ...(activity.data ?? []).map((r) => ({ id: `a-${r.id}`, text: r.title, link: r.link, at: r.created_at })),
        ...(notifs.data ?? []).map((r) => ({ id: `n-${r.id}`, text: r.message, link: r.link, at: r.created_at })),
      ]
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 5);
      setEvents(merged);
    })();

    const channel = supabase
      .channel(`live-feed-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_activity_log", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const r = payload.new as { id: string; title: string; link: string | null; created_at: string };
          setEvents((prev) => [{ id: `a-${r.id}`, text: r.title, link: r.link, at: r.created_at }, ...prev].slice(0, 5));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const r = payload.new as { id: string; message: string; link: string | null; created_at: string };
          setEvents((prev) => [{ id: `n-${r.id}`, text: r.message, link: r.link, at: r.created_at }, ...prev].slice(0, 5));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="glass rounded-2xl p-4 lg:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-secondary" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-secondary/90">
          Live Activity
        </span>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-muted-foreground">
          No activity yet. List a product to get started.
        </div>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {events.map((e) => {
              const body = (
                <>
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-foreground/90">{e.text}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {relative(e.at)}
                    </div>
                  </div>
                </>
              );
              return (
                <motion.li
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-3 text-sm"
                >
                  {e.link ? (
                    <a href={e.link} className="flex w-full items-start gap-3 hover:text-foreground">
                      {body}
                    </a>
                  ) : (
                    body
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
