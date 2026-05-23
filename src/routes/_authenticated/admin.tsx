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
} from "lucide-react";
import { jsPDF } from "jspdf";

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
      navigate({ to: "/" });
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

        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="listings"><ListingsTab /></TabsContent>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
        <TabsContent value="verification"><VerificationTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
        <TabsContent value="financial"><FinancialTab /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="announcements"><AnnouncementsTab /></TabsContent>
        <TabsContent value="activity"><ActivityTab /></TabsContent>
      </Tabs>
    </section>
  );
}


// ============ Helper: log admin action ============
async function logAction(action: string, target_type = "", target_id = "", details = "") {
  const { data: { user } } = await supabase.auth.getUser();
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
      supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth.toISOString()),
      supabase.from("orders").select("total_amount").gte("created_at", startOfMonth.toISOString()),
      supabase.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("suspended", true),
      supabase.from("fraud_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
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
  useEffect(() => { load(); }, []);

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
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</span>
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
        <h3 className="mb-3 text-sm uppercase tracking-wider text-muted-foreground">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => document.querySelector<HTMLElement>('[value="announcements"]')?.click()}>
            <Megaphone className="h-3.5 w-3.5 mr-1" /> Create Announcement
          </Button>
          <Button size="sm" variant="outline" onClick={() => document.querySelector<HTMLElement>('[value="financial"]')?.click()}>
            <Wallet className="h-3.5 w-3.5 mr-1" /> Financial Report
          </Button>
          <Button size="sm" variant="outline" onClick={() => document.querySelector<HTMLElement>('[value="verification"]')?.click()}>
            <BadgeCheck className="h-3.5 w-3.5 mr-1" /> Approve Sellers
          </Button>
          <Button size="sm" variant="outline" onClick={() => document.querySelector<HTMLElement>('[value="reports"]')?.click()}>
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
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => users.filter((u) =>
      !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search)
    ),
    [users, search]
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
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-9" />
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
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No users found</td></tr>
            ) : filtered.map((u) => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="p-3">
                  <button onClick={() => setSelected(u)} className="text-left hover:text-secondary">
                    {u.full_name || "Unnamed"}
                  </button>
                  <div className="text-xs text-muted-foreground">{u.id.slice(0, 8)}</div>
                </td>
                <td className="p-3">
                  <Select value={u.role} onValueChange={(v) => changeRole(u, v as AppRole)}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["farmer", "buyer", "supplier", "transporter"] as AppRole[]).map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
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
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">ID:</span> {selected?.id}</div>
            <div><span className="text-muted-foreground">Role:</span> {selected && ROLE_LABEL[selected.role]}</div>
            <div><span className="text-muted-foreground">Status:</span> {selected?.suspended ? "Suspended" : "Active"}</div>
            <div><span className="text-muted-foreground">Joined:</span> {selected && new Date(selected.created_at).toLocaleDateString()}</div>
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
  useEffect(() => { load(); }, []);

  async function setStatus(l: any, status: string) {
    const { error } = await supabase.from("listings").update({ status: status as any }).eq("id", l.id);
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
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
            ) : listings.length === 0 ? (
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No listings</td></tr>
            ) : listings.map((l) => (
              <tr key={l.id} className="border-b border-white/5">
                <td className="p-3">{l.title}</td>
                <td className="p-3"><Badge variant="outline">{l.status}</Badge></td>
                <td className="p-3">${Number(l.price).toFixed(2)}</td>
                <td className="p-3 text-right space-x-1">
                  <Button size="sm" variant="outline" onClick={() => setStatus(l, "active")}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => setStatus(l, "flagged")}>Flag</Button>
                  <Button size="sm" variant="destructive" onClick={() => { setReasonFor(l); setReason(""); }}>Remove</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!reasonFor} onOpenChange={(o) => !o && setReasonFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove listing</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">"{reasonFor?.title}"</p>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for removal..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonFor(null)}>Cancel</Button>
            <Button variant="destructive" onClick={removeListing} disabled={!reason}>Confirm Remove</Button>
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
  useEffect(() => { load(); }, []);

  async function updateStatus(o: any, payment_status: string) {
    const { error } = await supabase.from("orders").update({ payment_status: payment_status as any }).eq("id", o.id);
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
            <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
          ) : orders.length === 0 ? (
            <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No orders</td></tr>
          ) : orders.map((o) => (
            <tr key={o.id} className="border-b border-white/5">
              <td className="p-3 font-mono text-xs">{o.order_code}</td>
              <td className="p-3">{o.listing_title}</td>
              <td className="p-3">${Number(o.total_amount).toFixed(2)}</td>
              <td className="p-3"><Badge variant="outline">{o.payment_status}</Badge></td>
              <td className="p-3 text-right">
                <Select value={o.payment_status} onValueChange={(v) => updateStatus(o, v)}>
                  <SelectTrigger className="h-8 w-36 ml-auto"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["pending", "paid", "failed", "refunded"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============ VERIFICATION ============
function VerificationTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesFor, setNotesFor] = useState<{ item: any; action: "approved" | "rejected" } | null>(null);
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
  useEffect(() => { load(); }, []);

  async function submitDecision() {
    if (!notesFor) return;
    const { data: { user } } = await supabase.auth.getUser();
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
      ) : items.map((v) => (
        <div key={v.id} className="glass rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{v.entity_type}</span>
                <Badge variant={v.status === "pending" ? "outline" : v.status === "approved" ? "default" : "destructive"}>
                  {v.status}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">User: {v.user_id.slice(0, 8)}</div>
              {v.notes && <p className="mt-2 text-sm">{v.notes}</p>}
              {v.review_notes && (
                <p className="mt-2 text-xs text-muted-foreground">Review: {v.review_notes}</p>
              )}
            </div>
            {v.status === "pending" && (
              <div className="flex shrink-0 gap-2">
                <Button size="sm" onClick={() => { setNotesFor({ item: v, action: "approved" }); setNotes(""); }}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => { setNotesFor({ item: v, action: "rejected" }); setNotes(""); }}>
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}

      <Dialog open={!!notesFor} onOpenChange={(o) => !o && setNotesFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{notesFor?.action === "approved" ? "Approve" : "Reject"} verification</DialogTitle></DialogHeader>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesFor(null)}>Cancel</Button>
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
  useEffect(() => { load(); }, []);

  async function setStatus(r: any, status: string) {
    const { data: { user } } = await supabase.auth.getUser();
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
      ) : reports.map((r) => (
        <div key={r.id} className="glass rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium capitalize">{r.category}</span>
                <Badge variant={r.status === "open" ? "destructive" : "outline"}>{r.status}</Badge>
              </div>
              <p className="mt-2 text-sm">{r.description}</p>
              <div className="mt-1 text-xs text-muted-foreground">
                Reporter: {r.reporter_id.slice(0, 8)} · {new Date(r.created_at).toLocaleDateString()}
              </div>
            </div>
            <Select value={r.status} onValueChange={(v) => setStatus(r, v)}>
              <SelectTrigger className="h-8 w-32 shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["open", "reviewing", "resolved", "dismissed"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
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
  useEffect(() => { load(); }, []);

  async function create() {
    if (!title || !user) return;
    const { error } = await supabase.from("platform_announcements").insert({
      title, body, level, created_by: user.id,
    });
    if (error) return toast.error(error.message);
    await logAction("create_announcement", "announcement", "", title);
    toast.success("Announcement posted");
    setTitle(""); setBody(""); setLevel("info");
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
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message body..." />
        <div className="flex gap-2">
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={create} disabled={!title}>Publish</Button>
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
              <Button size="sm" variant="outline" onClick={() => toggle(a)}>{a.active ? "Disable" : "Enable"}</Button>
              <Button size="sm" variant="destructive" onClick={() => remove(a)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
        <span className="text-sm uppercase tracking-wider text-muted-foreground">Recent admin actions</span>
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
                  {l.target_type} {l.target_id && `· ${l.target_id.slice(0, 8)}`} {l.details && `· ${l.details}`}
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
