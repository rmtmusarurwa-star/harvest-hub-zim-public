import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";

export function CartDrawer() {
  const { isOpen, close, items, subtotal, setQty, remove, clear } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/5"
          >
            <header className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-secondary" />
                <h3 className="font-display text-lg">Your Cart</h3>
                <span className="text-xs text-muted-foreground">
                  ({items.length} {items.length === 1 ? "item" : "items"})
                </span>
              </div>
              <button
                onClick={close}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground"
                aria-label="Close cart"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/50" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      Your cart is empty.
                    </p>
                    <Button asChild className="mt-4" size="sm" variant="secondary">
                      <Link to="/marketplace" onClick={close}>
                        Browse marketplace
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((it) => (
                    <li
                      key={it.id}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid h-12 w-12 place-items-center rounded-lg bg-secondary/15 text-xl">
                          🌾
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-foreground">
                            {it.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {it.location} · ${it.price.toFixed(2)} / {it.unit}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => setQty(it.id, it.quantity - 1)}
                              className="grid h-7 w-7 place-items-center rounded-md border border-white/10 text-muted-foreground hover:bg-white/5"
                              aria-label="Decrease"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-sm">
                              {it.quantity}
                            </span>
                            <button
                              onClick={() => setQty(it.id, it.quantity + 1)}
                              className="grid h-7 w-7 place-items-center rounded-md border border-white/10 text-muted-foreground hover:bg-white/5"
                              aria-label="Increase"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => remove(it.id)}
                              className="ml-auto grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-rose-400"
                              aria-label="Remove"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm text-secondary">
                            ${(it.price * it.quantity).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <footer className="border-t border-white/5 px-5 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-display text-2xl text-secondary">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Delivery and fees calculated at checkout.
                </p>
                <Button className="mt-4 w-full" size="lg" variant="secondary">
                  Proceed to Checkout
                </Button>
                <button
                  onClick={clear}
                  className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear cart
                </button>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
