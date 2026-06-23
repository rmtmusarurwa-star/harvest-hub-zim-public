type Props = {
  size?: number;
  className?: string;
};

export function Wordmark({ size = 40, className = "" }: Props) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/harvest-hub-logo.png"
        alt=""
        aria-hidden="true"
        style={{ height: size, width: "auto" }}
        className="rounded-md"
      />
      <span
        className="font-display leading-none text-foreground"
        style={{ fontSize: size * 0.52 }}
      >
        Harvest <em className="not-italic text-secondary">Hub</em>
      </span>
    </div>
  );
}
