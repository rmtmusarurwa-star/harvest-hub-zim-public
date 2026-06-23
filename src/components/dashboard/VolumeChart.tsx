import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

type DayBucket = { d: string; v: number };

function buildEmptyWeek(): DayBucket[] {
  const buckets: DayBucket[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    buckets.push({
      d: d.toLocaleDateString("en", { weekday: "short" }),
      v: 0,
    });
  }
  return buckets;
}

function formatYAxis(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
  return `$${v}`;
}

export function VolumeChart() {
  const [chartData, setChartData] = useState<DayBucket[]>(buildEmptyWeek());
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const since = new Date();
      since.setDate(since.getDate() - 6);
      since.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("listings")
        .select("created_at, price, quantity")
        .eq("status", "active")
        .gte("created_at", since.toISOString());

      const buckets = buildEmptyWeek();
      const keyMap: Record<string, number> = {};
      buckets.forEach((b, i) => (keyMap[b.d] = i));

      let total = 0;
      for (const row of data ?? []) {
        const key = new Date(row.created_at).toLocaleDateString("en", {
          weekday: "short",
        });
        const idx = keyMap[key];
        if (idx !== undefined) {
          const val = row.price * row.quantity;
          buckets[idx].v = Math.round(buckets[idx].v + val);
          total += val;
        }
      }

      setChartData(buckets);
      setTotalValue(Math.round(total));
      setLoading(false);
    }
    load();
  }, []);

  const displayTotal =
    totalValue >= 1000
      ? `$${(totalValue / 1000).toFixed(1)}k`
      : `$${totalValue.toLocaleString()}`;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl">Listed Value</h3>
          <p className="text-xs text-muted-foreground">
            Last 7 days · price × quantity
          </p>
        </div>
        <div className="text-right">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-lg bg-white/5" />
          ) : (
            <>
              <div className="font-display text-2xl text-secondary">
                {displayTotal}
              </div>
              <div className="text-xs text-muted-foreground">
                from {chartData.filter((b) => b.v > 0).length} active day
                {chartData.filter((b) => b.v > 0).length !== 1 ? "s" : ""}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="d"
              stroke="#8A9E95"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#8A9E95"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxis}
            />
            <Tooltip
              contentStyle={{
                background: "#0F1F18",
                border: "1px solid rgba(240,237,230,0.08)",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: "#F0EDE6" }}
              formatter={(v: number) => [`$${v.toLocaleString()}`, "Value"]}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke="#C9A84C"
              strokeWidth={2}
              fill="url(#gv)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
