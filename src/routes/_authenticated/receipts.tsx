import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarIcon,
  Download,
  Eye,
  Printer,
  Receipt as ReceiptIcon,
  Search,
  Share2,
  Inbox,
  Mail,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  downloadReceiptPDF,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  type OrderRow,
} from "@/lib/order-utils";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/receipts")({
  component: ReceiptsPage,
});

const PAGE_SIZE = 25;

const STATUS_COLOR: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  awaiting_confirmation: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  failed: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  cancelled: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

type ProfileLite = { id: string; full_name: string | null };
type OrderWithSubtotal = OrderRow & { subtotal?: number | string | null };

function moneySplit(o: OrderRow) {
  const order = o as OrderWithSubtotal;
  const total = Number(o.total_amount);
  const subtotal =
    order.subtotal == null ? Math.round((total / 1.02) * 100) / 100 : Number(order.subtotal);
  const fee = Math.max(0, Math.round((total - subtotal) * 100) / 100);
  return { subtotal, fee, total };
}

function ReceiptsPage() {
  const { user, profile } = useAuth();
  const me = user?.id;

  const [searchQ, setSearchQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<OrderRow | null>(null);

  const {
    data: orders = [],
    isLoading,
    error: ordersError,
  } = useQuery({
    queryKey: ["receipts", me],
    enabled: !!me,
    queryFn: async (): Promise<OrderRow[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .or(`buyer_id.eq.${me},farmer_id.eq.${me}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
  });

  // Fetch counterparty profile names
  const counterpartyIds = useMemo(() => {
    const ids = new Set<string>();
    orders.forEach((o) => {
      const other = o.buyer_id === me ? o.farmer_id : o.buyer_id;
      if (other) ids.add(other);
    });
    return Array.from(ids);
  }, [orders, me]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["receipt-counterparties", counterpartyIds.join(",")],
    enabled: counterpartyIds.length > 0,
    queryFn: async (): Promise<ProfileLite[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", counterpartyIds);
      if (error) throw error;
      return (data ?? []) as ProfileLite[];
    },
  });
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach((p) => m.set(p.id, p.full_name || "Member"));
    return m;
  }, [profiles]);

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    const min = minAmt ? Number(minAmt) : null;
    const max = maxAmt ? Number(maxAmt) : null;
    return orders.filter((o) => {
      if (q && !o.order_code.toLowerCase().includes(q)) return false;
      if (status !== "all" && o.payment_status !== status) return false;
      const d = new Date(o.created_at);
      if (from && d < from) return false;
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      const amt = Number(o.total_amount);
      if (min !== null && amt < min) return false;
      if (max !== null && amt > max) return false;
      return true;
    });
  }, [orders, searchQ, status, from, to, minAmt, maxAmt]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetFilters() {
    setSearchQ("");
    setStatus("all");
    setFrom(undefined);
    setTo(undefined);
    setMinAmt("");
    setMaxAmt("");
    setPage(1);
  }

  async function handleDownload(o: OrderRow) {
    try {
      const buyerName = profile?.full_name || user?.email || "Buyer";
      await downloadReceiptPDF([o], buyerName);
      toast.success("Receipt downloaded");
    } catch {
      toast.error("Failed to generate receipt");
    }
  }

  function handlePrint(o: OrderRow) {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) {
      toast.error("Pop-up blocked");
      return;
    }
    const counterparty =
      (o.buyer_id === me ? nameById.get(o.farmer_id) : nameById.get(o.buyer_id)) || "Member";
    const role = o.buyer_id === me ? "Seller" : "Buyer";
    const split = moneySplit(o);
    w.document.write(`<!doctype html><html><head><meta charset="utf-8" />
<title>Receipt ${o.order_code}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1e2923;padding:32px;max-width:720px;margin:0 auto}
  h1{font-size:22px;margin:0 0 4px} .muted{color:#6e7873;font-size:12px}
  .head{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0d3b2e;padding-bottom:16px;margin-bottom:24px}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;background:#16804720;color:#168047;text-transform:uppercase;letter-spacing:.1em}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  th,td{padding:10px;text-align:left;border-bottom:1px solid #e1e4e0;font-size:13px}
  th{background:#f8faf7;color:#6e7873;text-transform:uppercase;font-size:10px;letter-spacing:.1em}
  .row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}
  .total{font-size:18px;font-weight:600;color:#0d3b2e}
  .card{border:1px solid #e1e4e0;border-radius:8px;padding:16px;margin-top:16px}
</style></head><body>
<div class="head">
  <div>
    <h1>HARVEST HUB</h1>
    <div class="muted">Zimbabwe · Receipt</div>
  </div>
  <div style="text-align:right">
    <div class="badge">${PAYMENT_STATUS_LABEL[o.payment_status]}</div>
    <div class="muted" style="margin-top:6px">${new Date(o.created_at).toLocaleString()}</div>
  </div>
</div>
<div class="card">
  <div class="row"><span class="muted">Order ID</span><strong>${o.order_code}</strong></div>
  <div class="row"><span class="muted">${role}</span><span>${counterparty}</span></div>
  <div class="row"><span class="muted">Payment Method</span><span>${PAYMENT_METHOD_LABEL[o.payment_method]}</span></div>
</div>
<table>
  <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>
    <tr>
      <td>${o.listing_title}</td>
      <td>${o.quantity} ${o.unit}</td>
      <td>$${Number(o.unit_price).toFixed(2)}</td>
      <td style="text-align:right">$${split.subtotal.toFixed(2)}</td>
    </tr>
  </tbody>
</table>
<div class="card">
  <div class="row"><span class="muted">Produce subtotal</span><span>$${split.subtotal.toFixed(2)}</span></div>
  <div class="row"><span class="muted">Harvest Hub fee (2%)</span><span>$${split.fee.toFixed(2)}</span></div>
  <div class="row total"><span>Grand Total</span><span>$${split.total.toFixed(2)}</span></div>
</div>
<p class="muted" style="margin-top:24px;text-align:center">Thank you for trading on Harvest Hub.</p>
<script>window.onload=()=>{window.print();}</script>
</body></html>`);
    w.document.close();
  }

  function shareText(o: OrderRow) {
    const split = moneySplit(o);
    return `Harvest Hub Receipt\nOrder: ${o.order_code}\nItem: ${o.listing_title}\nAmount: $${Number(
      o.total_amount,
    ).toFixed(
      2,
    )}\nHarvest Hub fee: $${split.fee.toFixed(2)}\nStatus: ${PAYMENT_STATUS_LABEL[o.payment_status]}\nDate: ${new Date(o.created_at).toLocaleDateString()}`;
  }

  function shareWhatsApp(o: OrderRow) {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText(o))}`;
    window.open(url, "_blank");
  }

  function shareEmail(o: OrderRow) {
    const subject = `Harvest Hub Receipt ${o.order_code}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareText(o))}`;
    window.location.href = url;
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-secondary/80">
              Receipts · {filtered.length} of {orders.length}
            </span>
          </div>
          <h1 className="font-display text-3xl leading-tight md:text-4xl">
            Receipts &amp; Invoices
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every order you've paid for or sold, in one place.
          </p>
        </div>
      </header>

      {/* Error banner */}
      {ordersError && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <span className="font-medium">Could not load receipts.</span>
            <span className="ml-2 text-rose-300/70">{(ordersError as Error).message}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass rounded-2xl border border-white/5 p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs">Search Order ID</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="HHZ-..."
                value={searchQ}
                onChange={(e) => {
                  setSearchQ(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="awaiting_confirmation">Awaiting Confirmation</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "mt-1 w-full justify-start text-left font-normal",
                      !from && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {from ? format(from, "MMM d") : "Start"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={from}
                    onSelect={(d) => {
                      setFrom(d);
                      setPage(1);
                    }}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "mt-1 w-full justify-start text-left font-normal",
                      !to && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {to ? format(to, "MMM d") : "End"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={to}
                    onSelect={(d) => {
                      setTo(d);
                      setPage(1);
                    }}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Min $</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={minAmt}
                onChange={(e) => {
                  setMinAmt(e.target.value);
                  setPage(1);
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Max $</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="∞"
                value={maxAmt}
                onChange={(e) => {
                  setMaxAmt(e.target.value);
                  setPage(1);
                }}
                className="mt-1"
              />
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Reset filters
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-white/5 p-2 md:p-4">
        {isLoading ? (
          <div className="grid place-items-center py-16 text-sm text-muted-foreground">
            Loading receipts…
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center gap-3 py-16 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-secondary/10">
              <Inbox className="h-7 w-7 text-secondary" />
            </div>
            <div className="font-display text-xl">No receipts yet</div>
            <p className="max-w-sm text-sm text-muted-foreground">
              When you complete an order — buying or selling — its receipt will appear here for safe
              keeping.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Counterparty</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((o) => {
                    const isBuyer = o.buyer_id === me;
                    const otherId = isBuyer ? o.farmer_id : o.buyer_id;
                    const otherName = nameById.get(otherId) || "Member";
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.order_code}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(o.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="text-foreground">{otherName}</div>
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            {isBuyer ? "Seller" : "Buyer"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${Number(o.total_amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px]", STATUS_COLOR[o.payment_status])}
                          >
                            {PAYMENT_STATUS_LABEL[o.payment_status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <RowActions
                            order={o}
                            onView={() => setViewing(o)}
                            onDownload={() => handleDownload(o)}
                            onPrint={() => handlePrint(o)}
                            onShareWA={() => shareWhatsApp(o)}
                            onShareEmail={() => shareEmail(o)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {pageItems.map((o) => {
                const isBuyer = o.buyer_id === me;
                const otherId = isBuyer ? o.farmer_id : o.buyer_id;
                const otherName = nameById.get(otherId) || "Member";
                return (
                  <div key={o.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-secondary">{o.order_code}</div>
                        <div className="mt-1 truncate text-sm">{o.listing_title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {isBuyer ? "From" : "To"} {otherName} ·{" "}
                          {format(new Date(o.created_at), "MMM d, yyyy")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm">
                          ${Number(o.total_amount).toFixed(2)}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("mt-1 text-[10px]", STATUS_COLOR[o.payment_status])}
                        >
                          {PAYMENT_STATUS_LABEL[o.payment_status]}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <RowActions
                        order={o}
                        onView={() => setViewing(o)}
                        onDownload={() => handleDownload(o)}
                        onPrint={() => handlePrint(o)}
                        onShareWA={() => shareWhatsApp(o)}
                        onShareEmail={() => shareEmail(o)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between px-2">
                <div className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* View receipt dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptIcon className="h-5 w-5 text-secondary" />
              Receipt {viewing?.order_code}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <ReceiptPreview
              order={viewing}
              counterparty={
                (viewing.buyer_id === me
                  ? nameById.get(viewing.farmer_id)
                  : nameById.get(viewing.buyer_id)) || "Member"
              }
              isBuyer={viewing.buyer_id === me}
              onDownload={() => handleDownload(viewing)}
              onPrint={() => handlePrint(viewing)}
              onShareWA={() => shareWhatsApp(viewing)}
              onShareEmail={() => shareEmail(viewing)}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function RowActions(props: {
  order: OrderRow;
  onView: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onShareWA: () => void;
  onShareEmail: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <Button size="sm" variant="ghost" onClick={props.onView}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={props.onDownload}>
        <Download className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={props.onPrint}>
        <Printer className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost">
            <Share2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={props.onShareWA}>
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={props.onShareEmail}>
            <Mail className="h-4 w-4" /> Email
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ReceiptPreview(props: {
  order: OrderRow;
  counterparty: string;
  isBuyer: boolean;
  onDownload: () => void;
  onPrint: () => void;
  onShareWA: () => void;
  onShareEmail: () => void;
}) {
  const o = props.order;
  const split = moneySplit(o);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div>
            <div className="font-display text-lg">HARVEST HUB</div>
            <div className="text-[11px] uppercase tracking-widest text-secondary/80">
              Zimbabwe · Receipt
            </div>
          </div>
          <Badge variant="outline" className={cn("text-[10px]", STATUS_COLOR[o.payment_status])}>
            {PAYMENT_STATUS_LABEL[o.payment_status]}
          </Badge>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Order ID</dt>
          <dd className="text-right font-mono">{o.order_code}</dd>
          <dt className="text-muted-foreground">Date</dt>
          <dd className="text-right">{format(new Date(o.created_at), "PPpp")}</dd>
          <dt className="text-muted-foreground">{props.isBuyer ? "Seller" : "Buyer"}</dt>
          <dd className="text-right">{props.counterparty}</dd>
          <dt className="text-muted-foreground">Payment</dt>
          <dd className="text-right">{PAYMENT_METHOD_LABEL[o.payment_method]}</dd>
        </dl>
        <div className="mt-4 rounded-lg bg-white/[0.03] p-3">
          <div className="flex justify-between text-sm">
            <span>{o.listing_title}</span>
            <span className="font-mono">
              {o.quantity} {o.unit} × ${Number(o.unit_price).toFixed(2)}
            </span>
          </div>
        </div>
        <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Produce subtotal</span>
            <span className="font-mono">${split.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Harvest Hub fee (2%)</span>
            <span className="font-mono text-amber-400">${split.fee.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Grand Total
            </span>
            <span className="font-display text-2xl text-secondary">${split.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={props.onDownload}>
          <Download className="h-4 w-4" /> Download PDF
        </Button>
        <Button variant="outline" onClick={props.onPrint}>
          <Printer className="h-4 w-4" /> Print
        </Button>
        <Button variant="outline" onClick={props.onShareWA}>
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </Button>
        <Button variant="outline" onClick={props.onShareEmail}>
          <Mail className="h-4 w-4" /> Email
        </Button>
      </div>
    </div>
  );
}
