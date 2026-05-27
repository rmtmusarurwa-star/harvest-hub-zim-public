import logoUrl from "@/assets/harvest-hub-logo-transparent.png";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  showTagline?: boolean;
  size?: number;
  alt?: string;
};

export const LOGO_URL = logoUrl;

export function Logo({ className, showTagline = false, size = 44, alt = "Harvest Hub" }: Props) {
  return (
    <div className={cn("inline-flex flex-col items-start gap-1", className)}>
      <img
        src={logoUrl}
        alt={alt}
        height={size}
        style={{ height: size, width: "auto" }}
        className="select-none object-contain"
        draggable={false}
      />
      {showTagline && (
        <div className="text-[10px] uppercase tracking-[0.22em] text-secondary/80">
          Connect · Trade · Grow
        </div>
      )}
    </div>
  );
}
