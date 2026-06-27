import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ListingRow } from "@/lib/marketplace-data";

// ── Unit-aware quantity helpers ───────────────────────────────────────────────
// Weight/volume units that support fractional quantities (step = 0.5, min = 0.5)
const DECIMAL_UNITS = new Set([
  "kg", "kgs", "kilogram", "kilograms",
  "g", "gram", "grams",
  "tonne", "tonnes", "ton", "tons",
  "lb", "lbs", "pound", "pounds",
  "l", "litre", "litres", "liter", "liters",
  "ml", "millilitre", "milliliter",
]);

export function unitStep(unit: string): { step: number; min: number; isDecimal: boolean } {
  const u = (unit ?? "").toLowerCase().trim();
  const isDecimal = DECIMAL_UNITS.has(u);
  return isDecimal
    ? { step: 0.5, min: 0.5, isDecimal: true }
    : { step: 1,   min: 1,   isDecimal: false };
}

/** Format a quantity cleanly: integers stay whole, decimals show 1dp */
export function fmtQty(qty: number): string {
  return qty % 1 === 0 ? String(qty) : qty.toFixed(1);
}

export type CartItem = {
  id: string;
  /** Explicit listings.id to store on order. Null for shop products (avoids FK violation). */
  listing_id?: string | null;
  title: string;
  price: number;
  unit: string;
  quantity: number;
  location: string;
  image_url: string | null;
  farmer_id: string;
};


type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  add: (listing: ListingRow, qty?: number) => void;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "hhz.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const count = items.reduce((s, i) => s + i.quantity, 0);
    return {
      items,
      count,
      subtotal,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((v) => !v),
      add: (l, qty = 1) => {
        setItems((prev) => {
          const ex = prev.find((p) => p.id === l.id);
          if (ex) {
            return prev.map((p) =>
              p.id === l.id ? { ...p, quantity: Math.round((p.quantity + qty) * 100) / 100 } : p,
            );
          }
          return [
            ...prev,
            {
              id: l.id,
              title: l.title,
              price: Number(l.price),
              unit: l.unit,
              quantity: qty,
              location: l.location,
              image_url: l.image_url,
              farmer_id: l.farmer_id,
            },
          ];

        });
        setIsOpen(true);
      },
      addItem: (item, qty = 1) => {
        setItems((prev) => {
          const ex = prev.find((p) => p.id === item.id);
          if (ex) {
            return prev.map((p) =>
              p.id === item.id ? { ...p, quantity: Math.round((p.quantity + qty) * 100) / 100 } : p,
            );
          }
          return [...prev, { ...item, quantity: qty }];
        });
        setIsOpen(true);
      },
      remove: (id) => setItems((prev) => prev.filter((p) => p.id !== id)),
      // Allow fractional quantities (e.g., 0.5 kg); min 0.01 — UI controls enforce the per-unit minimum
      setQty: (id, qty) =>
        setItems((prev) =>
          prev.map((p) => (p.id === id ? { ...p, quantity: Math.max(0.01, Math.round(qty * 100) / 100) } : p)),
        ),
      clear: () => setItems([]),
    };
  }, [items, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
