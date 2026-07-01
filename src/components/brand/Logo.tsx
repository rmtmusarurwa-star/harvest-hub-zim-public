import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  showTagline?: boolean;
  size?: number;
  alt?: string;
  markOnly?: boolean;
};

export const LOGO_URL = "/harvest-hub-logo.png";
export const LOGO_MARK_URL = "/harvest-hub-mark.png";

export function Logo({ className, showTagline = false, size = 44, alt = "Harvest Hub", markOnly = false }: Props) {
  return (
    <div className={cn("inline-flex flex-col items-start gap-1", className)}>
      <img
        src={markOnly ? LOGO_MARK_URL : LOGO_URL}
        alt={alt}
        height={size}
        style={{ height: size, width: "auto" }}
        className={cn("select-none object-contain", markOnly && "rounded-full")}
        draggable={false}
      />
      {showTagline && (
        <div className="text-[10px] uppercase tracking-[0.22em] text-secondary/80">
          Connect. Trade. Grow.
        </div>
      )}
    </div>
  );
}
