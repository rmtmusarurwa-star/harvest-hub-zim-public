import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Bot, Users, Stethoscope, BarChart3 } from "lucide-react";

type AgentStatus = "active" | "idle";

type Agent = {
  id: string;
  name: string;
  status: AgentStatus;
  summary: string;
  icon: React.ComponentType<{ className?: string }>;
  recent: string[];
};

// UI shell: when the agent backend is wired in, replace this with a live query
// against agent_activity_log. Until then, show a clear "no activity" state for
// each agent rather than fabricated events.
const AGENTS: Agent[] = [
  {
    id: "sales",
    name: "Sales Agent",
    status: "idle",
    summary: "No tasks yet today",
    icon: Bot,
    recent: [],
  },
  {
    id: "buyers",
    name: "Buyer Matching Agent",
    status: "idle",
    summary: "Awaiting your next listing",
    icon: Users,
    recent: [],
  },
  {
    id: "disease",
    name: "Disease ID Agent",
    status: "idle",
    summary: "Upload a photo to analyze",
    icon: Stethoscope,
    recent: [],
  },
  {
    id: "market",
    name: "Market Intelligence Agent",
    status: "idle",
    summary: "Watching commodity prices",
    icon: BarChart3,
    recent: [],
  },
];

export function AgentControlCenter() {
  const [open, setOpen] = useState<string | null>(null);

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
          {AGENTS.filter((a) => a.status === "active").length} active
        </span>
      </div>

      <ul className="divide-y divide-white/5">
        {AGENTS.map((a) => {
          const Icon = a.icon;
          const isOpen = open === a.id;
          return (
            <li key={a.id}>
              <button
                onClick={() => setOpen(isOpen ? null : a.id)}
                className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-white/[0.02]"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-foreground/80">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-foreground">{a.name}</span>
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          a.status === "active" ? "animate-pulse bg-emerald-400" : "bg-white/30"
                        }`}
                      />
                      {a.status}
                    </span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{a.summary}</div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
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
                      {a.recent.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-white/10 px-3 py-2">
                          No recent actions. This agent will report here once
                          the backend is connected.
                        </div>
                      ) : (
                        <ul className="space-y-1">
                          {a.recent.map((r, i) => (
                            <li key={i}>• {r}</li>
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
