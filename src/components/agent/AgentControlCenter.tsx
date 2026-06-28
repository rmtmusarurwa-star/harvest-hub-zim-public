import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Bot, Users, Stethoscope, BarChart3, Truck } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type AgentKind = "sales" | "buyers" | "disease" | "market" | "transport";

const AGENT_META: Record<AgentKind, {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  idleSummary: string;
  /** Message pre-sent to the AI when this card is clicked. Null = navigate instead. */
  launchMessage: string | null;
  /** Route to navigate to instead of opening AI chat (disease uses disease-id page) */
  launchRoute?: string;
}> = {
  sales: {
    name: "Sales Agent",
    icon: Bot,
    idleSummary: "Tap to boost your sales",
    launchMessage: "Check my listings and suggest how I can increase my sales today.",
  },
  buyers: {
    name: "Buyer Matching Agent",
    icon: Users,
    idleSummary: "Tap to find buyers",
    launchMessage: "Search the marketplace and tell me what buyers are looking for right now. Are there opportunities that match what I'm selling?",
  },
  disease: {
    name: "Disease ID Agent",
    icon: Stethoscope,
    idleSummary: "Tap to identify diseases",
    launchMessage: null,
    launchRoute: "/disease-id",
  },
  market: {
    name: "Market Intelligence Agent",
    icon: BarChart3,
    idleSummary: "Tap to check prices",
    launchMessage: "Give me a commodity price summary for Zimbabwe right now. Which crops are getting the best prices?",
  },
  transport: {
    name: "Transport Agent",
    icon: Truck,
    idleSummary: "Tap to book transport",
    launchMessage: "I need to arrange transport for my produce. What transport options do you recommend and how do I post a transport request?",
  },
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
  const navigate = useNavigate();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [open, setOpen] = useState<AgentKind | null>(null);

  function launchAgent(k: AgentKind) {
    const meta = AGENT_META[k];
    if (meta.launchRoute) {
      navigate({ to: meta.launchRoute as "/" });
      return;
    }
    if (meta.launchMessage) {
      window.dispatchEvent(
        new CustomEvent("harvest-agent-launch", { detail: { message: meta.launchMessage, agentType: k } })
      );
    }
  }

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
              <div className="flex w-full items-center gap-3 py-2.5">
                {/* Main clickable area — launches the agent */}
                <button
                  onClick={() => launchAgent(k)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left hover:bg-white/[0.02] rounded-lg px-1 py-0.5 transition-colors"
                  title={`Activate ${meta.name}`}
                >
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors ${active ? "bg-secondary/15 text-secondary" : "bg-white/5 text-foreground/80"} hover:bg-secondary/20 hover:text-secondary`}>
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
                </button>
                {/* Chevron — expands activity history */}
                <button
                  onClick={() => setOpen(isOpen ? null : k)}
                  className="ml-auto shrink-0 rounded p-1 hover:bg-white/[0.05] transition-colors"
                  title="View activity"
                >
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
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
                        <button
                          onClick={() => launchAgent(k)}
                          className="w-full rounded-lg border border-dashed border-secondary/20 px-3 py-2 text-left hover:border-secondary/40 hover:bg-secondary/5 transition-colors"
                        >
                          No actions yet — <span className="text-secondary underline-offset-2 hover:underline">tap to activate</span>
                        </button>
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
