import { ShieldCheck } from "lucide-react";
import { trustTone } from "@/lib/farmers-data";
import { cn } from "@/lib/utils";

export function TrustBadge({
  score,
  size = "sm",
}: {
  score: number;
  size?: "sm" | "lg";
}) {
  const tone = trustTone(score);
  if (size === "lg") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium backdrop-blur",
          tone.badge,
        )}
      >
        <ShieldCheck className="h-4 w-4" />
        Trust {score}
        <span className="text-xs opacity-80">· {tone.label}</span>
      </div>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone.badge,
      )}
    >
      <ShieldCheck className="h-3 w-3" /> {score}
    </span>
  );
}
