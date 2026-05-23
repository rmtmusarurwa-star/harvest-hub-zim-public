import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  EQUIPMENT_CATEGORIES,
  type EquipmentCategory,
} from "@/lib/equipment-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function PostEquipmentModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    category: "tractors" as EquipmentCategory,
    location: "",
    province: "",
    description: "",
    specs: "",
    price_per_day: "",
    price_per_week: "",
    price_per_month: "",
    deposit: "",
    phone: "",
    delivery_available: false,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in first.");
      if (!form.name || !form.location || !form.price_per_day)
        throw new Error("Name, location and daily price are required.");

      const { error } = await supabase.from("equipment").insert({
        owner_id: user.id,
        name: form.name,
        category: form.category,
        location: form.location,
        province: form.province,
        description: form.description,
        specs: form.specs,
        price_per_day: Number(form.price_per_day) || 0,
        price_per_week: Number(form.price_per_week) || 0,
        price_per_month: Number(form.price_per_month) || 0,
        deposit: Number(form.deposit) || 0,
        phone: form.phone,
        whatsapp: form.phone,
        delivery_available: form.delivery_available,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Equipment listed");
      qc.invalidateQueries({ queryKey: ["equipment"] });
      onClose();
      setForm({
        name: "",
        category: "tractors",
        location: "",
        province: "",
        description: "",
        specs: "",
        price_per_day: "",
        price_per_week: "",
        price_per_month: "",
        deposit: "",
        phone: "",
        delivery_available: false,
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>List your equipment</DialogTitle>
          <DialogDescription>
            Earn from idle machinery. You stay in control of confirmations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="John Deere 5075E Tractor"
            />
          </Field>

          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value as EquipmentCategory)}
              className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
            >
              {EQUIPMENT_CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                <option key={c.value} value={c.value}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Town / area">
              <Input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Harare South"
              />
            </Field>
            <Field label="Province">
              <Input
                value={form.province}
                onChange={(e) => set("province", e.target.value)}
                placeholder="Harare"
              />
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What it's good for, condition, included accessories…"
            />
          </Field>

          <Field label="Specs">
            <Input
              value={form.specs}
              onChange={(e) => set("specs", e.target.value)}
              placeholder="75 HP · 4WD · PTO 540 rpm"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Per day ($)">
              <Input
                type="number"
                value={form.price_per_day}
                onChange={(e) => set("price_per_day", e.target.value)}
              />
            </Field>
            <Field label="Per week ($)">
              <Input
                type="number"
                value={form.price_per_week}
                onChange={(e) => set("price_per_week", e.target.value)}
              />
            </Field>
            <Field label="Per month ($)">
              <Input
                type="number"
                value={form.price_per_month}
                onChange={(e) => set("price_per_month", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Deposit ($)">
              <Input
                type="number"
                value={form.deposit}
                onChange={(e) => set("deposit", e.target.value)}
              />
            </Field>
            <Field label="Contact phone">
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+263…"
              />
            </Field>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <span className="text-sm">Offer delivery to renter</span>
            <Switch
              checked={form.delivery_available}
              onCheckedChange={(v) => set("delivery_available", v)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            disabled={create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Posting…" : "Post listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
