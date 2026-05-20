import { motion } from "framer-motion";
import { Flame } from "lucide-react";

const ALERTS = [
  { title: "High demand for broilers", where: "Harare Metro", spike: "+38%", urgency: "high" },
  { title: "Tomato shortage", where: "Mutare & Manicaland", spike: "+24%", urgency: "med" },
  { title: "Maize buyers active", where: "Mashonaland West", spike: "+17%", urgency: "med" },
  { title: "Onion surge", where: "Bulawayo wholesale", spike: "+12%", urgency: "low" },
];

export function DemandAlerts() {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <Flame className="h-4 w-4 text-accent" />
        <h3 className="font-display text-xl">Demand Spikes</h3>
      </div>
      <ul className="space-y-2">
        {ALERTS.map((a, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="relative overflow-hidden rounded-xl border border-accent/15 bg-accent/[0.04] p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-foreground">{a.title}</div>
                <div className="text-xs text-muted-foreground">{a.where}</div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 animate-pulse rounded-full ${
                    a.urgency === "high"
                      ? "bg-rose-400"
                      : a.urgency === "med"
                        ? "bg-accent"
                        : "bg-secondary"
                  }`}
                />
                <span className="font-mono text-sm text-accent">{a.spike}</span>
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
