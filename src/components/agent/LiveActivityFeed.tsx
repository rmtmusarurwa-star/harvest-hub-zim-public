import { Activity } from "lucide-react";

// UI shell: real events arrive via Supabase Realtime once the agent backend
// publishes activity. Until then, this renders an honest empty state.
export function LiveActivityFeed() {
  const events: { id: string; text: string; at: string }[] = [];

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
          {events.slice(0, 5).map((e) => (
            <li key={e.id} className="flex items-start gap-3 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-foreground/90">{e.text}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {e.at}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
