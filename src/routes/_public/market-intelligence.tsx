import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Sparkles,
  TrendingUp,
  CalendarDays,
  MapPin,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BG_SOFT,
  TABLE_STYLE,
  TEXT_DARK,
  drawReportFooter,
  drawReportHeader,
  roundedCard,
  sectionLabel,
  textColor,
} from "@/lib/pdf-report";
import { Button } from "@/components/ui/button";
import { COMMODITIES, commodityChangePct } from "@/lib/market-data";

export const Route = createFileRoute("/_public/market-intelligence")({
  head: () => ({
    meta: [
      { title: "Market Intelligence — Harvest Hub Zimbabwe" },
      {
        name: "description",
        content:
          "Live commodity prices, regional demand heatmaps, and AI insights for Zimbabwean agriculture.",
      },
    ],
  }),
  component: MarketIntelligencePage,
});

const PROVINCES: { name: string; intensity: number; note: string }[] = [
  { name: "Harare", intensity: 95, note: "Strongest urban demand" },
  { name: "Bulawayo", intensity: 82, note: "Beef & maize meal pull" },
  { name: "Manicaland", intensity: 70, note: "Horticulture exports up" },
  { name: "Masvingo", intensity: 58, note: "Livestock auctions active" },
  { name: "Midlands", intensity: 64, note: "Steady soya offtake" },
  { name: "Mashonaland East", intensity: 78, note: "Tobacco cash spillover" },
  { name: "Mashonaland West", intensity: 88, note: "Maize basket, high volume" },
  { name: "Mashonaland Central", intensity: 74, note: "Soya & maize surplus" },
  { name: "Matabeleland North", intensity: 45, note: "Low rainfall, weak veg" },
  { name: "Matabeleland South", intensity: 52, note: "Cattle trade firm" },
];

const WEEKS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];

const INSIGHTS = [
  {
    title: "Maize firming into pre-harvest window",
    body: "GMB intake delays and tighter informal stocks are pushing white maize higher in Harare and Chegutu. Expect a softening once early Mashonaland West deliveries clear in 3–4 weeks.",
  },
  {
    title: "Soya price slide opens stockfeed margin",
    body: "Crush demand from Surface and National Foods has cooled. Producers holding soya above market are seeing slow uptake — consider forward contracts with stockfeed millers in Norton.",
  },
  {
    title: "Beef premium on the Bulawayo line",
    body: "Cold Storage and private abattoirs are paying a premium for grade-A steers out of Matabeleland South. Trekking costs from Gwanda remain the binding constraint.",
  },
  {
    title: "Horticulture: tomatoes oversupplied, onions tight",
    body: "Mbare Musika is flooded with Mutoko and Honde Valley tomatoes — prices off w/w. Onions, however, are tight nationally as SA imports slow.",
  },
];

const SEASONAL = [
  { crop: "Maize", plant: [10, 11, 0], harvest: [3, 4, 5] },
  { crop: "Soya Beans", plant: [10, 11], harvest: [3, 4] },
  { crop: "Tobacco", plant: [8, 9], harvest: [1, 2, 3] },
  { crop: "Wheat", plant: [4, 5], harvest: [9, 10] },
  { crop: "Tomatoes", plant: [7, 8, 9, 0, 1], harvest: [9, 10, 11, 2, 3] },
  { crop: "Onions", plant: [2, 3, 4], harvest: [7, 8, 9] },
  { crop: "Groundnuts", plant: [10, 11], harvest: [3, 4] },
];

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function MarketIntelligencePage() {
  const [downloading, setDownloading] = useState(false);

  const enriched = useMemo(
    () => COMMODITIES.map((c) => ({ ...c, change: commodityChangePct(c) })),
    [],
  );

  const trendSeries = useMemo(
    () =>
      COMMODITIES.filter((c) => c.trend).map((c) => ({
        key: c.name,
        data: WEEKS.map((w, i) => ({ week: w, value: c.trend![i] })),
      })),
    [],
  );

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const M = 36;
      let y = drawReportHeader(doc, {
        title: "Market Intelligence",
        subtitle: "Weekly commodity report",
      });

      sectionLabel(doc, "Commodity Prices — This Week", M, y);
      y += 10;

      autoTable(doc, {
        startY: y,
        margin: { left: M, right: M },
        head: [["Commodity", "Unit", "Price (USD)", "Prev", "W/W Change"]],
        body: enriched.map((c) => [
          c.name,
          c.unit,
          c.price.toFixed(2),
          c.prevWeek.toFixed(2),
          `${c.change >= 0 ? "+" : ""}${c.change.toFixed(1)}%`,
        ]),
        ...TABLE_STYLE,
      });

      const afterTableY =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26;
      roundedCard(doc, M, afterTableY, doc.internal.pageSize.getWidth() - 2 * M, 90, BG_SOFT);
      sectionLabel(doc, "Market Summary", M + 14, afterTableY + 20);
      textColor(doc, TEXT_DARK);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const summary =
        "Maize and broilers continue to firm into the pre-harvest window while soya softens on weaker crush demand. Beef premiums remain strongest on the Bulawayo line. Horticulture is mixed — tomatoes oversupplied, onions tightening.";
      const lines = doc.splitTextToSize(summary, doc.internal.pageSize.getWidth() - 2 * M - 28);
      doc.text(lines, M + 14, afterTableY + 40);

      drawReportFooter(doc);
      doc.save(`harvest-hub-market-report-${Date.now()}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-secondary/80">
              Market Intelligence
            </span>
          </div>
          <h1 className="font-display text-3xl leading-tight md:text-5xl">
            <TrendingUp className="mr-2 inline h-7 w-7 text-secondary" />
            Read the market before you sell.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Commodity prices, regional demand, and AI insights for Zimbabwean agriculture.
          </p>
        </div>
        <Button onClick={handleDownloadPDF} disabled={downloading} variant="secondary">
          <Download className="h-4 w-4" />
          {downloading ? "Generating…" : "Download Weekly PDF"}
        </Button>
      </div>

      {/* Price Tracker */}
      <div className="glass space-y-4 rounded-2xl border border-white/5 p-5">
        <h2 className="font-display text-lg">Commodity Prices — This Week</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-[11px] uppercase tracking-widest text-secondary/70">
                <th className="py-2 font-normal">Commodity</th>
                <th className="py-2 font-normal">Unit</th>
                <th className="py-2 text-right font-normal">Price</th>
                <th className="py-2 text-right font-normal">W/W</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((c) => {
                const up = c.change >= 0;
                return (
                  <tr key={c.name} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5 font-medium text-foreground">{c.name}</td>
                    <td className="py-2.5 text-xs text-muted-foreground">{c.unit}</td>
                    <td className="py-2.5 text-right font-display text-secondary">
                      ${c.price.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          up ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {up ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        )}
                        {up ? "+" : ""}
                        {c.change.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trend Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {trendSeries.map((s) => (
          <div key={s.key} className="glass space-y-2 rounded-2xl border border-white/5 p-5">
            <h3 className="font-display text-base">{s.key} — 8 Week Trend</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={s.data}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <XAxis dataKey="week" fontSize={11} stroke="rgba(240,237,230,0.4)" />
                  <YAxis fontSize={11} domain={["auto", "auto"]} stroke="rgba(240,237,230,0.4)" />
                  <Tooltip
                    contentStyle={{
                      background: "#0F1F18",
                      border: "1px solid rgba(243,240,232,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#C9A84C"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#C9A84C" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* Regional Heatmap */}
      <div className="glass space-y-4 rounded-2xl border border-white/5 p-5">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <MapPin className="h-5 w-5 text-secondary" /> Regional Demand Heatmap
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {PROVINCES.map((p) => {
            const tone =
              p.intensity >= 80
                ? "bg-secondary/25 text-secondary ring-1 ring-secondary/40"
                : p.intensity >= 65
                  ? "bg-secondary/15 text-secondary/90 ring-1 ring-secondary/25"
                  : p.intensity >= 50
                    ? "bg-accent/15 text-accent ring-1 ring-accent/25"
                    : "bg-white/[0.03] text-muted-foreground ring-1 ring-white/5";
            return (
              <div key={p.name} className={`rounded-xl p-3 ${tone}`}>
                <div className="text-sm font-medium">{p.name}</div>
                <div className="font-display text-2xl">{p.intensity}</div>
                <div className="text-[11px] leading-tight opacity-90">{p.note}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Insights */}
      <div className="glass space-y-4 rounded-2xl border border-white/5 p-5">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <Sparkles className="h-5 w-5 text-secondary" /> AI Market Insights
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {INSIGHTS.map((i) => (
            <div
              key={i.title}
              className="space-y-1 rounded-xl border border-white/5 bg-white/[0.02] p-4"
            >
              <div className="text-sm font-medium text-foreground">{i.title}</div>
              <p className="text-sm leading-relaxed text-muted-foreground">{i.body}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Narrative insights are illustrative commentary, not yet generated from a live agent — see
          whatsapp-agent-spec.md for the plan to wire this to the real Market Intelligence Agent.
        </p>
      </div>

      {/* Seasonal Calendar */}
      <div className="glass space-y-4 rounded-2xl border border-white/5 p-5">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <CalendarDays className="h-5 w-5 text-secondary" /> Zimbabwe Seasonal Calendar
        </h2>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="mb-1 grid grid-cols-[120px_repeat(12,minmax(0,1fr))] gap-1 text-xs font-medium text-muted-foreground">
              <div></div>
              {MONTHS.map((m, idx) => (
                <div key={idx} className="text-center">
                  {m}
                </div>
              ))}
            </div>
            {SEASONAL.map((s) => (
              <div
                key={s.crop}
                className="mb-1 grid grid-cols-[120px_repeat(12,minmax(0,1fr))] items-center gap-1"
              >
                <div className="text-sm">{s.crop}</div>
                {MONTHS.map((_, idx) => {
                  const plant = s.plant.includes(idx);
                  const harvest = s.harvest.includes(idx);
                  return (
                    <div
                      key={idx}
                      className={`h-6 rounded ${
                        plant && harvest
                          ? "bg-gradient-to-r from-secondary to-accent"
                          : plant
                            ? "bg-secondary/60"
                            : harvest
                              ? "bg-accent/60"
                              : "bg-white/[0.03]"
                      }`}
                      title={
                        plant && harvest
                          ? "Plant & Harvest"
                          : plant
                            ? "Plant"
                            : harvest
                              ? "Harvest"
                              : ""
                      }
                    />
                  );
                })}
              </div>
            ))}
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-secondary/60" /> Planting
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-accent/60" /> Harvest
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Report Card */}
      <div className="glass-strong flex flex-col items-start gap-4 rounded-2xl border border-secondary/20 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="mb-2 inline-block rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-secondary">
            Weekly Report
          </span>
          <h3 className="font-display text-xl">Harvest Hub Weekly Market Brief</h3>
          <p className="max-w-xl text-sm text-muted-foreground">
            A branded PDF with the full price table, week-on-week movement, and a summary of key
            Zimbabwean market signals from the past 7 days.
          </p>
        </div>
        <Button size="lg" variant="secondary" onClick={handleDownloadPDF} disabled={downloading}>
          <Download className="h-5 w-5" />
          {downloading ? "Generating…" : "Download PDF"}
        </Button>
      </div>
    </section>
  );
}
