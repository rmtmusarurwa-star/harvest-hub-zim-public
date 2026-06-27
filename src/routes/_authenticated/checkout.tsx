import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  Lock,
  Phone,
  ShieldCheck,
  Truck,
  Upload,
  XCircle,
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
type CnpState = "idle" | "waiting" | "popup_closed" | "failed" | "timeout";

export const Route = createFileRoute("/_authenticated/checkout")({
  component: CheckoutPage,
});

// Methods that route through the ClicknPay gateway (popup + poll)
const CNP_METHODS: PaymentMethod[] = ["ecocash", "onemoney", "card"];

const METHODS: {
  id: PaymentMethod;
  name: string;
  desc: string;
  icon: typeof Phone;
  badge: string;
}[] = [
  { id: "ecocash", name: "EcoCash", desc: "EcoCash mobile money · Econet", icon: Phone, badge: "Instant" },
  { id: "onemoney", name: "OneMoney", desc: "OneMoney mobile money · NetOne", icon: Phone, badge: "Instant" },
  { id: "zipit", name: "ZIPIT / Bank Transfer", desc: "CBZ Bank · Manual confirmation", icon: Building2, badge: "1–2 hrs" },
  { id: "cash_on_delivery", name: "Cash on Delivery", desc: "Pay the farmer on collection", icon: Truck, badge: "On site" },
  { id: "card", name: "Visa / Mastercard", desc: "Secure card payment via ClicknPay", icon: CreditCard, badge: "Secure" },
];

function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cnpState, setCnpState] = useState<CnpState>("idle");

  // Shared fields
  const [phone, setPhone] = useState("");

  // ZIPIT fields
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);

  // ClicknPay popup + polling refs
  const popupRef    = useRef<Window | null>(null);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const closedRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);

  const reference = useMemo(() => generateOrderCode(), []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current)    clearInterval(pollRef.current);
      if (closedRef.current)  clearInterval(closedRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

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

  // Creates orders locally — used for ZIPIT and Cash on Delivery only
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
      farmer_id: !it.farmer_id || it.farmer_id === "mock" ? user.id : it.farmer_id,
      listing_id: it.listing_id !== undefined ? it.listing_id : (it.id.startsWith("mock-") ? null : it.id),
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
    const { data, error } = await supabase.from("orders").insert(rows).select("order_code");
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

  // ── ClicknPay flow ──────────────────────────────────────────────────────────
  function stopAll() {
    if (pollRef.current)    { clearInterval(pollRef.current);  pollRef.current = null; }
    if (closedRef.current)  { clearInterval(closedRef.current); closedRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }

  function startPolling(primaryCode: string, codes: string) {
    // Hard timeout — 10 minutes
    timeoutRef.current = setTimeout(() => {
      stopAll();
      popupRef.current?.close();
      setCnpState("timeout");
      toast.error("Payment timed out. If you completed it, check your orders page.");
    }, 10 * 60 * 1000);

    // Watch for popup closure while still waiting
    closedRef.current = setInterval(() => {
      if (popupRef.current?.closed) {
        if (closedRef.current) { clearInterval(closedRef.current); closedRef.current = null; }
        setCnpState("popup_closed");
      }
    }, 800);

    // Poll verify every 3 seconds
    pollRef.current = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("clicknpay-verify", {
          body: { primaryCode },
        });

        if (error) {
          // Transient network / function error — keep polling, don't surface to user
          console.warn("[poll] verify error (will retry):", error.message);
          return;
        }

        const status: string = data?.paymentStatus ?? "pending";

        if (status === "paid") {
          stopAll();
          popupRef.current?.close();
          clear();
          void navigate({ to: "/checkout/confirmation", search: { codes } });
        } else if (status === "failed") {
          stopAll();
          popupRef.current?.close();
          setCnpState("failed");
          setSubmitting(false);
        }
        // 'pending' → keep polling
      } catch (e) {
        console.warn("[poll] unexpected error (will retry):", e);
      }
    }, 3000);
  }

  async function handleCnpPayment() {
    if (!user) return;

    if ((method === "ecocash" || method === "onemoney") && !phone.trim()) {
      toast.error("Enter your mobile number to receive the payment prompt");
      return;
    }

    // ── Open popup SYNCHRONOUSLY (before any await) ─────────────────────────
    // Browsers block window.open() called after an async delay — it must happen
    // inside the synchronous part of the user-gesture handler.
    const pw = 820, ph = 700;
    const left = Math.round((screen.width - pw) / 2);
    const top = Math.round((screen.height - ph) / 2);
    const popup = window.open(
      "about:blank",
      "harvest_pay",
      `width=${pw},height=${ph},left=${left},top=${top},scrollbars=yes,status=yes`,
    );

    if (!popup) {
      toast.error("Popup blocked — allow popups for this site and try again");
      return;
    }
    popupRef.current = popup;

    // Show a loading message inside the blank popup while the edge function runs
    try {
      popup.document.write(
        `<html><body style="background:#0a0f0d;color:#86efac;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
          <p style="font-size:1rem">Preparing payment…</p>
        </body></html>`,
      );
    } catch { /* cross-origin write might be blocked in some browsers — harmless */ }

    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke("clicknpay-checkout", {
      body: {
        buyerId: user.id,
        buyerEmail: user.email ?? "",
        paymentMethod: method,
        items: items.map((it) => ({
          id: it.listing_id !== undefined ? it.listing_id : (it.id.startsWith("mock-") ? null : it.id),
          farmer_id: it.farmer_id,
          title: it.title,
          quantity: it.quantity,
          unit: it.unit,
          price: it.price,
        })),
        customerPhone: phone.trim() || undefined,
      },
    });

    if (error || !data?.paymeURL) {
      popup.close();
      popupRef.current = null;
      const reason = data?.error ?? error?.message ?? "Could not start payment";
      toast.error(`Payment error: ${reason}`);
      setSubmitting(false);
      return;
    }

    // Navigate the already-open popup to the real payment URL
    popup.location.href = data.paymeURL as string;

    setCnpState("waiting");
    setSubmitting(false);
    startPolling(data.primaryCode as string, data.codes as string);
  }

  // ── Main submit handler ─────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!method) return;

    if (CNP_METHODS.includes(method)) {
      await handleCnpPayment();
      return;
    }

    setSubmitting(true);
    try {
      let codes: string;
      if (method === "zipit") {
        if (!proofFile) {
          toast.error("Upload proof of payment");
          setSubmitting(false);
          return;
        }
        const proof = await uploadProof();
        codes = await placeOrders(method, "awaiting_confirmation", reference, proof);
      } else {
        // cash_on_delivery
        codes = await placeOrders(method, "pending", reference, null);
      }
      clear();
      void navigate({ to: "/checkout/confirmation", search: { codes } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Order failed");
    } finally {
      setSubmitting(false);
    }
  }

  const isCnpMethod = method ? CNP_METHODS.includes(method) : false;

  const buttonLabel = (() => {
    if (submitting) return null;
    if (method === "ecocash" || method === "onemoney") return "Send Payment Request";
    if (method === "card") return "Open Secure Payment";
    return "Confirm & Pay";
  })();

  return (
    <section className="relative mx-auto max-w-5xl space-y-6">
      {/* ── ClicknPay waiting / status overlay ───────────────────────────── */}
      <AnimatePresence>
        {(cnpState === "waiting" || cnpState === "popup_closed") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center rounded-3xl bg-background/80 backdrop-blur-sm"
          >
            <div className="glass-strong flex flex-col items-center gap-5 rounded-2xl border border-secondary/20 p-10 text-center shadow-2xl max-w-sm mx-4">
              {cnpState === "waiting" ? (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-secondary/20" />
                    <Loader2 className="relative h-12 w-12 animate-spin text-secondary" />
                  </div>
                  <div>
                    <p className="font-display text-xl">Waiting for payment</p>
                    <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                      {method === "ecocash" || method === "onemoney"
                        ? "Check your phone and approve the payment prompt. This page updates automatically."
                        : "Complete the payment in the popup window. Stay on this page."}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-secondary/60" />
                  <div>
                    <p className="font-display text-xl">Payment window closed</p>
                    <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                      Still checking if your payment went through. If you approved on your phone, keep this page open.
                    </p>
                  </div>
                </>
              )}
              <button
                onClick={() => {
                  stopAll();
                  popupRef.current?.close();
                  setCnpState("idle");
                  toast.info("Payment cancelled");
                }}
                className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
              >
                Cancel payment
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Link
        to="/marketplace"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Continue shopping
      </Link>

      <div>
        <h1 className="font-display text-3xl md:text-4xl">Checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All payments processed securely via ClicknPay.
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
                  onClick={() => {
                    setMethod(m.id);
                    setCnpState("idle");
                  }}
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

          {/* Method detail form */}
          <AnimatePresence mode="wait">
            {method && (
              <motion.div
                key={method + cnpState}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="glass rounded-2xl border border-white/5 p-5"
              >
                {/* ── EcoCash / OneMoney via ClicknPay ─────────────────── */}
                {(method === "ecocash" || method === "onemoney") && cnpState !== "failed" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      Processed securely via ClicknPay · {method === "ecocash" ? "Econet" : "NetOne"}
                    </div>
                    <div>
                      <Label htmlFor="phone">Mobile number</Label>
                      <Input
                        id="phone"
                        placeholder={method === "ecocash" ? "+263 77 123 4567" : "+263 71 234 5678"}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        You'll receive a payment prompt on this number to approve.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Visa / Mastercard via ClicknPay ──────────────────── */}
                {method === "card" && cnpState !== "failed" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3 w-3" />
                      256-bit encrypted · Powered by ClicknPay
                    </div>
                    <p className="text-sm text-muted-foreground">
                      A secure payment window opens where you enter your card details. Your card info never touches our servers.
                    </p>
                    <div className="flex gap-2">
                      <span className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium tracking-wide">VISA</span>
                      <span className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium tracking-wide">Mastercard</span>
                    </div>
                  </div>
                )}

                {/* ── ZIPIT ─────────────────────────────────────────────── */}
                {method === "zipit" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs uppercase tracking-widest text-muted-foreground">Bank details</span>
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
                        <dt className="text-muted-foreground">Bank</dt><dd>CBZ Bank</dd>
                        <dt className="text-muted-foreground">Account Name</dt><dd>Harvest Hub Zimbabwe</dd>
                        <dt className="text-muted-foreground">Account Number</dt><dd className="font-mono">1234567890</dd>
                        <dt className="text-muted-foreground">Branch</dt><dd>Harare Main</dd>
                        <dt className="text-muted-foreground">Reference</dt><dd className="font-mono text-secondary">{reference}</dd>
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

                {/* ── Cash on Delivery ──────────────────────────────────── */}
                {method === "cash_on_delivery" && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/90">
                    <Banknote className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      Your order will be reserved and marked <strong>pending cash</strong>.
                      Pay the farmer in USD on collection or delivery.
                    </div>
                  </div>
                )}

                {/* ── Payment failed ────────────────────────────────────── */}
                {cnpState === "failed" && (
                  <div className="flex flex-col items-center gap-4 py-2 text-center">
                    <XCircle className="h-10 w-10 text-rose-400" />
                    <div>
                      <p className="text-sm font-medium">Payment declined</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        ClicknPay reported a failed payment. Try again or choose a different method.
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setCnpState("idle")}>
                      Try again
                    </Button>
                  </div>
                )}

                {/* ── Payment timed out ─────────────────────────────────── */}
                {cnpState === "timeout" && (
                  <div className="flex flex-col items-center gap-4 py-2 text-center">
                    <XCircle className="h-10 w-10 text-amber-400" />
                    <div>
                      <p className="text-sm font-medium">Payment window timed out</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        If you approved the payment, it may still process. Check your{" "}
                        <Link to="/orders" className="text-secondary underline">orders page</Link>{" "}
                        in a minute.
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setCnpState("idle")}>
                      Try again
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT: order summary */}
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
                <div className="font-mono text-sm">${(it.price * it.quantity).toFixed(2)}</div>
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
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Total</span>
            <span className="font-display text-3xl text-secondary">${subtotal.toFixed(2)}</span>
          </div>

          <Button
            className="mt-5 w-full"
            size="lg"
            variant="secondary"
            disabled={!method || submitting || cnpState === "waiting" || cnpState === "popup_closed"}
            onClick={handleSubmit}
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
            ) : (cnpState === "waiting" || cnpState === "popup_closed") ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Checking payment…</>
            ) : (
              <><CheckCircle2 className="h-4 w-4" /> {buttonLabel ?? "Confirm & Pay"}</>
            )}
          </Button>

          {isCnpMethod && cnpState === "idle" && (
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Secured by ClicknPay · USD payments only
            </p>
          )}
          {(!isCnpMethod || !method) && (
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Paying as {profile?.full_name || user?.email}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
