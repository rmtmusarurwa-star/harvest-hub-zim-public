import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CATEGORIES, PROVINCES, type ListingCategory } from "@/lib/marketplace-data";

const schema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(120),
  category: z.enum(["produce", "livestock", "poultry", "dairy", "grain", "other"]),
  description: z.string().trim().max(2000).default(""),
  price: z.number().min(0).max(1_000_000),
  quantity: z.number().min(0).max(1_000_000),
  unit: z.string().trim().min(1).max(40),
  location: z.string().trim().min(1).max(120),
  province: z.string().trim().min(1).max(80),
  delivery_available: z.boolean(),
});

export function PostListingModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    title: "",
    category: "produce" as ListingCategory,
    description: "",
    price: "",
    quantity: "",
    unit: "kg",
    location: "",
    province: "Harare",
    delivery_available: false,
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in to post a listing.");
      const parsed = schema.parse({
        ...form,
        price: Number(form.price),
        quantity: Number(form.quantity),
      });
      const { error } = await supabase.from("listings").insert({
        ...parsed,
        farmer_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listing posted");
      qc.invalidateQueries({ queryKey: ["listings"] });
      onClose();
      setForm((f) => ({ ...f, title: "", description: "", price: "", quantity: "" }));
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Failed to post listing";
      toast.error(msg);
    },
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong fixed left-1/2 top-1/2 z-50 w-[min(560px,calc(100vw-1.5rem))] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div>
                <h3 className="font-display text-xl">Post a Listing</h3>
                <p className="text-xs text-muted-foreground">
                  Reach buyers across Zimbabwe in seconds.
                </p>
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                mut.mutate();
              }}
              className="space-y-4 p-5"
            >
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  maxLength={120}
                  required
                  placeholder="e.g. 100kg Dovi Groundnuts — Masvingo"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) =>
                      setForm({ ...form, category: v as ListingCategory })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    maxLength={40}
                    required
                    placeholder="kg, ton, bag, bird…"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location / town</Label>
                  <Input
                    id="location"
                    maxLength={120}
                    required
                    placeholder="e.g. Karoi"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Province</Label>
                  <Select
                    value={form.province}
                    onValueChange={(v) => setForm({ ...form, province: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVINCES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  maxLength={2000}
                  rows={4}
                  placeholder="Tell buyers about quality, grade, harvest date, delivery terms…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                <div>
                  <div className="text-sm">Delivery available</div>
                  <div className="text-xs text-muted-foreground">
                    Buyers can request transport to their location.
                  </div>
                </div>
                <Switch
                  checked={form.delivery_available}
                  onCheckedChange={(v) => setForm({ ...form, delivery_available: v })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="secondary"
                  className="flex-1"
                  disabled={mut.isPending}
                >
                  {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Publish Listing
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
