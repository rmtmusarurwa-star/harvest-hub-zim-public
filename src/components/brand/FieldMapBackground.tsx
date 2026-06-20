import { useMemo } from "react";

/**
 * Ambient "Living Field Map" background — procedurally generated abstract
 * contour lines (gold → emerald gradient) with a few pulsing markers
 * standing in for live agent activity. Mounted once in AppLayout so every
 * authenticated page picks it up automatically — no per-page wiring needed.
 *
 * Replaces the flat `.ambient-glow` radial gradients with something that
 * reads as "fields being watched", not a stock photo. See design-direction.md
 * for why the earlier literal landscape PNG got dropped in favor of this.
 *
 * Pure math, no Math.random, so output is identical on server and client —
 * safe under TanStack Start's SSR without hydration mismatches.
 */

const VIEW_W = 1000;
const VIEW_H = 560;
const LINE_COUNT = 11;
const MARKERS: Array<[number, number]> = [
  [140, 180],
  [420, 90],
  [680, 260],
  [860, 140],
  [260, 360],
];

function buildLinePath(i: number) {
  const baseY = 30 + i * (520 / LINE_COUNT);
  const amp = 14 + (i % 4) * 6;
  const freq = 0.012 + (i % 3) * 0.004;
  const phase = i * 0.9;
  let d = "";
  for (let x = 0; x <= VIEW_W; x += 20) {
    const y =
      baseY +
      amp * Math.sin(freq * x + phase) +
      amp * 0.35 * Math.sin(freq * 2.3 * x + phase * 1.6);
    d += `${x === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return d;
}

export function FieldMapBackground() {
  const lines = useMemo(
    () =>
      Array.from({ length: LINE_COUNT }, (_, i) => ({
        d: buildLinePath(i),
        width: 0.6 + (i % 3) * 0.3,
        opacity: 0.08 + (i % 4) * 0.04,
      })),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <svg
        className="absolute -left-[5%] -top-[5%] h-[110%] w-[110%]"
        style={{ animation: "field-map-drift 70s ease-in-out infinite" }}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="field-map-gradient" x1="0%" x2="100%">
            <stop offset="0%" stopColor="#C9A84C" />
            <stop offset="55%" stopColor="#E8A020" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        {lines.map((line, i) => (
          <path
            key={i}
            d={line.d}
            fill="none"
            stroke="url(#field-map-gradient)"
            strokeWidth={line.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={line.opacity}
          />
        ))}
        {MARKERS.map(([mx, my], i) => (
          <g key={i}>
            <circle
              cx={mx}
              cy={my}
              r={3}
              fill="none"
              stroke="#34d399"
              strokeWidth={1.2}
              opacity={0.55}
              style={{
                animation: "field-map-pulse 3s ease-out infinite",
                animationDelay: `${i * 0.6}s`,
              }}
            />
            <circle
              cx={mx}
              cy={my}
              r={2.6}
              fill="#34d399"
              style={{ filter: "drop-shadow(0 0 6px #34d399)" }}
            />
          </g>
        ))}
      </svg>
      <div className="field-map-fade absolute inset-0" />
    </div>
  );
}
