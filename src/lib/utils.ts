import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a unique id, preferring crypto.randomUUID() but falling back to a
 * timestamp + random string when it's unavailable. Some browsers (notably
 * Safari, depending on exact secure-context resolution) only expose
 * crypto.randomUUID on specific origins, so relying on it directly can throw
 * "crypto.randomUUID is not a function" in otherwise-normal usage.
 */
export function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
