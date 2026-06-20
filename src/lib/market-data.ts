// Single source of truth for commodity pricing — shared by MarketTicker.tsx
// (dashboard) and market-intelligence.tsx. These used to be two separate
// hardcoded arrays that disagreed with each other (e.g. maize was $385/ton
// on the dashboard ticker and $295/ton on the market-intelligence page at
// the same time) — a real "the UI doesn't work the way it's supposed to"
// bug, not just a styling one. One array now, both pages read from it.
//
// Still mock data, not a live feed — see whatsapp-agent-spec.md §6 for the
// plan to replace this with a real price source. But at least it's now
// internally consistent everywhere it's shown.

export type Commodity = {
  name: string;
  unit: string;
  price: number;
  prevWeek: number;
  /** 8-week trend, oldest first, ending at `price`. Only set for commodities charted on market-intelligence. */
  trend?: number[];
};

export const COMMODITIES: Commodity[] = [
  {
    name: "Maize (white)",
    unit: "USD / ton",
    price: 385,
    prevWeek: 376,
    trend: [255, 262, 268, 270, 274, 281, 288, 295].map((v) => v + 90), // keep shape, anchor to ticker's current price
  },
  {
    name: "Soya Beans",
    unit: "USD / ton",
    price: 720,
    prevWeek: 728,
    trend: [690, 685, 678, 670, 665, 660, 655, 720],
  },
  { name: "Beef (carcass)", unit: "USD / kg", price: 4.85, prevWeek: 4.81 },
  { name: "Pork (live)", unit: "USD / kg", price: 3.2, prevWeek: 3.15 },
  {
    name: "Broilers (live)",
    unit: "USD / bird",
    price: 6.4,
    prevWeek: 6.27,
    trend: [2.55, 2.6, 2.62, 2.65, 2.68, 2.7, 2.72, 6.4],
  },
  { name: "Tomatoes", unit: "USD / crate", price: 12.5, prevWeek: 12.9 },
  { name: "Onions", unit: "USD / bag 50kg", price: 28, prevWeek: 26.9 },
  { name: "Groundnuts", unit: "USD / kg", price: 1.85, prevWeek: 1.84 },
];

export function commodityChangePct(c: Commodity): number {
  return ((c.price - c.prevWeek) / c.prevWeek) * 100;
}
