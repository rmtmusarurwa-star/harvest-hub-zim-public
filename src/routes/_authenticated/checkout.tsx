import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Phone,
  ShieldCheck,
  Truck,
  Upload,
  Building2,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { generateOrderCode } from "@/lib/order-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/integrations/supabase/types";

type PaymentMethod = Database["public"]["Enums"]["payment_method"];

export const Route = createFileRoute("/_authenticated/checkout")({
  component: CheckoutPage,
});

const METHODS: {
  id: PaymentMethod;
  name: string;
  desc: string;
  icon: typeof Phone;
  badge: string;
}[] = [
  { id: "ecocash", name: "EcoCash", desc: "Mobile money — Econet", icon: Phone, badge: "Instant" },
  { id: "onemoney", name: "OneMoney", desc: "Mobile money — NetOne", icon: Phone, badge: "Instant" },
  { id: "zipit", name: "ZIPIT / Bank Transfer", desc: "CBZ Bank · Manual confirmation", icon: Building2, badge: "1–2 hrs" },
  { id: "cash_on_delivery", name: "Cash on Delivery", desc: "Pay the farmer on collection", icon: Truck, badge: "On site" },
  { id: "card", name: "Visa / Mastercard", desc: "Secure card payment", icon: CreditCard, badge: "Secure" },
];

function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Method-specific state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [copied, setCopied] = useState(false);

  const reference = useMemo(() => generateOrderCode(), []);

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-2xl space-y-4 py-12 text-center">
        <h1 className="font-display text-3xl">Your cart is empty</h1>
        <p className="text-sm text-muted-foreground">
          Add a few listings before heading to checkout.
        </p>
        <Button asChild variant="secondary">
          <Link to="/marketplace">Browse marketplace</Link>
        </Button>
      </section>
    );
  }

  async function placeOrders(
    paymentMethod: PaymentMethod,
    payment_status: Database["public"]["Enums"]["payment_status"],
    payment_reference: string | null,
    proof_url: string | null,
  ) {
    if (!user) throw new Error("Not authenticated");
    const rows = items.map((it) => ({
      order_code: generateOrderCode(),
      buyer_id: user.id,
      farmer_id: it.farmer_id === "mock" ? user.id : it.farmer_id,
      listing_id: it.id.startsWith("mock-") ? null : it.id,
      listing_title: it.title,
      quantity: it.quantity,
      unit: it.unit,
      unit_price: it.price,
      total_amount: it.price * it.quantity,
      payment_method: paymentMethod,
      payment_status,
      payment_reference,
      proof_url,
    }));
    const { data, error } = await supabase
      .from("orders")
      .insert(rows)
      .select("order_code");
    if (error) throw error;
    return data.map((d) => d.order_code).join(",");
  }

  async function uploadProof(): Promise<string | null> {
    if (!proofFile || !user) return null;
    const ext = proofFile.name.split(".").pop() ?? "bin";
    const path = `${user.id}/${reference}.${ext}`;
    const { error } = await supabase.storage
      .from("payment-proofs")
      .upload(path, proofFile, { upsert: true });
    if (error) throw error;
    return path;
  }

  async function handleSubmit() {
    if (!method) return;
    setSubmitting(true);
    try {
      let codes: string;
      if (method === "ecocash" || method === "onemoney") {
        if (!phone || !otp) {
          toast.error("Enter phone and OTP code");
          setSubmitting(false);
          return;
        }
        codes = await placeOrders(method, "paid", `${method.toUpperCase()}:${phone}`, null);
      } else if (method === "zipit") {
        if (!proofFile) {
          toast.error("Upload proof of payment");
          setSubmitting(false);
          return;
        }
        const proof = await uploadProof();
        codes = await placeOrders(method, "awaiting_confirmation", reference, proof);
      } else if (method === "cash_on_delivery") {
        codes = await placeOrders(method, "pending", reference, null);
      } else {
        if (!cardName || cardNumber.replace(/\s/g, "").length < 12 || !cardExpiry || cardCvc.length < 3) {
          toast.error("Fill in all card details");
          setSubmitting(false);
          return;
        }
        codes = await placeOrders(method, "paid", `CARD:****${cardNumber.slice(-4)}`, null);
      }
      clear();
      navigate({ to: "/checkout/confirmation", search: { codes } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <Link
        to="/marketplace"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Continue shopping
      </Link>

      <div>
        <h1 className="font-display text-3xl md:text-4xl">Checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a payment method. All payments are secured end-to-end.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* LEFT: methods */}
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {METHODS.map((m) => {
              const Icon = m.icon;
              const selected = method === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`glass rounded-2xl border p-4 text-left transition-all ${
                    selected
                      ? "border-secondary/50 bg-secondary/10 ring-1 ring-secondary/30"
                      : "border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`grid h-10 w-10 place-items-center rounded-xl ${selected ? "bg-secondary/20 text-secondary" : "bg-white/5 text-foreground/80"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{m.name}</span>
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground">
                          {m.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{m.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {method && (
              <motion.div
                key={method}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="glass rounded-2xl border border-white/5 p-5"
              >
                {(method === "ecocash" || method === "onemoney") && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" /> Secured by {method === "ecocash" ? "Econet" : "NetOne"}
                    </div>
                    <div>
                      <Label htmlFor="phone">Mobile number</Label>
                      <Input
                        id="phone"
                        placeholder={method === "ecocash" ? "+263 77 123 4567" : "+263 71 234 5678"}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    {!otpSent ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!phone}
                        onClick={() => {
                          setOtpSent(true);
                          toast.success(`OTP sent to ${phone}`);
                        }}
                      >
                        Send OTP
                      </Button>
                    ) : (
                      <div>
                        <Label htmlFor="otp">OTP code</Label>
                        <Input
                          id="otp"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="123456"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Demo mode — enter any 4–6 digits to confirm.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {method === "zipit" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs uppercase tracking-widest text-muted-foreground">
                          Bank details
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `CBZ Bank\nHarvest Hub Zimbabwe\n1234567890\nHarare Main\nRef: ${reference}`,
                            );
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-secondary hover:underline"
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copied ? "Copied" : "Copy all"}
                        </button>
                      </div>
                      <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
                        <dt className="text-muted-foreground">Bank</dt>
                        <dd>CBZ Bank</dd>
                        <dt className="text-muted-foreground">Account Name</dt>
                        <dd>Harvest Hub Zimbabwe</dd>
                        <dt className="text-muted-foreground">Account Number</dt>
                        <dd className="font-mono">1234567890</dd>
                        <dt className="text-muted-foreground">Branch</dt>
                        <dd>Harare Main</dd>
                        <dt className="text-muted-foreground">Reference</dt>
                        <dd className="font-mono text-secondary">{reference}</dd>
                      </dl>
                    </div>
                    <div>
                      <Label htmlFor="proof">Upload proof of payment (PDF or image)</Label>
                      <label
                        htmlFor="proof"
                        className="mt-1 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-sm text-muted-foreground hover:border-secondary/40 hover:text-foreground"
                      >
                        <Upload className="h-4 w-4" />
                        {proofFile ? proofFile.name : "Click to upload (PDF, PNG, JPG)"}
                      </label>
                      <input
                        id="proof"
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                  </div>
                )}

                {method === "cash_on_delivery" && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/90">
                      <Banknote className="mt-0.5 h-4 w-4" />
                      <div>
                        Your order will be reserved and marked <strong>pending cash</strong>.
                        Pay the farmer in USD on collection or delivery.
                      </div>
                    </div>
                  </div>
                )}

                {method === "card" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3 w-3" /> 256-bit encrypted · Demo only
                    </div>
                    <div>
                      <Label htmlFor="cn">Cardholder name</Label>
                      <Input id="cn" placeholder="Tendai Moyo" value={cardName} onChange={(e) => setCardName(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="cnum">Card number</Label>
                      <Input
                        id="cnum"
                        placeholder="4242 4242 4242 4242"
                        inputMode="numeric"
                        value={cardNumber}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                          setCardNumber(v.replace(/(.{4})/g, "$1 ").trim());
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="exp">Expiry</Label>
                        <Input
                          id="exp"
                          placeholder="MM/YY"
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                            if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                            setCardExpiry(v);
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvc">CVC</Label>
                        <Input
                          id="cvc"
                          placeholder="123"
                          maxLength={4}
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ""))}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT: summary */}
        <aside className="glass h-fit rounded-2xl border border-white/5 p-5">
          <h3 className="font-display text-lg">Order Summary</h3>
          <ul className="mt-4 space-y-3">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 text-sm">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary/15 text-base">
                  🌾
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate">{it.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {it.quantity} {it.unit} × ${it.price.toFixed(2)}
                  </div>
                </div>
                <div className="font-mono text-sm">
                  ${(it.price * it.quantity).toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
          <div className="my-4 h-px bg-white/5" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Platform fee</span>
            <span className="font-mono">$0.00</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Total
            </span>
            <span className="font-display text-3xl text-secondary">
              ${subtotal.toFixed(2)}
            </span>
          </div>

          <Button
            className="mt-5 w-full"
            size="lg"
            variant="secondary"
            disabled={!method || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Processing…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Confirm & Pay
              </>
            )}
          </Button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Paying as {profile?.full_name || user?.email}
          </p>
        </aside>
      </div>
    </section>
  );
}
