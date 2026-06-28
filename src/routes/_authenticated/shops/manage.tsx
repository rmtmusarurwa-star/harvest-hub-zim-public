import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Edit2,
  ExternalLink,
  Package,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  SHOP_CATEGORIES,
  categoryLabel,
  type ShopCategory,
  type ShopProductRow,
  type ShopRow,
} from "@/lib/shops-data";
import { PAYMENT_STATUS_LABEL } from "@/lib/order-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/shops/manage")({
  component: ShopManagePage,
});

const PROVINCES = [
  "Harare", "Bulawayo", "Manicaland", "Mashonaland Central",
  "Mashonaland East", "Mashonaland West", "Masvingo",
  "Matabeleland North", "Matabeleland South", "Midlands",
];

// ── Empty product form ───────────────────────────────────────────────────────
const EMPTY_PRODUCT = {
  name: "",
  price: "",
  unit: "kg",
  stock_quantity: "",
  description: "",
  image_url: "",
};

function ShopManagePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Shop query
  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ["my-shop", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ShopRow | null;
    },
  });

  // Products query
  const { data: products = [] } = useQuery({
    queryKey: ["my-shop-products", shop?.id],
    enabled: !!shop?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_products")
        .select("*")
        .eq("shop_id", shop!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ShopProductRow[];
    },
  });

  // Orders stats query (orders where this user is the seller)
  const { data: salesOrders = [] } = useQuery({
    queryKey: ["my-shop-sales", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("total_amount, payment_status, created_at")
        .eq("farmer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Product form state
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ShopProductRow | null>(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [savingProduct, setSavingProduct] = useState(false);

  // Shop settings form state
  const [editingShop, setEditingShop] = useState(false);
  const [shopForm, setShopForm] = useState<Partial<ShopRow>>({});
  const [savingShop, setSavingShop] = useState(false);

  // ── Redirect if no shop ───────────────────────────────────────────────────
  if (!shopLoading && !shop) {
    return (
      <section className="mx-auto max-w-md py-20 text-center">
        <Store className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h2 className="mt-4 font-display text-2xl">You don't have a shop yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your storefront to sell products on Harvest Hub.
        </p>
        <Button asChild className="mt-6">
          <Link to="/shops/setup">Open a Shop</Link>
        </Button>
      </section>
    );
  }

  if (shopLoading || !shop) {
    return (
      <div className="grid place-items-center py-20 text-sm text-muted-foreground">
        Loading your shop…
      </div>
    );
  }

  // TypeScript can't narrow `shop` inside closures after an early-return guard,
  // so we cast once here and use `s` throughout.
  const s = shop as ShopRow;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const paidOrders = salesOrders.filter((o) => o.payment_status === "paid");
  const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.total_amount), 0);
  const pendingCount = salesOrders.filter((o) => o.payment_status === "pending").length;

  // ── Product CRUD ──────────────────────────────────────────────────────────
  function openAddProduct() {
    setEditingProduct(null);
    setProductForm(EMPTY_PRODUCT);
    setShowProductForm(true);
  }

  function openEditProduct(p: ShopProductRow) {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      price: String(p.price),
      unit: p.unit,
      stock_quantity: String(p.stock_quantity),
      description: p.description,
      image_url: p.image_url ?? "",
    });
    setShowProductForm(true);
  }

  function closeProductForm() {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductForm(EMPTY_PRODUCT);
  }

  const setP = (k: keyof typeof EMPTY_PRODUCT) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setProductForm((prev) => ({ ...prev, [k]: e.target.value }));

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!productForm.name.trim()) { toast.error("Product name required"); return; }
    setSavingProduct(true);
    try {
      const payload = {
        shop_id: s.id,
        name: productForm.name.trim(),
        price: parseFloat(productForm.price) || 0,
        unit: productForm.unit.trim() || "unit",
        stock_quantity: parseInt(productForm.stock_quantity) || 0,
        description: productForm.description.trim(),
        image_url: productForm.image_url.trim() || null,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("shop_products")
          .update(payload)
          .eq("id", editingProduct.id);
        if (error) throw error;
        toast.success("Product updated");
      } else {
        const { error } = await supabase.from("shop_products").insert(payload);
        if (error) throw error;
        toast.success("Product added");
      }

      void qc.invalidateQueries({ queryKey: ["my-shop-products", s.id] });
      closeProductForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSavingProduct(false);
    }
  }

  async function deleteProduct(p: ShopProductRow) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("shop_products").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product removed");
    void qc.invalidateQueries({ queryKey: ["my-shop-products", s.id] });
  }

  // ── Shop settings ─────────────────────────────────────────────────────────
  function startEditShop() {
    setShopForm({
      name: s.name,
      category: s.category,
      location: s.location,
      province: s.province,
      description: s.description,
      phone: s.phone,
      whatsapp: s.whatsapp,
      email: s.email,
    });
    setEditingShop(true);
  }

  const setS = (k: keyof typeof shopForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setShopForm((prev) => ({ ...prev, [k]: e.target.value }));

  async function saveShopSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingShop(true);
    try {
      const { error } = await supabase
        .from("shops")
        .update(shopForm as never)
        .eq("id", s.id);
      if (error) throw error;
      toast.success("Shop details updated");
      void qc.invalidateQueries({ queryKey: ["my-shop", user?.id] });
      setEditingShop(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingShop(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6 py-2">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl border border-white/5 p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-secondary/15 text-2xl">
              {SHOP_CATEGORIES.find((c) => c.value === s.category)?.icon ?? "🏪"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl">{s.name}</h1>
                {s.verified && (
                  <BadgeCheck className="h-4 w-4 text-secondary" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {categoryLabel(s.category)} · {s.location}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button asChild variant="outline" size="sm">
              <Link to="/shops/$shopId" params={{ shopId: s.id }}>
                <ExternalLink className="h-3.5 w-3.5" /> View public page
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={startEditShop}>
              <Edit2 className="h-3.5 w-3.5" /> Edit details
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Products", value: products.length },
            { label: "Total orders", value: salesOrders.length, sub: `${pendingCount} pending` },
            { label: "Revenue", value: `$${totalRevenue.toFixed(2)}`, sub: "paid orders" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white/5 p-3 text-center">
              <div className="font-display text-xl text-secondary">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
              {s.sub && <div className="text-[10px] text-muted-foreground/60">{s.sub}</div>}
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products" className="gap-1.5">
            <Package className="h-3.5 w-3.5" /> Products ({products.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5" /> Orders ({salesOrders.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Store className="h-3.5 w-3.5" /> Shop settings
          </TabsTrigger>
        </TabsList>

        {/* ── Products tab ── */}
        <TabsContent value="products" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {products.length === 0 ? "No products yet — add your first one." : `${products.length} product${products.length > 1 ? "s" : ""} listed`}
            </p>
            <Button size="sm" onClick={openAddProduct}>
              <Plus className="h-4 w-4" /> Add product
            </Button>
          </div>

          {/* Product form (inline) */}
          {showProductForm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl border border-secondary/20 p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display">{editingProduct ? "Edit product" : "New product"}</h3>
                <button onClick={closeProductForm} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={(e) => { void saveProduct(e); }} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Product name *</Label>
                    <Input value={productForm.name} onChange={setP("name")} placeholder="Broiler Starter Mash 50kg" required />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label>Price (USD) *</Label>
                      <Input type="number" min="0" step="0.01" value={productForm.price} onChange={setP("price")} placeholder="0.00" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Unit</Label>
                      <Input value={productForm.unit} onChange={setP("unit")} placeholder="kg / bag / piece" />
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Stock quantity</Label>
                    <Input type="number" min="0" value={productForm.stock_quantity} onChange={setP("stock_quantity")} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Image URL (optional)</Label>
                    <Input value={productForm.image_url} onChange={setP("image_url")} placeholder="https://..." />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <textarea
                    value={productForm.description}
                    onChange={setP("description")}
                    rows={2}
                    placeholder="Brief product description…"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={closeProductForm}>Cancel</Button>
                  <Button type="submit" size="sm" disabled={savingProduct}>
                    {savingProduct ? "Saving…" : editingProduct ? "Save changes" : "Add product"}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Products list */}
          {products.length > 0 && (
            <div className="glass rounded-2xl border border-white/5 divide-y divide-white/5">
              {products.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary/10 text-base">
                    📦
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${Number(p.price).toFixed(2)} / {p.unit} · {p.stock_quantity} in stock
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => openEditProduct(p)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:text-destructive" onClick={() => { void deleteProduct(p); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Orders tab ── */}
        <TabsContent value="orders" className="mt-4">
          <div className="glass rounded-2xl border border-white/5 p-6 text-center space-y-3">
            <ShoppingBag className="mx-auto h-10 w-10 text-secondary/50" />
            <p className="text-sm text-muted-foreground">
              All incoming orders appear in your <strong>Sales</strong> tab on the Orders page.
              You'll also get a notification every time a payment is confirmed.
            </p>
            <Button asChild size="sm">
              <Link to="/orders">Go to Orders →</Link>
            </Button>
          </div>

          {/* Recent sales summary */}
          {salesOrders.length > 0 && (
            <div className="mt-4 glass rounded-2xl border border-white/5 divide-y divide-white/5">
              {salesOrders.slice(0, 8).map((o, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    o.payment_status === "paid"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : o.payment_status === "failed"
                      ? "bg-red-500/15 text-red-400"
                      : "bg-amber-500/15 text-amber-400"
                  }`}>
                    {PAYMENT_STATUS_LABEL[o.payment_status as keyof typeof PAYMENT_STATUS_LABEL] ?? o.payment_status}
                  </span>
                  <span className="font-mono text-secondary">${Number(o.total_amount).toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Settings tab ── */}
        <TabsContent value="settings" className="mt-4">
          {!editingShop ? (
            <div className="glass rounded-2xl border border-white/5 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display">Shop details</h3>
                <Button variant="outline" size="sm" onClick={startEditShop}>
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </Button>
              </div>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                {[
                  ["Name", s.name],
                  ["Category", categoryLabel(s.category)],
                  ["Location", s.location],
                  ["Province", s.province],
                  ["Phone", s.phone || "—"],
                  ["WhatsApp", s.whatsapp || "—"],
                  ["Email", s.email || "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5">{v}</dd>
                  </div>
                ))}
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">About</dt>
                  <dd className="mt-0.5 text-sm">{s.description || "—"}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl border border-secondary/20 p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display">Edit shop details</h3>
                <button onClick={() => setEditingShop(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={(e) => { void saveShopSettings(e); }} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Shop name</Label>
                    <Input value={shopForm.name ?? ""} onChange={setS("name")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <select
                      value={shopForm.category ?? "agro_vets"}
                      onChange={setS("category")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {SHOP_CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                        <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Town / area</Label>
                    <Input value={shopForm.location ?? ""} onChange={setS("location")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Province</Label>
                    <select
                      value={shopForm.province ?? "Harare"}
                      onChange={setS("province")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>About your shop</Label>
                  <textarea
                    value={shopForm.description ?? ""}
                    onChange={setS("description")}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={shopForm.phone ?? ""} onChange={setS("phone")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>WhatsApp</Label>
                    <Input value={shopForm.whatsapp ?? ""} onChange={setS("whatsapp")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={shopForm.email ?? ""} onChange={setS("email")} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setEditingShop(false)}>Cancel</Button>
                  <Button type="submit" disabled={savingShop}>
                    {savingShop ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
