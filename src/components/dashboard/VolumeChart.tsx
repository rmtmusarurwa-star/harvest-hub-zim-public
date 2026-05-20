import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DATA = [
  { d: "Mon", v: 184 },
  { d: "Tue", v: 212 },
  { d: "Wed", v: 198 },
  { d: "Thu", v: 246 },
  { d: "Fri", v: 274 },
  { d: "Sat", v: 232 },
  { d: "Sun", v: 285 },
];

export function VolumeChart() {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl">Trade Volume</h3>
          <p className="text-xs text-muted-foreground">Last 7 days · USD thousands</p>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl text-secondary">$284.6k</div>
          <div className="text-xs text-emerald-400">+6.7% WoW</div>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            <YAxis stroke="#8A9E95" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: "#0F1F18",
                border: "1px solid rgba(240,237,230,0.08)",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: "#F0EDE6" }}
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
