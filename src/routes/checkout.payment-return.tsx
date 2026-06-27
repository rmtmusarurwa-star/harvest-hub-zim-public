import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

// This page loads inside the ClicknPay popup after payment.
// It immediately tries to close the popup; the parent window's polling handles the rest.
export const Route = createFileRoute("/checkout/payment-return")({
  component: PaymentReturnPage,
});

function PaymentReturnPage() {
  useEffect(() => {
    // Give the page a brief moment to paint before closing
    const t = setTimeout(() => {
      window.close();
    }, 600);
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
