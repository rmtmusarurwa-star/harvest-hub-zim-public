import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  Phone,
  Save,
  Settings,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

type PayoutForm = {
  ecocash_number: string;
  onemoney_number: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
};

type GatewayStatus = {
  configured: boolean;
  mode: "live" | "test";
  uidMasked: string;
  apiReachable: boolean;
  paymentMethods: string[];
};

const EMPTY_FORM: PayoutForm = {
  ecocash_number: "",
  onemoney_number: "",
  bank_name: "",
  bank_account_number: "",
  bank_account_name: "",
};

function SettingsPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<PayoutForm>(EMPTY_FORM);

  // ── Load payout settings ────────────────────────────────────────────────────
  const { data: payout, isLoading: payoutLoading, error: payoutError } = useQuery({
    queryKey: ["payout-settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // payout_settings is added via migration — cast until types are regenerated
      const { data } = await (supabase as any)
        .from("payout_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as PayoutForm | null;
    },
  });

  // Sync form state when DB data arrives
  useEffect(() => {
    if (payout) setForm(payout);
  }, [payout]);

  // ── Save payout settings (upsert) ─────────────────────────────────────────
  const { mutate: savePayout, isPending: saving } = useMutation({
    mutationFn: async (values: PayoutForm) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any)
        .from("payout_settings")
        .upsert({ user_id: user.id, ...values }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payout account saved");
      void qc.invalidateQueries({ queryKey: ["payout-settings", user?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  // ── Load ClicknPay gateway status ──────────────────────────────────────────
  const { data: gateway, isLoading: gatewayLoading, refetch: refetchGateway } = useQuery({
    queryKey: ["clicknpay-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("clicknpay-status");
      if (error) throw error;
      return data as GatewayStatus;
    },
    retry: 1,
    staleTime: 60_000,
  });

  const set = (k: keyof PayoutForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    savePayout(form);
  }

  const hasPayoutInfo =
    form.ecocash_number || form.onemoney_number || form.bank_account_number;

  return (
    <section className="mx-auto max-w-3xl space-y-8 py-6">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary/15">
          <Settings className="h-6 w-6 text-secondary" />
        </div>
        <div>
          <h1 className="font-display text-2xl">Account Settings</h1>
          <p className="text-sm text-muted-foreground">
            Payment gateway, payout account, and profile preferences.
          </p>
        </div>
      </motion.div>

      {/* ── Payment Gateway Status ── */}
      <div className="glass rounded-2xl border border-white/5 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Payment Gateway</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refetchGateway()}
            disabled={gatewayLoading}
          >
            {gatewayLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Refresh"
            )}
          </Button>
        </div>

        {gatewayLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking gateway…
          </div>
        ) : !gateway ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            Could not reach the gateway status function.
          </div>
        ) : (
          <>
            {/* Status row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Connected badge */}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  gateway.configured && gateway.apiReachable
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-red-500/15 text-red-300"
                }`}
              >
                {gateway.configured && gateway.apiReachable ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" />
                )}
                {gateway.configured && gateway.apiReachable
                  ? "Connected"
                  : gateway.configured
                  ? "Configured (API unreachable)"
                  : "Not configured"}
              </span>

              {/* Live / Test badge */}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  gateway.mode === "live"
                    ? "bg-secondary/15 text-secondary"
                    : "bg-amber-500/15 text-amber-300"
                }`}
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                {gateway.mode === "live" ? "Live mode" : "Test mode"}
              </span>

              {/* API reachability */}
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                {gateway.apiReachable ? (
                  <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-red-400" />
                )}
                API {gateway.apiReachable ? "reachable" : "unreachable"}
              </span>
            </div>

            {/* Merchant UID */}
            <div className="text-xs text-muted-foreground">
              Merchant UID:{" "}
              <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-foreground/80">
                {gateway.uidMasked}
              </code>
            </div>

            {/* Payment methods */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                Accepted methods
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "ecocash", label: "EcoCash", icon: Phone },
                  { id: "onemoney", label: "OneMoney", icon: Phone },
                  { id: "card", label: "Visa / Mastercard", icon: CreditCard },
                ].map(({ id, label, icon: Icon }) => (
                  <span
                    key={id}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                      gateway.paymentMethods.includes(id)
                        ? "border-secondary/30 text-secondary"
                        : "border-white/10 text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {gateway.mode === "test" && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
                You're in <strong>test mode</strong>. Real money will not be
                processed. Set <code>CLICKNPAY_PUBLIC_UID</code> to your live
                merchant ID via{" "}
                <code>supabase secrets set CLICKNPAY_PUBLIC_UID=&lt;your-id&gt;</code>.
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Payout Account ── */}
      <form
        onSubmit={handleSave}
        className="glass rounded-2xl border border-white/5 p-6 space-y-5"
      >
        <div className="space-y-1">
          <h2 className="font-display text-lg">Your Payout Account</h2>
          <p className="text-sm text-muted-foreground">
            Where Harvest Hub will send your earnings when a buyer pays for your
            listings or shop products. Fill in at least one method.
          </p>
        </div>

        {payoutLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : payoutError ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Could not load payout settings: {(payoutError as Error).message}
          </div>
        ) : (
          <>
            {/* Mobile money */}
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary/70">
                Mobile Money
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ecocash">EcoCash number</Label>
                  <Input
                    id="ecocash"
                    value={form.ecocash_number}
                    onChange={set("ecocash_number")}
                    placeholder="+263 77 123 4567"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onemoney">OneMoney number</Label>
                  <Input
                    id="onemoney"
                    value={form.onemoney_number}
                    onChange={set("onemoney_number")}
                    placeholder="+263 71 123 4567"
                  />
                </div>
              </div>
            </div>

            {/* Bank account */}
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary/70">
                Bank Account
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="bank_name">Bank</Label>
                  <Input
                    id="bank_name"
                    value={form.bank_name}
                    onChange={set("bank_name")}
                    placeholder="CBZ, ZB, FBC…"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="bank_account_name">Account name</Label>
                  <Input
                    id="bank_account_name"
                    value={form.bank_account_name}
                    onChange={set("bank_account_name")}
                    placeholder="Full name on account"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="bank_account_number">Account number</Label>
                  <Input
                    id="bank_account_number"
                    value={form.bank_account_number}
                    onChange={set("bank_account_number")}
                    placeholder="1234567890"
                  />
                </div>
              </div>
            </div>

            {!hasPayoutInfo && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
                Add at least one payout method so Harvest Hub knows where to
                send your earnings.
              </div>
            )}

            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving…" : "Save payout account"}
            </Button>
          </>
        )}
      </form>

      {/* ── Quick links ── */}
      <div className="glass rounded-2xl border border-white/5 p-6 space-y-3">
        <h2 className="font-display text-lg">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Update your name, photo, farm details, and public profile.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/profile/$userId" params={{ userId: user?.id ?? "" }}>
              View profile
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/profile/edit">Edit profile</Link>
          </Button>
          {profile?.role === "farmer" || profile?.role === "supplier" ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/shops/manage">Manage shop</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
