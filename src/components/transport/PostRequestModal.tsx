import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PostRequestModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [cargo, setCargo] = useState("");
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState("");
  const [budget, setBudget] = useState("");
  const [phone, setPhone] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in first.");
      const { error } = await supabase.from("transport_requests").insert({
        poster_id: user.id,
        pickup,
        destination,
        cargo,
        estimated_weight_kg: Number(weight) || 0,
        scheduled_date: date || null,
        budget: Number(budget) || 0,
        contact_phone: phone,
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transport request posted");
      qc.invalidateQueries({ queryKey: ["transport-requests"] });
      onClose();
      setPickup(""); setDestination(""); setCargo("");
      setWeight(""); setDate(""); setBudget(""); setPhone("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!pickup || !destination || !cargo) {
      toast.error("Pickup, destination and cargo are required.");
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
            className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2"
          >
            <form
              onSubmit={submit}
              className="glass-strong space-y-4 rounded-2xl border border-white/10 p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-secondary/80">
                    Transport board
                  </div>
                  <h3 className="font-display text-xl">Post a transport need</h3>
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
                  <Label>Pickup</Label>
                  <Input value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Macheke" />
                </div>
                <div className="space-y-1.5">
                  <Label>Destination</Label>
                  <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Mbare Musika" />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Est. weight (kg)</Label>
                  <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="3000" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Cargo</Label>
                  <Textarea value={cargo} onChange={(e) => setCargo(e.target.value)} rows={3} placeholder="60 bags potatoes" />
                </div>
                <div className="space-y-1.5">
                  <Label>Budget (USD)</Label>
                  <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="180" />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact number</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+263 77 …" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="secondary" disabled={mut.isPending}>
                  {mut.isPending ? "Posting…" : "Post request"}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
