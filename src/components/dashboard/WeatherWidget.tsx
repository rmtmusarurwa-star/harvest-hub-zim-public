import { Sun, Droplets, Wind } from "lucide-react";

export function WeatherWidget() {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/20 blur-3xl" />
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Weather · Harare
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-display text-5xl text-foreground">24</span>
            <span className="text-secondary">°C</span>
          </div>
          <div className="text-sm text-foreground/80">Sunny · Light breeze</div>
        </div>
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/15">
          <Sun className="h-8 w-8 text-accent" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Droplets className="h-3 w-3" /> Humidity
          </div>
          <div className="mt-1 text-foreground">38%</div>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Wind className="h-3 w-3" /> Wind
          </div>
          <div className="mt-1 text-foreground">12 km/h</div>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
          <div className="text-muted-foreground">Rain</div>
          <div className="mt-1 text-foreground">0%</div>
        </div>
      </div>
    </div>
  );
}
