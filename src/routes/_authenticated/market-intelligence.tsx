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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/market-intelligence")({
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

type Commodity = {
  name: string;
  unit: string;
  price: number;
  prev: number;
};

const COMMODITIES: Commodity[] = [
  { name: "Maize (white)", unit: "USD / tonne", price: 295, prev: 280 },
  { name: "Soya Beans", unit: "USD / tonne", price: 640, prev: 655 },
  { name: "Beef (live weight)", unit: "USD / kg", price: 3.2, prev: 3.05 },
  { name: "Pork (carcass)", unit: "USD / kg", price: 4.1, prev: 4.15 },
  { name: "Broilers (live)", unit: "USD / kg", price: 2.8, prev: 2.7 },
  { name: "Tomatoes", unit: "USD / 30kg crate", price: 18, prev: 22 },
  { name: "Onions", unit: "USD / 25kg bag", price: 24, prev: 21 },
  { name: "Potatoes (Irish)", unit: "USD / 15kg pocket", price: 12, prev: 11.5 },
];

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

const TREND_DATA = {
  Maize: [255, 262, 268, 270, 274, 281, 288, 295],
  Soya: [690, 685, 678, 670, 665, 660, 655, 640],
  Beef: [2.9, 2.95, 3.0, 3.0, 3.05, 3.1, 3.05, 3.2],
  Broilers: [2.55, 2.6, 2.62, 2.65, 2.68, 2.7, 2.72, 2.8],
} as const;

const INSIGHTS = [
  {
    title: "Maize firming into pre-harvest window",
    body: "GMB intake delays and tighter informal stocks are pushing white maize toward USD 300/t in Harare and Chegutu. Expect a softening once early Mashonaland West deliveries clear in 3–4 weeks.",
  },
  {
    title: "Soya price slide opens stockfeed margin",
    body: "Crush demand from Surface and National Foods has cooled. Producers holding soya above USD 650/t are seeing slow uptake — consider forward contracts with stockfeed millers in Norton.",
  },
  {
    title: "Beef premium on the Bulawayo line",
    body: "Cold Storage and private abattoirs are paying USD 3.20/kg live weight for grade-A steers out of Matabeleland South. Trekking costs from Gwanda remain the binding constraint.",
  },
  {
    title: "Horticulture: tomatoes oversupplied, onions tight",
    body: "Mbare Musika is flooded with Mutoko and Honde Valley tomatoes — prices off 18% w/w. Onions, however, are tight nationally as SA imports slow; expect USD 26+/bag within 10 days.",
  },
];

const SEASONAL = [
  { crop: "Maize", plant: [10, 11, 0], harvest: [3, 4, 5] },
  { crop: "Soya Beans", plant: [10, 11], harvest: [3, 4] },
  { crop: "Tobacco", plant: [8, 9], harvest: [1, 2, 3] },
  { crop: "Wheat", plant: [4, 5], harvest: [9, 10] },
  { crop: "Tomatoes", plant: [7, 8, 9, 0, 1], harvest: [9, 10, 11, 2, 3] },
  { crop: "Onions", plant: [2, 3, 4], harvest: [7, 8, 9] },
  { crop: "Potatoes", plant: [1, 2, 6, 7], harvest: [4, 5, 9, 10] },
  { crop: "Groundnuts", plant: [10, 11], harvest: [3, 4] },
];

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function MarketIntelligencePage() {
  const [downloading, setDownloading] = useState(false);

  const enriched = useMemo(
    () =>
      COMMODITIES.map((c) => {
        const change = ((c.price - c.prev) / c.prev) * 100;
        return { ...c, change };
      }),
    []
  );

  const trendSeries = useMemo(
    () =>
      Object.entries(TREND_DATA).map(([key, values]) => ({
        key,
        data: WEEKS.map((w, i) => ({ week: w, value: values[i] })),
      })),
    []
  );

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const doc = new jsPDF();
      doc.setFillColor(34, 139, 34);
      doc.rect(0, 0, 210, 25, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text("Harvest Hub Zimbabwe", 14, 16);
      doc.setFontSize(11);
      doc.text("Weekly Market Intelligence Report", 14, 22);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(
        `Generated: ${new Date().toLocaleDateString("en-ZW", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        14,
        34
      );

      autoTable(doc, {
        startY: 40,
        head: [["Commodity", "Unit", "Price (USD)", "Prev", "W/W Change"]],
        body: enriched.map((c) => [
          c.name,
          c.unit,
          c.price.toFixed(2),
          c.prev.toFixed(2),
          `${c.change >= 0 ? "+" : ""}${c.change.toFixed(1)}%`,
        ]),
        headStyles: { fillColor: [34, 139, 34] },
      });

      const afterTableY = (doc as unknown as { lastAutoTable: { finalY: number } })
        .lastAutoTable.finalY + 10;
      doc.setFontSize(13);
      doc.text("Market Summary", 14, afterTableY);
      doc.setFontSize(10);
      const summary =
        "Maize and broilers continue to firm into the pre-harvest window while soya softens on weaker crush demand. Beef premiums remain strongest on the Bulawayo line. Horticulture is mixed — tomatoes oversupplied, onions tightening.";
      const lines = doc.splitTextToSize(summary, 180);
      doc.text(lines, 14, afterTableY + 7);

      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        "Harvest Hub Zimbabwe • harvest-hub-zim.lovable.app",
        14,
        290
      );

      doc.save(`harvest-hub-market-report-${Date.now()}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-primary" />
            Market Intelligence
          </h1>
          <p className="text-muted-foreground text-sm">
            Live commodity prices, regional demand & AI insights for Zimbabwe.
          </p>
        </div>
        <Button onClick={handleDownloadPDF} disabled={downloading} className="gap-2">
          <Download className="h-4 w-4" />
          {downloading ? "Generating..." : "Download Weekly PDF"}
        </Button>
      </div>

      {/* Price Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Commodity Prices — This Week</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commodity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">W/W</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enriched.map((c) => {
                const up = c.change >= 0;
                return (
                  <TableRow key={c.name}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {c.unit}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${c.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          up ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {up ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                        {up ? "+" : ""}
                        {c.change.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Trend Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {trendSeries.map((s) => (
          <Card key={s.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{s.key} — 8 Week Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={s.data}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="week" fontSize={11} />
                  <YAxis fontSize={11} domain={["auto", "auto"]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Regional Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Regional Demand Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {PROVINCES.map((p) => {
              const bg =
                p.intensity >= 80
                  ? "bg-green-600 text-white"
                  : p.intensity >= 65
                  ? "bg-green-400 text-white"
                  : p.intensity >= 50
                  ? "bg-yellow-300 text-yellow-900"
                  : "bg-orange-200 text-orange-900";
              return (
                <div
                  key={p.name}
                  className={`rounded-lg p-3 ${bg} shadow-sm`}
                >
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-2xl font-bold">{p.intensity}</div>
                  <div className="text-[11px] opacity-90 leading-tight">
                    {p.note}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Market Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {INSIGHTS.map((i) => (
            <div
              key={i.title}
              className="rounded-lg border bg-muted/40 p-4 space-y-1"
            >
              <div className="font-semibold text-sm">{i.title}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {i.body}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Seasonal Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Zimbabwe Seasonal
            Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-[120px_repeat(12,minmax(0,1fr))] gap-1 text-xs font-medium text-muted-foreground mb-1">
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
                className="grid grid-cols-[120px_repeat(12,minmax(0,1fr))] gap-1 mb-1 items-center"
              >
                <div className="text-sm font-medium">{s.crop}</div>
                {MONTHS.map((_, idx) => {
                  const plant = s.plant.includes(idx);
                  const harvest = s.harvest.includes(idx);
                  return (
                    <div
                      key={idx}
                      className={`h-6 rounded ${
                        plant && harvest
                          ? "bg-gradient-to-r from-blue-400 to-amber-400"
                          : plant
                          ? "bg-blue-400"
                          : harvest
                          ? "bg-amber-400"
                          : "bg-muted"
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
            <div className="flex gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-blue-400" /> Planting
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-400" /> Harvest
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Report Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Badge variant="secondary" className="mb-2">
              Weekly Report
            </Badge>
            <h3 className="text-xl font-bold">
              Harvest Hub Weekly Market Brief
            </h3>
            <p className="text-sm text-muted-foreground max-w-xl">
              A branded PDF with full price table, week-on-week movement, and
              summary of key Zimbabwean market signals from the past 7 days.
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="gap-2"
          >
            <Download className="h-5 w-5" />
            {downloading ? "Generating..." : "Download PDF"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
