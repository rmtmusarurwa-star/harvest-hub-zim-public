import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

// This page loads inside the ClicknPay popup after payment.
// 1. It reads any status params ClicknPay passes back in the URL.
// 2. It postMessages those params to the parent checkout page.
// 3. It closes the popup window.
export const Route = createFileRoute("/checkout/payment-return")({
  component: PaymentReturnPage,
});

function PaymentReturnPage() {
  useEffect(() => {
    // Read any query params ClicknPay appended to the return URL
    const p = new URLSearchParams(window.location.search);
    const status =
      p.get("status") ??
      p.get("paymentStatus") ??
      p.get("PaymentStatus") ??
      "";
    const reference =
      p.get("reference") ??
      p.get("clientReference") ??
      p.get("clientreference") ??
      p.get("ClientReference") ??
      "";

    // Notify the parent checkout page
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: "CLICKNPAY_RETURN", status, reference },
          "*",
        );
      }
    } catch {
      // opener may be cross-origin in some browsers — harmless
    }

    // Close the popup after a brief moment so the user sees the check
    const t = setTimeout(() => window.close(), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="grid min-h-screen place-items-center bg-background text-center p-8">
      <div className="flex flex-col items-center gap-4">
        <CheckCircle2 className="h-12 w-12 text-emerald-400" />
        <p className="text-sm text-foreground">Payment processed. Closing window…</p>
        <button
          onClick={() => window.close()}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          Close manually
        </button>
      </div>
    </div>
  );
}
