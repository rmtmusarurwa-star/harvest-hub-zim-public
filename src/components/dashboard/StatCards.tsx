import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, ShoppingBag, Activity, BarChart3 } from "lucide-react";

function useCounter(target: number, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function Stat({
  label,
  value,
  suffix,
  prefix,
  delta,
  icon: Icon,
  delay,
}: {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  delta: string;
  icon: React.ComponentType<{ className?: string }>;
  delay: number;
}) {
  const n = useCounter(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass relative overflow-hidden rounded-2xl p-5"
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-secondary/10 blur-2xl" />
      <div className="flex items-start justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-secondary" />
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-display text-3xl text-foreground">
          {prefix}
          {n.toLocaleString()}
          {suffix}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        <span className="text-xs text-emerald-400">{delta}</span>
        <span className="text-xs text-muted-foreground">vs last week</span>
      </div>
    </motion.div>
  );
}

export function StatCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Active Farmers" value={12480} delta="+4.2%" icon={Users} delay={0.0} />
      <Stat label="Active Buyers" value={3214} delta="+2.8%" icon={ShoppingBag} delay={0.05} />
      <Stat
        label="Today's Transactions"
        value={847}
        delta="+11.4%"
        icon={Activity}
        delay={0.1}
      />
      <Stat
        label="Total Volume"
        value={284600}
        prefix="$"
        delta="+6.7%"
        icon={BarChart3}
        delay={0.15}
      />
    </div>
  );
}
