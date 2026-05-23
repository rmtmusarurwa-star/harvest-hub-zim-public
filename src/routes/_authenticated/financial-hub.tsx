import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
        content:
          "Track revenue, expenses, and order history for your farm or buyer account.",
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
    return "bg-green-100 text-green-800 border-green-200";
  if (s === "pending" || s === "awaiting_confirmation")
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (s === "failed" || s === "cancelled")
    return "bg-red-100 text-red-800 border-red-200";
  return "bg-muted text-muted-foreground";
};

function FinancialHubPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [buyerNames, setBuyerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

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
        toast.error("Failed to load orders");
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as OrderRow[];
      setOrders(rows);

      // Fetch counterpart names
      const otherIds = Array.from(
        new Set(rows.map((r) => (isFarmer ? r.buyer_id : r.farmer_id)))
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
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Wallet className="h-7 w-7 text-primary" />
          Financial Hub
        </h1>
        <p className="text-muted-foreground text-sm">
          {isFarmer
            ? "Revenue, expenses, and statements for your farm."
            : "Your spending and order history."}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading…</div>
      ) : isFarmer ? (
        <FarmerView
          userId={userId}
          orders={orders}
          buyerNames={buyerNames}
        />
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
    </div>
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
    return (
      dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
    );
  };

  const paid = orders.filter((o) => o.payment_status === "paid");
  const pending = orders.filter((o) =>
    ["pending", "awaiting_confirmation"].includes(o.payment_status)
  );

  const revenueAllTime = paid.reduce((s, o) => s + Number(o.total_amount), 0);
  const revenueThisMonth = paid
    .filter((o) => thisMonth(o.created_at))
    .reduce((s, o) => s + Number(o.total_amount), 0);
  const pendingAmount = pending.reduce(
    (s, o) => s + Number(o.total_amount),
    0
  );
  const expensesThisMonth = expenses
    .filter((e) => thisMonth(e.date))
    .reduce((s, e) => s + e.amount, 0);

  // Monthly net income chart (last 6 months)
  const chartData = useMemo(() => {
    const months: { key: string; label: string; revenue: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
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
    const doc = new jsPDF();
    doc.setFillColor(34, 139, 34);
    doc.rect(0, 0, 210, 25, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Harvest Hub Zimbabwe", 14, 16);
    doc.setFontSize(11);
    doc.text("Farmer Financial Statement", 14, 22);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const range =
      orders.length > 0
        ? `${new Date(
            orders[orders.length - 1].created_at
          ).toLocaleDateString()} — ${new Date(
            orders[0].created_at
          ).toLocaleDateString()}`
        : "No transactions";
    doc.text(`Date range: ${range}`, 14, 34);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 40);

    // Totals
    doc.setFontSize(12);
    doc.text("Summary", 14, 50);
    doc.setFontSize(10);
    doc.text(`Total Revenue: ${fmt(revenueAllTime)}`, 14, 57);
    doc.text(`Pending Payments: ${fmt(pendingAmount)}`, 14, 63);
    doc.text(
      `Total Expenses: ${fmt(expenses.reduce((s, e) => s + e.amount, 0))}`,
      14,
      69
    );
    doc.text(
      `Net Income: ${fmt(
        revenueAllTime - expenses.reduce((s, e) => s + e.amount, 0)
      )}`,
      14,
      75
    );

    autoTable(doc, {
      startY: 82,
      head: [["Date", "Buyer", "Product", "Method", "Status", "Amount"]],
      body: orders.map((o) => [
        new Date(o.created_at).toLocaleDateString(),
        buyerNames[o.buyer_id] || "Buyer",
        o.listing_title,
        o.payment_method,
        o.payment_status,
        fmt(Number(o.total_amount)),
      ]),
      headStyles: { fillColor: [34, 139, 34] },
      styles: { fontSize: 9 },
    });

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      "Harvest Hub Zimbabwe • harvest-hub-zim.lovable.app",
      14,
      290
    );

    doc.save(`harvest-hub-statement-${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Revenue (Month)"
          value={fmt(revenueThisMonth)}
          tone="text-green-600"
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
          tone="text-yellow-600"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Completed Orders"
          value={`${paid.length}`}
        />
      </div>

      {/* Net Income Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Net Income — Last 6 Months</CardTitle>
          <div className="text-sm text-muted-foreground">
            Expenses this month: {fmt(expensesThisMonth)}
          </div>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip
                formatter={(v: number) => fmt(v)}
                contentStyle={{ borderRadius: 8 }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#16a34a" name="Revenue" />
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
              <Bar dataKey="net" fill="#2563eb" name="Net" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Expenses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" /> Expenses
          </CardTitle>
          <AddExpenseDialog onAdd={handleAddExpense} />
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-10 w-10" />}
              title="No expenses logged yet"
              hint="Track inputs, labour, fuel, and other farm costs to see your true net income."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        {new Date(e.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {e.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{e.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        -{fmt(e.amount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteExpense(e.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Transaction History</CardTitle>
          <Button onClick={handleExportPDF} className="gap-2">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-10 w-10" />}
              title="No transactions yet"
              hint="Once buyers pay for your listings, transactions will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        {new Date(o.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{buyerNames[o.buyer_id] || "Buyer"}</TableCell>
                      <TableCell className="font-medium">
                        {o.listing_title}
                        <div className="text-xs text-muted-foreground">
                          {o.quantity} {o.unit}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-xs">
                        {o.payment_method.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusTone(o.payment_status)}
                        >
                          {o.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {fmt(Number(o.total_amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
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
    return (
      dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
    );
  };

  const totalSpentAll = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((s, o) => s + Number(o.total_amount), 0);
  const totalSpentMonth = orders
    .filter((o) => o.payment_status === "paid" && thisMonth(o.created_at))
    .reduce((s, o) => s + Number(o.total_amount), 0);
  const pendingOrders = orders.filter((o) =>
    ["pending", "awaiting_confirmation"].includes(o.payment_status)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
          tone="text-yellow-600"
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
          <TabsTrigger value="pending">
            Pending ({pendingOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <OrderTable
            orders={orders}
            sellerNames={sellerNames}
            onReorder={onReorder}
          />
        </TabsContent>

        <TabsContent value="pending">
          <OrderTable
            orders={pendingOrders}
            sellerNames={sellerNames}
            onReorder={onReorder}
          />
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
      <Card>
        <CardContent className="py-10">
          <EmptyState
            icon={<Inbox className="h-10 w-10" />}
            title="No orders yet"
            hint="Place your first order from the marketplace to see it here."
          />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  {new Date(o.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>{sellerNames[o.farmer_id] || "Farmer"}</TableCell>
                <TableCell className="font-medium">
                  {o.listing_title}
                  <div className="text-xs text-muted-foreground">
                    {o.quantity} {o.unit} • {o.order_code}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusTone(o.payment_status)}
                  >
                    {o.payment_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {fmt(Number(o.total_amount))}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => onReorder(o)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reorder
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
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
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          {icon} {label}
        </div>
        <div className={`text-2xl font-bold mt-1 ${tone ?? ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
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
      id: crypto.randomUUID(),
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
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
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
