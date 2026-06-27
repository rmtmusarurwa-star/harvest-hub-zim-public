import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SHOP_CATEGORIES, type ShopCategory } from "@/lib/shops-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/shops/setup")({
  component: ShopSetupPage,
});

const PROVINCES = [
  "Harare", "Bulawayo", "Manicaland", "Mashonaland Central",
  "Mashonaland East", "Mashonaland West", "Masvingo",
  "Matabeleland North", "Matabeleland South", "Midlands",
];

function ShopSetupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "agro_vets" as ShopCategory,
    location: "",
    province: "Harare",
    description: "",
    phone: "",
    whatsapp: "",
    email: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) { toast.error("Shop name is required"); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from("shops").insert({
        owner_id: user.id,
        name: form.name.trim(),
        category: form.category,
        location: form.location.trim(),
        province: form.province,
        description: form.description.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim(),
      });
      if (error) throw error;
      toast.success("Shop created! Welcome aboard.");
      void navigate({ to: "/shops/manage" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create shop");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-8 py-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary/15">
          <Store className="h-6 w-6 text-secondary" />
        </div>
        <div>
          <h1 className="font-display text-2xl">Open Your Shop</h1>
          <p className="text-sm text-muted-foreground">Set up your storefront on Harvest Hub</p>
        </div>
      </motion.div>

      <form onSubmit={(e) => { void handleSubmit(e); }} className="glass rounded-2xl border border-white/5 p-6 space-y-5">
        {/* Name + Category */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Shop name *</Label>
            <Input id="name" value={form.name} onChange={set("name")} placeholder="AgroVet Harare" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Category *</Label>
            <select
              id="category"
              value={form.category}
              onChange={set("category")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SHOP_CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Location + Province */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="location">Town / area</Label>
            <Input id="location" value={form.location} onChange={set("location")} placeholder="Borrowdale, Harare" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="province">Province</Label>
            <select
              id="province"
              value={form.province}
              onChange={set("province")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="description">About your shop</Label>
          <textarea
            id="description"
            value={form.description}
            onChange={set("description")}
            rows={3}
            placeholder="What do you sell? What makes your shop special?"
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        {/* Contact */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={set("phone")} placeholder="+263242..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" value={form.whatsapp} onChange={set("whatsapp")} placeholder="+26377..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={set("email")} placeholder="shop@example.co.zw" />
          </div>
        </div>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Creating shop…" : "Create Shop"}
        </Button>
      </form>
    </section>
  );
}
