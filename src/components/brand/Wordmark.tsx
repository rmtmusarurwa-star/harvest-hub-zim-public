type Props = {
  size?: number;
  className?: string;
  animated?: boolean;
  showTagline?: boolean;
};

export function Wordmark({ size = 40, className = "", animated = false, showTagline = false }: Props) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <span
        className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-secondary/25 bg-[#06100B] shadow-[0_0_30px_rgba(201,168,76,0.16)] ${
          animated ? "animate-[brand-float_5.5s_ease-in-out_infinite]" : ""
        }`}
        style={{ height: size, width: size }}
      >
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(232,160,32,0.18),transparent_42%)]" />
        <img
          src="/harvest-hub-mark.png"
          alt=""
          aria-hidden="true"
          className="relative h-full w-full scale-[1.08] select-none object-cover"
          draggable={false}
        />
        {animated && (
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.22)_45%,transparent_68%)] opacity-0 animate-[brand-shine_4.8s_ease-in-out_infinite]" />
        )}
      </span>
      <span className="leading-tight">
        <span
          className="block font-display leading-none text-foreground"
          style={{ fontSize: size * 0.46 }}
        >
          Harvest <em className="not-italic text-secondary">Hub</em>
        </span>
        {showTagline && (
          <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-secondary/80">
            Connect. Trade. Grow.
          </span>
        )}
      </span>
    </div>
  );
}
