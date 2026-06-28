import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { uid } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  DollarSign,
  Download,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Clock,
  Receipt,
  Plus,
  Trash2,
  ShoppingBag,
  RotateCcw,
  Inbox,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BRAND_GREEN,
  BG_SOFT,
  DANGER,
  SUCCESS,
  TEXT_MUTED,
  TABLE_STYLE,
  WARN,
  drawReportFooter,
  drawReportHeader,
  roundedCard,
  sectionLabel,
  textColor,
} from "@/lib/pdf-report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/financial-hub")({
  head: () => ({
    meta: [
      { title: "Financial Hub — Harvest Hub Zimbabwe" },
      {
        name: "description",
        content: "Track revenue, expenses, and order history for your farm or buyer account.",
      },
    ],
  }),
  component: FinancialHubPage,
});

type OrderRow = {
  id: string;
  order_code: string;
  buyer_id: string;
  farmer_id: string;
  listing_id: string | null;
  listing_title: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
};

type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
};

const EXPENSE_CATEGORIES = [
  "Seed & Inputs",
  "Fertilizer",
  "Chemicals",
  "Labour",
  "Fuel & Transport",
  "Equipment",
  "Utilities",
  "Other",
];

const EXPENSES_KEY = "hh_expenses_v1";

function loadExpenses(userId: string): Expense[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${EXPENSES_KEY}:${userId}`);
    return raw ? (JSON.parse(raw) as Expense[]) : [];
  } catch {
    return [];
  }
}

function saveExpenses(userId: string, expenses: Expense[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${EXPENSES_KEY}:${userId}`, JSON.stringify(expenses));
}

const fmt = (n: number) =>
  `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const statusTone = (s: string) => {
  if (s === "paid" || s === "confirmed" || s === "completed")
    return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
  if (s === "pending" || s === "awaiting_confirmation")
    return "bg-amber-500/15 text-amber-300 border-amber-500/20";
  if (s === "failed" || s === "cancelled") return "bg-rose-500/15 text-rose-300 border-rose-500/20";
  return "bg-white/5 text-muted-foreground border-white/10";
};

function FinancialHubPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [buyerNames, setBuyerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isFarmer = profile?.role === "farmer";
  const userId = user?.id ?? "";

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const col = isFarmer ? "farmer_id" : "buyer_id";
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq(col, userId)
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (error) {
        setFetchError(error.message);
        setLoading(false);
        return;
      }
      setFetchError(null);
      const rows = (data ?? []) as OrderRow[];
      setOrders(rows);

      // Fetch counterpart names
      const otherIds = Array.from(
        new Set(rows.map((r) => (isFarmer ? r.buyer_id : r.farmer_id))),
      ).filter(Boolean);
      if (otherIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", otherIds);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((p) => (map[p.id] = p.full_name || "User"));
        setBuyerNames(map);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [userId, isFarmer]);

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-secondary" />
          <span className="text-[11px] uppercase tracking-[0.22em] text-secondary/80">
            Financial Hub
          </span>
        </div>
        <h1 className="font-display text-3xl leading-tight md:text-5xl">
          <Wallet className="mr-2 inline h-7 w-7 text-secondary" />
          {isFarmer ? "Know your numbers." : "Track every order."}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isFarmer
            ? "Revenue, expenses, and statements for your farm."
            : "Your spending and order history."}
        </p>
      </div>

      {fetchError && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300">
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer hover:opacity-70" onClick={() => { setFetchError(null); setLoading(true); }} />
          <div>
            <span className="font-medium">Could not load financial data.</span>
            <span className="ml-2 text-rose-300/70">{fetchError}</span>
            <button
              onClick={() => { setFetchError(null); setLoading(true); }}
              className="ml-3 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Loading…</div>
      ) : isFarmer ? (
        <FarmerView userId={userId} orders={orders} buyerNames={buyerNames} />
      ) : (
        <BuyerView
          orders={orders}
          sellerNames={buyerNames}
          onReorder={(o) =>
            o.listing_id
              ? navigate({
                  to: "/marketplace/$listingId",
                  params: { listingId: o.listing_id },
                })
              : toast.info("Original listing no longer available")
          }
        />
      )}
    </section>
  );
}

/* ============ FARMER VIEW ============ */
function FarmerView({
  userId,
  orders,
  buyerNames,
}: {
  userId: string;
  orders: OrderRow[];
  buyerNames: Record<string, string>;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  useEffect(() => setExpenses(loadExpenses(userId)), [userId]);

  const now = new Date();
  const thisMonth = (d: string) => {
    const dt = new Date(d);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  };

  const paid = orders.filter((o) => o.payment_status === "paid");
  const pending = orders.filter((o) =>
    ["pending", "awaiting_confirmation"].includes(o.payment_status),
  );

  const revenueAllTime = paid.reduce((s, o) => s + Number(o.total_amount), 0);
  const revenueThisMonth = paid
    .filter((o) => thisMonth(o.created_at))
    .reduce((s, o) => s + Number(o.total_amount), 0);
  const pendingAmount = pending.reduce((s, o) => s + Number(o.total_amount), 0);
  const expensesThisMonth = expenses
    .filter((e) => thisMonth(e.date))
    .reduce((s, e) => s + e.amount, 0);

  // Monthly net income chart (last 6 months)
  const chartData = useMemo(() => {
    const _now = new Date(); // captured inside memo so it doesn't drift into deps
    const months: { key: string; label: string; revenue: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(_now.getFullYear(), _now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.push({
        key,
        label: d.toLocaleDateString("en-US", { month: "short" }),
        revenue: 0,
        expenses: 0,
      });
    }
    paid.forEach((o) => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find((x) => x.key === key);
      if (m) m.revenue += Number(o.total_amount);
    });
    expenses.forEach((e) => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find((x) => x.key === key);
      if (m) m.expenses += e.amount;
    });
    return months.map((m) => ({
      ...m,
      net: m.revenue - m.expenses,
    }));
  }, [paid, expenses]);

  const handleAddExpense = (exp: Expense) => {
    const next = [exp, ...expenses];
    setExpenses(next);
    saveExpenses(userId, next);
    toast.success("Expense added");
  };

  const handleDeleteExpense = (id: string) => {
    const next = expenses.filter((e) => e.id !== id);
    setExpenses(next);
    saveExpenses(userId, next);
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const M = 36;
      const contentW = W - 2 * M;
      let y = drawReportHeader(doc, {
        title: "Financial Statement",
        subtitle: "Farmer revenue & expense report",
      });

      // Period line
      const range =
        orders.length > 0
          ? `${new Date(orders[orders.length - 1].created_at).toLocaleDateString("en-GB")} — ${new Date(
              orders[0].created_at,
            ).toLocaleDateString("en-GB")}`
          : "No transactions on record";
      textColor(doc, TEXT_MUTED);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.text(`Statement period: ${range}`, M, y);
      y += 22;

      // ── KPI TILES with colored accent strips ─────────────────────────────
      const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
      const netIncome     = revenueAllTime - totalExpenses;
      const kpiDefs: [string, string, string, [number, number, number]][] = [
        ["TOTAL REVENUE",    "All time income",   fmt(revenueAllTime),    SUCCESS],
        ["THIS MONTH",       "Confirmed sales",   fmt(revenueThisMonth),  BRAND_GREEN],
        ["PENDING",          "Awaiting payment",  fmt(pendingAmount),     WARN],
        ["NET INCOME",       "Revenue − expenses", fmt(netIncome),        netIncome >= 0 ? SUCCESS : DANGER],
      ];
      const kpiGap = 10;
      const kpiW   = (contentW - kpiGap * 3) / 4;
      const kpiH   = 72;
      kpiDefs.forEach(([label, sub, value, color], i) => {
        const x = M + i * (kpiW + kpiGap);
        roundedCard(doc, x, y, kpiW, kpiH, [255, 255, 255]);
        // accent strip
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(x, y, 5, kpiH, 4, 4, "F");
        doc.rect(x + 2, y, 3, kpiH, "F");
        // label
        textColor(doc, color);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.text(label, x + 12, y + 16);
        // value
        doc.setFontSize(15);
        doc.text(value, x + 12, y + 42);
        // sub
        textColor(doc, TEXT_MUTED);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text(sub, x + 12, y + 58);
      });
      y += kpiH + 26;

      // ── MONTHLY REVENUE BAR CHART ─────────────────────────────────────────
      sectionLabel(doc, "Monthly Revenue — Last 6 Months", M, y);
      y += 14;

      const chartH  = 80;
      const barGap  = 8;
      const nBars   = chartData.length;
      const barW    = (contentW - barGap * (nBars - 1)) / nBars;
      const maxRev  = Math.max(...chartData.map((d) => d.revenue), 1);

      // Grid lines (2)
      doc.setDrawColor(220, 225, 220);
      doc.setLineWidth(0.4);
      [0.33, 0.66, 1].forEach((frac) => {
        const gy = y + chartH * (1 - frac);
        doc.line(M, gy, M + contentW, gy);
        textColor(doc, TEXT_MUTED);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.text(fmt(maxRev * frac), M - 4, gy + 2, { align: "right" });
      });

      chartData.forEach((d, i) => {
        const bx    = M + i * (barW + barGap);
        const revH  = (d.revenue / maxRev) * chartH;
        const expH  = Math.min((d.expenses / maxRev) * chartH, revH); // cap at rev bar

        // Revenue bar (green)
        doc.setFillColor(22, 128, 71);
        doc.roundedRect(bx, y + chartH - revH, barW, revH, 3, 3, "F");
        doc.rect(bx, y + chartH - revH + 3, barW, Math.max(revH - 3, 0), "F");

        // Expenses overlay (red, translucent-ish via lighter shade)
        if (d.expenses > 0) {
          doc.setFillColor(220, 80, 80);
          doc.roundedRect(bx + 2, y + chartH - expH, barW - 4, expH, 2, 2, "F");
          doc.rect(bx + 2, y + chartH - expH + 2, barW - 4, Math.max(expH - 2, 0), "F");
        }

        // Month label
        textColor(doc, TEXT_MUTED);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text(d.label, bx + barW / 2, y + chartH + 11, { align: "center" });

        // Value label on bar (only if enough space)
        if (revH > 14) {
          textColor(doc, [255, 255, 255]);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.text(fmt(d.revenue), bx + barW / 2, y + chartH - revH + 10, { align: "center" });
        }
      });

      // Legend
      y += chartH + 22;
      [[22, 128, 71, "Revenue"], [220, 80, 80, "Expenses"]].forEach(([r, g, b, label], i) => {
        const lx = M + i * 90;
        doc.setFillColor(r as number, g as number, b as number);
        doc.roundedRect(lx, y, 10, 7, 2, 2, "F");
        textColor(doc, TEXT_MUTED);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text(label as string, lx + 14, y + 6.5);
      });
      y += 20;

      // ── EXPENSE BREAKDOWN ─────────────────────────────────────────────────
      if (expenses.length > 0) {
        sectionLabel(doc, "Expense Breakdown", M, y);
        y += 10;
        autoTable(doc, {
          startY: y,
          margin: { left: M, right: M },
          head: [["Date", "Category", "Description", "Amount"]],
          body: expenses.slice(0, 15).map((e) => [
            new Date(e.date).toLocaleDateString("en-GB"),
            e.category,
            e.description || "—",
            `-${fmt(e.amount)}`,
          ]),
          ...TABLE_STYLE,
          columnStyles: {
            3: { halign: "right", textColor: [185, 28, 28], fontStyle: "bold" },
          },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
      }

      // ── TRANSACTION HISTORY ───────────────────────────────────────────────
      if (y + 60 > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage();
        y = 40;
      }
      sectionLabel(doc, "Transaction History", M, y);
      y += 10;

      const statusColors: Record<string, [number, number, number]> = {
        paid: SUCCESS,
        pending: WARN,
        awaiting_confirmation: WARN,
        failed: DANGER,
        refunded: [110, 120, 115],
      };

      autoTable(doc, {
        startY: y,
        margin: { left: M, right: M },
        head: [["Date", "Buyer", "Product", "Method", "Status", "Amount"]],
        body: orders.map((o) => [
          new Date(o.created_at).toLocaleDateString("en-GB"),
          buyerNames[o.buyer_id] || "Buyer",
          o.listing_title,
          o.payment_method.replace(/_/g, " "),
          o.payment_status.replace(/_/g, " "),
          fmt(Number(o.total_amount)),
        ]),
        ...TABLE_STYLE,
        columnStyles: {
          5: { halign: "right", fontStyle: "bold" },
        },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 4) {
            const status = orders[data.row.index]?.payment_status ?? "";
            const c = statusColors[status] ?? TEXT_MUTED;
            doc.setTextColor(c[0], c[1], c[2]);
          }
        },
      });

      drawReportFooter(doc);
      doc.save(`harvest-hub-statement-${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF — please try again");
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Revenue (Month)"
          value={fmt(revenueThisMonth)}
          tone="text-emerald-400"
        />
        <KpiCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Revenue (All time)"
          value={fmt(revenueAllTime)}
        />
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending Payments"
          value={fmt(pendingAmount)}
          tone="text-amber-300"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Completed Orders"
          value={`${paid.length}`}
        />
      </div>

      {/* Net Income Chart */}
      <div className="glass space-y-4 rounded-2xl border border-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg">Net Income — Last 6 Months</h2>
          <div className="text-sm text-muted-foreground">
            Expenses this month: {fmt(expensesThisMonth)}
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={12} stroke="rgba(240,237,230,0.4)" />
              <YAxis fontSize={12} stroke="rgba(240,237,230,0.4)" />
              <Tooltip
                formatter={(v: number) => fmt(v)}
                contentStyle={{
                  background: "#0F1F18",
                  border: "1px solid rgba(243,240,232,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" fill="#5fd99b" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#e8767a" name="Expenses" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net" fill="#C9A84C" name="Net" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expenses */}
      <div className="glass space-y-4 rounded-2xl border border-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg">
            <Receipt className="h-5 w-5 text-secondary" /> Expenses
          </h2>
          <AddExpenseDialog onAdd={handleAddExpense} />
        </div>
        {expenses.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-10 w-10" />}
            title="No expenses logged yet"
            hint="Track inputs, labour, fuel, and other farm costs to see your true net income."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-[11px] uppercase tracking-widest text-secondary/70">
                  <th className="py-2 font-normal">Date</th>
                  <th className="py-2 font-normal">Description</th>
                  <th className="py-2 font-normal">Category</th>
                  <th className="py-2 text-right font-normal">Amount</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5 text-muted-foreground">
                      {new Date(e.date).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 font-medium text-foreground">{e.description}</td>
                    <td className="py-2.5">
                      <Badge variant="secondary">{e.category}</Badge>
                    </td>
                    <td className="py-2.5 text-right font-medium text-rose-400">
                      -{fmt(e.amount)}
                    </td>
                    <td className="py-2.5 text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(e.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="glass space-y-4 rounded-2xl border border-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg">Transaction History</h2>
          <Button variant="secondary" onClick={handleExportPDF}>
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
        {orders.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-10 w-10" />}
            title="No transactions yet"
            hint="Once buyers pay for your listings, transactions will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-[11px] uppercase tracking-widest text-secondary/70">
                  <th className="py-2 font-normal">Date</th>
                  <th className="py-2 font-normal">Buyer</th>
                  <th className="py-2 font-normal">Product</th>
                  <th className="py-2 font-normal">Method</th>
                  <th className="py-2 font-normal">Status</th>
                  <th className="py-2 text-right font-normal">Amount</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5 text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5">{buyerNames[o.buyer_id] || "Buyer"}</td>
                    <td className="py-2.5 font-medium text-foreground">
                      {o.listing_title}
                      <div className="text-xs text-muted-foreground">
                        {o.quantity} {o.unit}
                      </div>
                    </td>
                    <td className="py-2.5 text-xs capitalize text-muted-foreground">
                      {o.payment_method.replace(/_/g, " ")}
                    </td>
                    <td className="py-2.5">
                      <Badge variant="outline" className={statusTone(o.payment_status)}>
                        {o.payment_status}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-right font-display text-secondary">
                      {fmt(Number(o.total_amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ BUYER VIEW ============ */
function BuyerView({
  orders,
  sellerNames,
  onReorder,
}: {
  orders: OrderRow[];
  sellerNames: Record<string, string>;
  onReorder: (o: OrderRow) => void;
}) {
  const now = new Date();
  const thisMonth = (d: string) => {
    const dt = new Date(d);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  };

  const totalSpentAll = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((s, o) => s + Number(o.total_amount), 0);
  const totalSpentMonth = orders
    .filter((o) => o.payment_status === "paid" && thisMonth(o.created_at))
    .reduce((s, o) => s + Number(o.total_amount), 0);
  const pendingOrders = orders.filter((o) =>
    ["pending", "awaiting_confirmation"].includes(o.payment_status),
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<ShoppingBag className="h-5 w-5" />}
          label="Spent (Month)"
          value={fmt(totalSpentMonth)}
        />
        <KpiCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Spent (All time)"
          value={fmt(totalSpentAll)}
        />
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending Orders"
          value={`${pendingOrders.length}`}
          tone="text-amber-300"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Total Orders"
          value={`${orders.length}`}
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Order History</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <OrderTable orders={orders} sellerNames={sellerNames} onReorder={onReorder} />
        </TabsContent>

        <TabsContent value="pending">
          <OrderTable orders={pendingOrders} sellerNames={sellerNames} onReorder={onReorder} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrderTable({
  orders,
  sellerNames,
  onReorder,
}: {
  orders: OrderRow[];
  sellerNames: Record<string, string>;
  onReorder: (o: OrderRow) => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="glass rounded-2xl border border-white/5 py-10">
        <EmptyState
          icon={<Inbox className="h-10 w-10" />}
          title="No orders yet"
          hint="Place your first order from the marketplace to see it here."
        />
      </div>
    );
  }
  return (
    <div className="glass overflow-x-auto rounded-2xl border border-white/5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5 text-left text-[11px] uppercase tracking-widest text-secondary/70">
            <th className="px-5 py-3 font-normal">Date</th>
            <th className="px-2 py-3 font-normal">Seller</th>
            <th className="px-2 py-3 font-normal">Product</th>
            <th className="px-2 py-3 font-normal">Status</th>
            <th className="px-2 py-3 text-right font-normal">Amount</th>
            <th className="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-white/5 last:border-0">
              <td className="px-5 py-3 text-muted-foreground">
                {new Date(o.created_at).toLocaleDateString()}
              </td>
              <td className="px-2 py-3">{sellerNames[o.farmer_id] || "Farmer"}</td>
              <td className="px-2 py-3 font-medium text-foreground">
                {o.listing_title}
                <div className="text-xs text-muted-foreground">
                  {o.quantity} {o.unit} • {o.order_code}
                </div>
              </td>
              <td className="px-2 py-3">
                <Badge variant="outline" className={statusTone(o.payment_status)}>
                  {o.payment_status}
                </Badge>
              </td>
              <td className="px-2 py-3 text-right font-display text-secondary">
                {fmt(Number(o.total_amount))}
              </td>
              <td className="px-5 py-3 text-right">
                <Button variant="outline" size="sm" onClick={() => onReorder(o)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reorder
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============ Shared ============ */
function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`mt-1 font-display text-2xl ${tone ?? "text-secondary"}`}>{value}</div>
    </div>
  );
}

function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="text-muted-foreground mb-3">{icon}</div>
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground max-w-sm mt-1">{hint}</div>
    </div>
  );
}

function AddExpenseDialog({ onAdd }: { onAdd: (e: Expense) => void }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const submit = () => {
    const amt = parseFloat(amount);
    if (!description.trim() || !amt || amt <= 0) {
      toast.error("Enter a description and valid amount");
      return;
    }
    onAdd({
      id: uid(),
      description: description.trim(),
      amount: amt,
      category,
      date,
    });
    setDescription("");
    setAmount("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log an Expense</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Compound D fertilizer"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount (USD)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Save Expense</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
