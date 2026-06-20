type Props = {
  size?: number;
  className?: string;
};

/**
 * Replaces the old harvest-hub-logo-transparent.png — a low-res icon with a
 * mismatched gray gradient baked into the PNG (visible as a box on any dark
 * background) and a generic sans-serif wordmark that didn't match the rest
 * of the brand. This is a plain SVG + the actual brand typeface (DM Serif
 * Display), fully transparent, crisp at any size.
 */
export function Wordmark({ size = 40, className = "" }: Props) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <circle cx="20" cy="20" r="18.5" stroke="#C9A84C" strokeWidth="1" opacity="0.35" />
        <path
          d="M20 7c5.5 3.2 9 9.4 9 14.5a9 9 0 0 1-18 0C11 16.4 14.5 10.2 20 7Z"
          fill="#C9A84C"
        />
        <path d="M20 13.5v17" stroke="#0D1F18" strokeWidth="1.4" strokeLinecap="round" />
        <path
          d="M20 17.5c-2.4-1.6-5-1.4-6.4 0 1.4 1.6 4 1.8 6.4 0Zm0 0c2.4-1.6 5-1.4 6.4 0-1.4 1.6-4 1.8-6.4 0Z"
          stroke="#0D1F18"
          strokeWidth="1.1"
          fill="none"
        />
      </svg>
      <span className="font-display leading-none text-foreground" style={{ fontSize: size * 0.52 }}>
        Harvest <em className="not-italic text-secondary">Hub</em>
      </span>
    </div>
  );
}
