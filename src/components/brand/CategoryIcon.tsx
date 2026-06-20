import type { ListingRow } from "@/lib/marketplace-data";

/**
 * Original line-icon set for each listing category — replaces the emoji
 * fallback (🍅🐄🐓🥛🌾📦) in ListingCard with something that renders
 * consistently across platforms and actually matches the brand's restraint.
 * Emoji are fine in chat bubbles; they read cheap as the hero art on a card.
 */

type Props = { category: ListingRow["category"]; className?: string };

export function CategoryIcon({ category, className = "h-10 w-10" }: Props) {
  const common = {
    className,
    viewBox: "0 0 40 40",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (category) {
    case "produce":
      return (
        <svg {...common}>
          <path d="M20 9c7 2 11 9 11 16s-5 11-11 11S9 32 9 25 13 11 20 9Z" />
          <path d="M20 9c-1.5-3-4-4.5-7-4" />
        </svg>
      );
    case "livestock":
      return (
        <svg {...common}>
          <path d="M11 17c-2-2-3-5-1-7 2 1 3 3 4 5M29 17c2-2 3-5 1-7-2 1-3 3-4 5" />
          <path d="M12 17c0-4 3.5-7 8-7s8 3 8 7c0 6-3 9-3 12a5 5 0 0 1-10 0c0-3-3-6-3-12Z" />
          <circle cx="16.5" cy="18" r=".9" fill="currentColor" />
          <circle cx="23.5" cy="18" r=".9" fill="currentColor" />
        </svg>
      );
    case "poultry":
      return (
        <svg {...common}>
          <path d="M22 10c4 0 7 3 7 7 0 5-4 8-4 12a4 4 0 0 1-8 0V19" />
          <path d="M17 13a9 9 0 0 0-9 9c0 3 1 5 2 6" />
          <path d="M22 10c1-2 3-3 5-3-.5 2-1.5 3.5-3 4.5" />
          <circle cx="25" cy="14" r=".9" fill="currentColor" />
        </svg>
      );
    case "dairy":
      return (
        <svg {...common}>
          <path d="M16 6h8l1 5-2 2v18a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V13l-2-2 1-5Z" />
          <path d="M14 22h12" />
        </svg>
      );
    case "grain":
      return (
        <svg {...common}>
          <path d="M20 8v26" />
          <path
            d="M20 12c-3-2-6-2-8 0 2 2 5 2 8 0Zm0 0c3-2 6-2 8 0-2 2-5 2-8 0ZM20 18c-3-2-6-2-8 0 2 2 5 2 8 0Zm0 0c3-2 6-2 8 0-2 2-5 2-8 0ZM20 24c-3-2-6-2-8 0 2 2 5 2 8 0Zm0 0c3-2 6-2 8 0-2 2-5 2-8 0Z"
            strokeWidth="1.3"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M7 14l13-6 13 6-13 6-13-6Z" />
          <path d="M7 14v12l13 6 13-6V14M20 20v12" />
        </svg>
      );
  }
}
