import { motion } from "framer-motion";
import type { ReactNode } from "react";
import logoUrl from "@/assets/harvest-hub-logo-transparent.png";

type Props = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ eyebrow, title, subtitle, children, footer }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden ambient-glow mesh-bg mesh-bg-strong">
      {/* Background grain + radial */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background:radial-gradient(80%_60%_at_50%_-20%,rgba(13,59,46,0.5),transparent_60%)]" />
      <div className="pointer-events-none absolute -z-10 right-[-10%] top-1/4 h-[420px] w-[420px] rounded-full bg-secondary/10 blur-[120px]" />
      <div className="pointer-events-none absolute -z-10 left-[-10%] bottom-0 h-[420px] w-[420px] rounded-full bg-accent/10 blur-[120px]" />

      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 px-5 py-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8 lg:py-16">
        {/* Brand panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:flex flex-col justify-between"
        >
          <div className="flex flex-col gap-2">
            <img src={logoUrl} alt="Harvest Hub" className="h-14 w-auto" />
            <div className="text-[11px] uppercase tracking-[0.28em] text-secondary/80">
              Connect · Trade · Grow
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-secondary/80">
              Premium Agricultural Commerce
            </p>
            <h2 className="mt-3 font-display text-5xl leading-[1.05] text-foreground">
              From the soil of Zimbabwe to a connected market.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
              Built for farmers, buyers, suppliers and transporters. Trade
              produce, source equipment, identify disease, and access financial
              tools — all in one premium platform.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              Trusted by growers across all 10 provinces
            </span>
          </div>
        </motion.div>

        {/* Form panel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          className="flex items-center"
        >
          <div className="glass-strong w-full rounded-3xl p-7 lg:p-9">
            <div className="mb-6 flex flex-col items-center gap-2 lg:hidden">
              <img src={logoUrl} alt="Harvest Hub" className="h-12 w-auto" />
              <div className="text-[10px] uppercase tracking-[0.28em] text-secondary/80">
                Connect · Trade · Grow
              </div>
            </div>
            <div className="mb-7">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-secondary/80">
                <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                {eyebrow}
              </div>
              <h1 className="mt-3 font-display text-3xl leading-tight md:text-4xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            </div>

            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
              }}
            >
              {children}
            </motion.div>

            {footer && (
              <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export const fieldVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};
