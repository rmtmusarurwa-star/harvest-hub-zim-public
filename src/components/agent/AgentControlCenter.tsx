import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Bot, Users, Stethoscope, BarChart3, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type AgentKind = "sales" | "buyers" | "disease" | "market" | "transport";

const AGENT_META: Record<AgentKind, { name: string; icon: React.ComponentType<{ className?: string }>; idleSummary: string }> = {
  sales: { name: "Sales Agent", icon: Bot, idleSummary: "No tasks yet today" },
  buyers: { name: "Buyer Matching Agent", icon: Users, idleSummary: "Awaiting your next listing" },
  disease: { name: "Disease ID Agent", icon: Stethoscope, idleSummary: "Upload a photo to analyze" },
  market: { name: "Market Intelligence Agent", icon: BarChart3, idleSummary: "Watching commodity prices" },
  transport: { name: "Transport Agent", icon: Truck, idleSummary: "Ready to book transport" },
};

type ActivityRow = {
  id: string;
  agent: AgentKind;
  title: string;
  detail: string | null;
  created_at: string;
};

const ACTIVE_WINDOW_MS = 1000 * 60 * 60 * 24; // 24h

export function AgentControlCenter() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [open, setOpen] = useState<AgentKind | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("agent_activity_log")
        .select("id, agent, title, detail, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(60);
      if (!cancelled && data) setRows(data as ActivityRow[]);
    })();

    const channel = supabase
      .channel(`agent-activity-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_activity_log", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setRows((prev) => [payload.new as ActivityRow, ...prev].slice(0, 60));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const grouped = useMemo(() => {
    const map = new Map<AgentKind, ActivityRow[]>();
    for (const r of rows) {
      const arr = map.get(r.agent) ?? [];
      arr.push(r);
      map.set(r.agent, arr);
    }
    return map;
  }, [rows]);

  const agentList: AgentKind[] = ["sales", "buyers", "disease", "market", "transport"];
  const isActive = (k: AgentKind) => {
    const last = grouped.get(k)?.[0];
    return last ? Date.now() - new Date(last.created_at).getTime() < ACTIVE_WINDOW_MS : false;
  };
  const activeCount = agentList.filter(isActive).length;

  return (
    <div className="glass rounded-2xl p-4 lg:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-secondary" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-secondary/90">
            Agent Control Center
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {activeCount} active
        </span>
      </div>

      <ul className="divide-y divide-white/5">
        {agentList.map((k) => {
          const meta = AGENT_META[k];
          const Icon = meta.icon;
          const recent = grouped.get(k) ?? [];
          const last = recent[0];
          const active = isActive(k);
          const isOpen = open === k;
          const summary = last
            ? `${recent.length} recent ${recent.length === 1 ? "action" : "actions"}`
            : meta.idleSummary;

          return (
            <li key={k}>
              <button
                onClick={() => setOpen(isOpen ? null : k)}
                className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-white/[0.02]"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-foreground/80">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-foreground">{meta.name}</span>
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${active ? "animate-pulse bg-emerald-400" : "bg-white/30"}`}
                      />
                      {active ? "active" : "idle"}
                    </span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{summary}</div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pb-3 pl-11 pr-2 text-xs text-muted-foreground">
                      {recent.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-white/10 px-3 py-2">
                          No actions yet. Use the Command Bar above to engage this agent.
                        </div>
                      ) : (
                        <ul className="space-y-1.5">
                          {recent.slice(0, 5).map((r) => (
                            <li key={r.id} className="flex items-start gap-2">
                              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-secondary/60" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-foreground/90">{r.title}</div>
                                {r.detail && <div className="truncate text-muted-foreground">{r.detail}</div>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
