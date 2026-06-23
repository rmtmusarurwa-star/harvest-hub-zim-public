import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Users,
  Package,
  ShoppingCart,
  BadgeCheck,
  Flag,
  Megaphone,
  History,
  Search,
  Trash2,
  Ban,
  CheckCircle2,
  XCircle,
  Loader2,
  DollarSign,
  TrendingUp,
  Wallet,
  LayoutGrid,
  Download,
  RefreshCw,
  Star,
  Award,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BG_SOFT,
  BRAND_GREEN,
  DANGER,
  SUCCESS,
  TABLE_STYLE,
  WARN,
  drawReportFooter,
  drawReportHeader,
  roundedCard,
  sectionLabel,
  textColor,
} from "@/lib/pdf-report";

import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABEL, type AppRole } from "@/lib/auth-context";
import { useIsAdmin } from "@/lib/use-is-admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useIsAdmin();

  useEffect(() => {
    if (!loading && isAdmin === false) {
      toast.error("Admin access required");
      navigate({ to: "/dashboard" });
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-secondary" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary/10 ring-1 ring-secondary/30">
          <Shield className="h-5 w-5 text-secondary" />
        </div>
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">
            Platform oversight for Harvest Hub Zimbabwe
          </p>
        </div>
      </motion.div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-white/[0.03] p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="listings">
          <ListingsTab />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="verification">
          <VerificationTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
        <TabsContent value="financial">
          <FinancialTab />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="announcements">
          <AnnouncementsTab />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab />
        </TabsContent>
      </Tabs>
    </section>
  );
}

// ============ Helper: log admin action ============
async function logAction(action: string, target_type = "", target_id = "", details = "") {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("admin_activity_log").insert({
    admin_id: user.id,
    action,
    target_type,
    target_id,
    details,
  });
}

// ============ OVERVIEW ============
function OverviewTab() {
  const [stats, setStats] = useState({
    users: 0,
    farmers: 0,
    buyers: 0,
    listings: 0,
    orders: 0,
    revenue: 0,
    pendingVerifications: 0,
    suspended: 0,
    openReports: 0,
  });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [u, f, b, l, o, rev, pv, susp, rep] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "farmer"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "buyer"),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString()),
      supabase.from("orders").select("total_amount").gte("created_at", startOfMonth.toISOString()),
      supabase
        .from("verification_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("suspended", true),
      supabase
        .from("fraud_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
    ]);
    const revenue = (rev.data ?? []).reduce((s, r: any) => s + Number(r.total_amount ?? 0), 0);
    setStats({
      users: u.count ?? 0,
      farmers: f.count ?? 0,
      buyers: b.count ?? 0,
      listings: l.count ?? 0,
      orders: o.count ?? 0,
      revenue,
      pendingVerifications: pv.count ?? 0,
      suspended: susp.count ?? 0,
      openReports: rep.count ?? 0,
    });
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users, icon: Users },
    { label: "Farmers", value: stats.farmers, icon: Users },
    { label: "Buyers", value: stats.buyers, icon: Users },
    { label: "Active Listings", value: stats.listings, icon: Package },
    { label: "Orders (Month)", value: stats.orders, icon: ShoppingCart },
    { label: "Revenue (Month)", value: `$${stats.revenue.toFixed(2)}`, icon: DollarSign },
  ];

  const commission = stats.revenue * 0.02;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
              <c.icon className="h-4 w-4 text-secondary" />
            </div>
            <div className="mt-2 font-display text-2xl">{loading ? "—" : c.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Commission (Month)", value: `$${commission.toFixed(2)}`, icon: Wallet },
          { label: "Pending Verifications", value: stats.pendingVerifications, icon: BadgeCheck },
          { label: "Suspended Accounts", value: stats.suspended, icon: Ban },
          { label: "Open Fraud Reports", value: stats.openReports, icon: Flag },
        ].map((c) => (
          <div key={c.label} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <c.icon className="h-3.5 w-3.5 text-secondary" />
              {c.label}
            </div>
            <div className="mt-2 font-display text-xl">{loading ? "—" : c.value}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-4">
        <h3 className="mb-3 text-sm uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => document.querySelector<HTMLElement>('[value="announcements"]')?.click()}
          >
            <Megaphone className="h-3.5 w-3.5 mr-1" /> Create Announcement
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => document.querySelector<HTMLElement>('[value="financial"]')?.click()}
          >
            <Wallet className="h-3.5 w-3.5 mr-1" /> Financial Report
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => document.querySelector<HTMLElement>('[value="verification"]')?.click()}
          >
            <BadgeCheck className="h-3.5 w-3.5 mr-1" /> Approve Sellers
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => document.querySelector<HTMLElement>('[value="reports"]')?.click()}
          >
            <Flag className="h-3.5 w-3.5 mr-1" /> Review Reports
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ USERS ============
type ProfileRow = {
  id: string;
  full_name: string;
  role: AppRole;
  suspended: boolean;
  created_at: string;
};

function UsersTab() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProfileRow | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role, suspended, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setUsers((data as ProfileRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          !search ||
          u.full_name.toLowerCase().includes(search.toLowerCase()) ||
          u.id.includes(search),
      ),
    [users, search],
  );

  async function changeRole(u: ProfileRow, role: AppRole) {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", u.id);
    if (error) return toast.error(error.message);
    await logAction("change_role", "profile", u.id, `${u.role} → ${role}`);
    toast.success("Role updated");
    load();
  }

  async function toggleSuspend(u: ProfileRow) {
    const next = !u.suspended;
    const { error } = await supabase.from("profiles").update({ suspended: next }).eq("id", u.id);
    if (error) return toast.error(error.message);
    await logAction(next ? "suspend_user" : "unsuspend_user", "profile", u.id, u.full_name);
    toast.success(next ? "User suspended" : "User unsuspended");
    load();
  }

  async function deleteUser(u: ProfileRow) {
    if (!confirm(`Delete ${u.full_name}? This removes their profile.`)) return;
    const { error } = await supabase.from("profiles").delete().eq("id", u.id);
    if (error) return toast.error(error.message);
    await logAction("delete_user", "profile", u.id, u.full_name);
    toast.success("User deleted");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="pl-9"
        />
      </div>
      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3">
                    <button
                      onClick={() => setSelected(u)}
                      className="text-left hover:text-secondary"
                    >
                      {u.full_name || "Unnamed"}
                    </button>
                    <div className="text-xs text-muted-foreground">{u.id.slice(0, 8)}</div>
                  </td>
                  <td className="p-3">
                    <Select value={u.role} onValueChange={(v) => changeRole(u, v as AppRole)}>
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["farmer", "buyer", "supplier", "transporter"] as AppRole[]).map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">
                    {u.suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => toggleSuspend(u)}>
                      <Ban className="h-3.5 w-3.5 mr-1" />
                      {u.suspended ? "Unsuspend" : "Suspend"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteUser(u)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">ID:</span> {selected?.id}
            </div>
            <div>
              <span className="text-muted-foreground">Role:</span>{" "}
              {selected && ROLE_LABEL[selected.role]}
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>{" "}
              {selected?.suspended ? "Suspended" : "Active"}
            </div>
            <div>
              <span className="text-muted-foreground">Joined:</span>{" "}
              {selected && new Date(selected.created_at).toLocaleDateString()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ LISTINGS ============
function ListingsTab() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasonFor, setReasonFor] = useState<any | null>(null);
  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("listings")
      .select("id, title, status, price, farmer_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setListings(data ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function setStatus(l: any, status: string) {
    const { error } = await supabase
      .from("listings")
      .update({ status: status as any })
      .eq("id", l.id);
    if (error) return toast.error(error.message);
    await logAction(`listing_${status}`, "listing", l.id, l.title);
    toast.success(`Listing ${status}`);
    load();
  }

  async function removeListing() {
    if (!reasonFor) return;
    const { error } = await supabase.from("listings").delete().eq("id", reasonFor.id);
    if (error) return toast.error(error.message);
    await logAction("remove_listing", "listing", reasonFor.id, `${reasonFor.title} — ${reason}`);
    toast.success("Listing removed");
    setReasonFor(null);
    setReason("");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Price</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : listings.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  No listings
                </td>
              </tr>
            ) : (
              listings.map((l) => (
                <tr key={l.id} className="border-b border-white/5">
                  <td className="p-3">{l.title}</td>
                  <td className="p-3">
                    <Badge variant="outline">{l.status}</Badge>
                  </td>
                  <td className="p-3">${Number(l.price).toFixed(2)}</td>
                  <td className="p-3 text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => setStatus(l, "active")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(l, "flagged")}>
                      Flag
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setReasonFor(l);
                        setReason("");
                      }}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!reasonFor} onOpenChange={(o) => !o && setReasonFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove listing</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">"{reasonFor?.title}"</p>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for removal..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonFor(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={removeListing} disabled={!reason}>
              Confirm Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ ORDERS ============
function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("id, order_code, listing_title, total_amount, payment_status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setOrders(data ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function updateStatus(o: any, payment_status: string) {
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: payment_status as any })
      .eq("id", o.id);
    if (error) return toast.error(error.message);
    await logAction("update_order", "order", o.id, `${o.order_code} → ${payment_status}`);
    toast.success("Order updated");
    load();
  }

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <table className="w-full text-sm">
        <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="p-3 text-left">Order</th>
            <th className="p-3 text-left">Product</th>
            <th className="p-3 text-left">Amount</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-right">Update</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="p-6 text-center text-muted-foreground">
                Loading...
              </td>
            </tr>
          ) : orders.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-6 text-center text-muted-foreground">
                No orders
              </td>
            </tr>
          ) : (
            orders.map((o) => (
              <tr key={o.id} className="border-b border-white/5">
                <td className="p-3 font-mono text-xs">{o.order_code}</td>
                <td className="p-3">{o.listing_title}</td>
                <td className="p-3">${Number(o.total_amount).toFixed(2)}</td>
                <td className="p-3">
                  <Badge variant="outline">{o.payment_status}</Badge>
                </td>
                <td className="p-3 text-right">
                  <Select value={o.payment_status} onValueChange={(v) => updateStatus(o, v)}>
                    <SelectTrigger className="h-8 w-36 ml-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["pending", "paid", "failed", "refunded"].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============ VERIFICATION ============
function VerificationTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesFor, setNotesFor] = useState<{ item: any; action: "approved" | "rejected" } | null>(
    null,
  );
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("verification_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function submitDecision() {
    if (!notesFor) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("verification_requests")
      .update({
        status: notesFor.action,
        review_notes: notes,
        reviewer_id: user?.id ?? null,
      })
      .eq("id", notesFor.item.id);
    if (error) return toast.error(error.message);
    await logAction(`verification_${notesFor.action}`, "verification", notesFor.item.id, notes);
    toast.success(`Marked ${notesFor.action}`);
    setNotesFor(null);
    setNotes("");
    load();
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="text-center text-muted-foreground py-6">Loading...</div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
          <BadgeCheck className="mx-auto mb-2 h-8 w-8" />
          No verification requests yet
        </div>
      ) : (
        items.map((v) => (
          <div key={v.id} className="glass rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{v.entity_type}</span>
                  <Badge
                    variant={
                      v.status === "pending"
                        ? "outline"
                        : v.status === "approved"
                          ? "default"
                          : "destructive"
                    }
                  >
                    {v.status}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  User: {v.user_id.slice(0, 8)}
                </div>
                {v.notes && <p className="mt-2 text-sm">{v.notes}</p>}
                {v.review_notes && (
                  <p className="mt-2 text-xs text-muted-foreground">Review: {v.review_notes}</p>
                )}
              </div>
              {v.status === "pending" && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setNotesFor({ item: v, action: "approved" });
                      setNotes("");
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setNotesFor({ item: v, action: "rejected" });
                      setNotes("");
                    }}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      <Dialog open={!!notesFor} onOpenChange={(o) => !o && setNotesFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {notesFor?.action === "approved" ? "Approve" : "Reject"} verification
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesFor(null)}>
              Cancel
            </Button>
            <Button onClick={submitDecision}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ REPORTS ============
function ReportsTab() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("fraud_reports")
      .select("*")
      .order("created_at", { ascending: false });
    setReports(data ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function setStatus(r: any, status: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("fraud_reports")
      .update({ status: status as any, resolved_by: user?.id ?? null })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    await logAction(`report_${status}`, "report", r.id, r.category);
    toast.success("Updated");
    load();
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="text-center text-muted-foreground py-6">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
          <Flag className="mx-auto mb-2 h-8 w-8" />
          No fraud reports
        </div>
      ) : (
        reports.map((r) => (
          <div key={r.id} className="glass rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{r.category}</span>
                  <Badge variant={r.status === "open" ? "destructive" : "outline"}>
                    {r.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm">{r.description}</p>
                <div className="mt-1 text-xs text-muted-foreground">
                  Reporter: {r.reporter_id.slice(0, 8)} ·{" "}
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
              <Select value={r.status} onValueChange={(v) => setStatus(r, v)}>
                <SelectTrigger className="h-8 w-32 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["open", "reviewing", "resolved", "dismissed"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ============ ANNOUNCEMENTS ============
function AnnouncementsTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState("info");

  async function load() {
    const { data } = await supabase
      .from("platform_announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!title || !user) return;
    const { error } = await supabase.from("platform_announcements").insert({
      title,
      body,
      level,
      created_by: user.id,
    });
    if (error) return toast.error(error.message);
    await logAction("create_announcement", "announcement", "", title);
    toast.success("Announcement posted");
    setTitle("");
    setBody("");
    setLevel("info");
    load();
  }

  async function toggle(a: any) {
    const { error } = await supabase
      .from("platform_announcements")
      .update({ active: !a.active })
      .eq("id", a.id);
    if (error) return toast.error(error.message);
    load();
  }

  async function remove(a: any) {
    if (!confirm("Delete this announcement?")) return;
    await supabase.from("platform_announcements").delete().eq("id", a.id);
    await logAction("delete_announcement", "announcement", a.id, a.title);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-secondary" />
          <h3 className="font-display text-lg">New announcement</h3>
        </div>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message body..."
        />
        <div className="flex gap-2">
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={create} disabled={!title}>
            Publish
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((a) => (
          <div key={a.id} className="glass flex items-start justify-between gap-3 rounded-2xl p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{a.title}</span>
                <Badge variant="outline">{a.level}</Badge>
                {a.active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" onClick={() => toggle(a)}>
                {a.active ? "Disable" : "Enable"}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => remove(a)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ ACTIVITY ============
function ActivityTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-white/5 p-3">
        <History className="h-4 w-4 text-secondary" />
        <span className="text-sm uppercase tracking-wider text-muted-foreground">
          Recent admin actions
        </span>
      </div>
      {loading ? (
        <div className="p-6 text-center text-muted-foreground">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">No activity yet</div>
      ) : (
        <ul className="divide-y divide-white/5">
          {logs.map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <div className="font-mono text-xs text-secondary">{l.action}</div>
                <div className="text-xs text-muted-foreground">
                  {l.target_type} {l.target_id && `· ${l.target_id.slice(0, 8)}`}{" "}
                  {l.details && `· ${l.details}`}
                </div>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground">
                {new Date(l.created_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============ FINANCIAL ============
function FinancialTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select(
          "id, order_code, total_amount, payment_method, payment_status, listing_title, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      setOrders(data ?? []);
      setLoading(false);
    })();
  }, []);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthOrders = orders.filter((o) => new Date(o.created_at) >= startOfMonth);
  const monthRevenue = monthOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
  const commission = monthRevenue * 0.02;
  const pendingPayouts = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((s, o) => s + Number(o.total_amount ?? 0) * 0.98, 0);
  const outstanding = orders
    .filter((o) => o.payment_status === "pending")
    .reduce((s, o) => s + Number(o.total_amount ?? 0), 0);

  // By payment method
  const byMethod = monthOrders.reduce((acc: Record<string, number>, o) => {
    const k = o.payment_method ?? "other";
    acc[k] = (acc[k] ?? 0) + Number(o.total_amount ?? 0);
    return acc;
  }, {});

  // 12-month trend
  const trend = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const total = orders
      .filter((o) => {
        const c = new Date(o.created_at);
        return c >= d && c < next;
      })
      .reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
    return { month: d.toLocaleString("default", { month: "short" }), total };
  });
  const maxTrend = Math.max(1, ...trend.map((t) => t.total));

  function exportPDF() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const M = 36;
    let y = drawReportHeader(doc, {
      title: "Admin Financial Report",
      subtitle: "Platform-wide revenue & commission",
    });

    const stats: [string, string, [number, number, number]][] = [
      ["Month Revenue", `$${monthRevenue.toFixed(2)}`, BRAND_GREEN],
      ["Commission (2%)", `$${commission.toFixed(2)}`, SUCCESS],
      ["Pending Payouts", `$${pendingPayouts.toFixed(2)}`, WARN],
      ["Outstanding", `$${outstanding.toFixed(2)}`, DANGER],
    ];
    const cardGap = 12;
    const cardW = (W - 2 * M - 3 * cardGap) / 4;
    const cardH = 56;
    stats.forEach(([label, value, color], i) => {
      const x = M + i * (cardW + cardGap);
      roundedCard(doc, x, y, cardW, cardH, BG_SOFT);
      textColor(doc, [110, 120, 115]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(label.toUpperCase(), x + 12, y + 18);
      textColor(doc, color);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(value, x + 12, y + 40);
    });
    y += cardH + 24;

    sectionLabel(doc, "Revenue by Payment Method", M, y);
    y += 10;
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Method", "Revenue (this month)"]],
      body: Object.entries(byMethod).map(([k, v]) => [k.replace(/_/g, " "), `$${v.toFixed(2)}`]),
      ...TABLE_STYLE,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26;

    sectionLabel(doc, "12-Month Trend", M, y);
    y += 10;
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Month", "Total Volume"]],
      body: trend.map((t) => [t.month, `$${t.total.toFixed(2)}`]),
      ...TABLE_STYLE,
    });

    drawReportFooter(doc, "Platform operations · Internal use only");
    doc.save(`harvest-hub-admin-report-${now.toISOString().slice(0, 10)}.pdf`);
    toast.success("Report exported");
  }

  if (loading) return <div className="py-6 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Revenue (Month)", value: `$${monthRevenue.toFixed(2)}`, icon: DollarSign },
          { label: "Commission", value: `$${commission.toFixed(2)}`, icon: Wallet },
          { label: "Pending Payouts", value: `$${pendingPayouts.toFixed(2)}`, icon: TrendingUp },
          { label: "Outstanding", value: `$${outstanding.toFixed(2)}`, icon: ShoppingCart },
        ].map((c) => (
          <div key={c.label} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
              <c.icon className="h-4 w-4 text-secondary" />
            </div>
            <div className="mt-2 font-display text-xl">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-3 text-sm uppercase tracking-wider text-muted-foreground">
            By Payment Method
          </h3>
          {Object.keys(byMethod).length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No data this month</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(byMethod).map(([k, v]) => {
                const pct = (v / monthRevenue) * 100;
                return (
                  <div key={k}>
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{k}</span>
                      <span className="text-muted-foreground">${v.toFixed(2)}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full bg-secondary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-4">
          <h3 className="mb-3 text-sm uppercase tracking-wider text-muted-foreground">
            12-Month Trend
          </h3>
          <div className="flex h-32 items-end gap-1">
            {trend.map((t, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-secondary/70"
                  style={{ height: `${(t.total / maxTrend) * 100}%`, minHeight: "2px" }}
                  title={`$${t.total.toFixed(2)}`}
                />
                <span className="text-[10px] text-muted-foreground">{t.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={exportPDF}>
          <Download className="h-4 w-4 mr-1" /> Export Monthly Report (PDF)
        </Button>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Order</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Method</th>
              <th className="p-3 text-left">Commission</th>
              <th className="p-3 text-left">Payout</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 50).map((o) => (
              <tr key={o.id} className="border-b border-white/5">
                <td className="p-3 text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString()}
                </td>
                <td className="p-3 font-mono text-xs">{o.order_code}</td>
                <td className="p-3">${Number(o.total_amount).toFixed(2)}</td>
                <td className="p-3 text-xs capitalize">{o.payment_method}</td>
                <td className="p-3 text-xs">${(Number(o.total_amount) * 0.02).toFixed(2)}</td>
                <td className="p-3 text-xs">${(Number(o.total_amount) * 0.98).toFixed(2)}</td>
                <td className="p-3">
                  <Badge variant="outline">{o.payment_status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ ANALYTICS ============
type SellerRow = {
  id: string;
  name: string;
  listings: number;
  sales: number;
  revenue: number;
  rating: number;
};

function AnalyticsTab() {
  const [data, setData] = useState<{
    sellers: SellerRow[];
    growth: { month: string; count: number }[];
  }>({
    sellers: [],
    growth: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [profilesRes, listingsRes, ordersRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, role, created_at")
          .in("role", ["farmer", "supplier"]),
        supabase.from("listings").select("id, farmer_id, rating"),
        supabase.from("orders").select("farmer_id, total_amount, created_at"),
      ]);

      const profiles = profilesRes.data ?? [];
      const listings = listingsRes.data ?? [];
      const orders = ordersRes.data ?? [];

      const sellers = profiles
        .map((p) => {
          const myListings = listings.filter((l: any) => l.farmer_id === p.id);
          const myOrders = orders.filter((o: any) => o.farmer_id === p.id);
          const revenue = myOrders.reduce((s, o: any) => s + Number(o.total_amount ?? 0), 0);
          const avgRating = myListings.length
            ? myListings.reduce((s, l: any) => s + Number(l.rating ?? 0), 0) / myListings.length
            : 0;
          return {
            id: p.id,
            name: p.full_name || "Unnamed",
            listings: myListings.length,
            sales: myOrders.length,
            revenue,
            rating: avgRating,
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 20);

      const now = new Date();
      const growth = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const count = profiles.filter((p: any) => {
          const c = new Date(p.created_at);
          return c >= d && c < next;
        }).length;
        return { month: d.toLocaleString("default", { month: "short" }), count };
      });

      setData({ sellers, growth });
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid h-48 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-secondary" />
      </div>
    );
  }

  const totalNewSellers = data.growth.reduce((s, g) => s + g.count, 0);
  const thisMonth = data.growth[data.growth.length - 1]?.count ?? 0;
  const lastMonth = data.growth[data.growth.length - 2]?.count ?? 0;
  const momChange = lastMonth
    ? ((thisMonth - lastMonth) / lastMonth) * 100
    : thisMonth > 0
      ? 100
      : 0;
  const totalRevenue = data.sellers.reduce((s, x) => s + x.revenue, 0);
  const avgRating = data.sellers.length
    ? data.sellers.reduce((s, x) => s + x.rating, 0) / data.sellers.length
    : 0;
  const topSeller = data.sellers[0];
  const maxRevenue = Math.max(1, ...data.sellers.map((s) => s.revenue));

  const summaryCards: {
    label: string;
    value: string | number;
    icon: typeof Users;
    delta?: number;
  }[] = [
    { label: "New Sellers (12mo)", value: totalNewSellers, icon: Users },
    { label: "This Month", value: thisMonth, icon: TrendingUp, delta: momChange },
    { label: "Network Revenue", value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign },
    { label: "Avg Seller Rating", value: avgRating.toFixed(1), icon: Star },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {summaryCards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
              <c.icon className="h-4 w-4 text-secondary" />
            </div>
            <div className="mt-2 font-display text-2xl">{c.value}</div>
            {c.delta !== undefined && (
              <div
                className={`mt-1 flex items-center gap-1 text-xs ${
                  c.delta >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {c.delta >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {Math.abs(c.delta).toFixed(0)}% vs last month
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass rounded-2xl p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg">
            <BarChart3 className="h-4 w-4 text-secondary" /> New Sellers — 12 Month Trend
          </h3>
          <span className="text-xs text-muted-foreground">Platform-wide onboarding</span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.growth}>
              <defs>
                <linearGradient id="sellerGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis dataKey="month" fontSize={11} stroke="rgba(240,237,230,0.4)" />
              <YAxis fontSize={11} allowDecimals={false} stroke="rgba(240,237,230,0.4)" />
              <Tooltip
                contentStyle={{
                  background: "#0F1F18",
                  border: "1px solid rgba(243,240,232,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#C9A84C" }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="New sellers"
                stroke="#C9A84C"
                strokeWidth={2}
                fill="url(#sellerGrowth)"
                dot={{ r: 3, fill: "#C9A84C" }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass overflow-hidden rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/5 p-4">
          <h3 className="flex items-center gap-2 font-display text-lg">
            <Award className="h-4 w-4 text-secondary" /> Top Sellers
          </h3>
          {topSeller && (
            <span className="text-xs text-muted-foreground">
              Leading: <span className="text-secondary">{topSeller.name}</span>
            </span>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Seller</th>
              <th className="p-3 text-right">Listings</th>
              <th className="p-3 text-right">Sales</th>
              <th className="p-3 text-right">Revenue</th>
              <th className="p-3 text-right">Rating</th>
            </tr>
          </thead>
          <tbody>
            {data.sellers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No seller data yet
                </td>
              </tr>
            ) : (
              data.sellers.map((s, i) => (
                <tr
                  key={s.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="p-3">
                    {i < 3 ? (
                      <span
                        className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${
                          i === 0
                            ? "bg-secondary/25 text-secondary"
                            : i === 1
                              ? "bg-white/10 text-foreground"
                              : "bg-accent/15 text-accent"
                        }`}
                      >
                        {i + 1}
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary/15 font-display text-xs text-secondary">
                        {s.name.charAt(0).toUpperCase()}
                      </span>
                      {s.name}
                    </div>
                  </td>
                  <td className="p-3 text-right">{s.listings}</td>
                  <td className="p-3 text-right">{s.sales}</td>
                  <td className="p-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-display text-secondary">${s.revenue.toFixed(2)}</span>
                      <div className="h-1 w-20 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-secondary to-accent"
                          style={{ width: `${Math.max(4, (s.revenue / maxRevenue) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-secondary text-secondary" />
                      {s.rating.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}

// ============ CATEGORIES ============
function CategoriesTab() {
  const [rows, setRows] = useState<{ category: string; count: number; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [listingsRes, ordersRes] = await Promise.all([
        supabase.from("listings").select("id, category"),
        supabase.from("orders").select("listing_id, total_amount"),
      ]);
      const listings = listingsRes.data ?? [];
      const orders = ordersRes.data ?? [];
      const byCat = new Map<string, { count: number; revenue: number }>();
      for (const l of listings as any[]) {
        const c = byCat.get(l.category) ?? { count: 0, revenue: 0 };
        c.count += 1;
        byCat.set(l.category, c);
      }
      for (const o of orders as any[]) {
        const l = (listings as any[]).find((x) => x.id === o.listing_id);
        if (!l) continue;
        const c = byCat.get(l.category) ?? { count: 0, revenue: 0 };
        c.revenue += Number(o.total_amount ?? 0);
        byCat.set(l.category, c);
      }
      setRows(
        Array.from(byCat.entries())
          .map(([category, v]) => ({ category, ...v }))
          .sort((a, b) => b.count - a.count),
      );
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="py-6 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-secondary" />
          <h3 className="font-display text-lg">Listing Categories</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Categories are defined by the platform taxonomy. Default commission rate: 2%.
        </p>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-right">Listings</th>
              <th className="p-3 text-right">Revenue</th>
              <th className="p-3 text-right">Commission (2%)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  No categories yet
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.category} className="border-b border-white/5">
                  <td className="p-3 capitalize">{r.category.replace(/_/g, " ")}</td>
                  <td className="p-3 text-right">{r.count}</td>
                  <td className="p-3 text-right">${r.revenue.toFixed(2)}</td>
                  <td className="p-3 text-right">${(r.revenue * 0.02).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
