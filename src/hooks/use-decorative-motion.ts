import { useEffect } from "react";

/**
 * Disables decorative animations on slow connections or save-data mode
 * by toggling a `no-deco-motion` class on <html>. `prefers-reduced-motion`
 * is already handled via CSS media query.
 */
export function useDecorativeMotionGuard() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const conn = (navigator as unknown as { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
    if (!conn) return;
    const slow =
      conn.saveData === true ||
      conn.effectiveType === "slow-2g" ||
      conn.effectiveType === "2g" ||
      conn.effectiveType === "3g";
    if (slow) {
      document.documentElement.classList.add("no-deco-motion");
    } else {
      document.documentElement.classList.remove("no-deco-motion");
    }
  }, []);
}
