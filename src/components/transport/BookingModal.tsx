import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { VehicleRow } from "@/lib/transport-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function BookingModal({
  vehicle,
  open,
  onClose,
}: {
  vehicle: VehicleRow;
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [cargo, setCargo] = useState("");
  const [weight, setWeight] = useState("");
  const [phone, setPhone] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in first.");
      const isMock = vehicle.id.startsWith("mock-veh-");
      const { error } = await supabase.from("transport_bookings").insert({
        vehicle_id: isMock ? null : vehicle.id,
        buyer_id: user.id,
        owner_id: isMock ? user.id : vehicle.owner_id,
        pickup,
        destination,
        scheduled_date: date || null,
        cargo,
        estimated_weight_kg: Number(weight) || 0,
        contact_phone: phone,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking request sent!");
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      onClose();
      setPickup(""); setDestination(""); setDate("");
      setCargo(""); setWeight(""); setPhone("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!pickup || !destination || !cargo || !phone) {
      toast.error("Pickup, destination, cargo and contact number are required.");
      return;
    }
    mut.mutate();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2"
          >
            <form
              onSubmit={submit}
              className="glass-strong space-y-4 rounded-2xl border border-white/10 p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-secondary/80">
                    Book transport
                  </div>
                  <h3 className="font-display text-xl">{vehicle.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {vehicle.location} · {vehicle.capacity_kg.toLocaleString()} kg capacity
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pickup">Pickup</Label>
                  <Input id="pickup" value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Murehwa Growers" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="destination">Destination</Label>
                  <Input id="destination" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Mbare Musika, Harare" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="weight">Est. weight (kg)</Label>
                  <Input id="weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="2500" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cargo">Cargo description</Label>
                  <Textarea id="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="50 bags maize, 10 crates tomatoes…" rows={3} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="phone">Contact number</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+263 77 123 4567" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="secondary" disabled={mut.isPending}>
                  {mut.isPending ? "Sending…" : "Send booking request"}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
