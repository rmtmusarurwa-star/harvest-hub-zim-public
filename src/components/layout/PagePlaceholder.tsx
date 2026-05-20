type Props = {
  title: string;
  description?: string;
};

export function PagePlaceholder({ title, description }: Props) {
  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-baseline gap-3">
        <div className="h-2 w-2 rounded-full bg-secondary" />
        <span className="text-xs uppercase tracking-[0.22em] text-secondary/80">
          Harvest Hub Zimbabwe
        </span>
      </div>

      <h1 className="font-display text-4xl leading-tight md:text-6xl">
        {title}
      </h1>
      {description && (
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          {description}
        </p>
      )}

      <div className="glass mt-10 grid min-h-[360px] place-items-center rounded-3xl p-10">
        <div className="text-center">
          <div className="mx-auto mb-4 h-px w-16 bg-secondary/40" />
          <p className="font-display text-2xl text-foreground/90">
            {title}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            This section is ready for content.
          </p>
        </div>
      </div>
    </section>
  );
}
