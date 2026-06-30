/**
 * Cinematic 3D animation primitives for the Harvest Hub landing page.
 *
 * All effects are GPU-accelerated (transform / opacity) and pure CSS + framer-motion.
 * No Three.js — keeps bundle small, ships beautifully on Cloudflare Workers.
 *
 * Components:
 *   • ScrollProgressBar — gold progress bar pinned to top, tracks page scroll
 *   • FloatingOrbs      — 3 large blurred orbs that drift in 3D parallax with scroll
 *   • CinematicHeroMockup — mouse-tracked, scroll-tilted 3D phone showing live AI chat
 *   • Tilt3DCard        — perspective hover tilt wrapper for feature cards
 *   • AnimatedCounter   — count-up animation on enter view
 *   • RevealOnScroll    — 3D rotateX + scale reveal as element enters viewport
 *   • Cinematic3DCoin   — slowly rotating gold coin / wheat sigil
 */

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  useInView,
  type MotionValue,
} from "framer-motion";
import { Sparkles, MessageSquare, Wheat, TrendingUp, Truck } from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────── */
/*  Scroll progress bar                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });
  return (
    <motion.div
      data-testid="scroll-progress-bar"
      style={{ scaleX, transformOrigin: "0% 50%" }}
      className="fixed inset-x-0 top-0 z-[60] h-[3px] bg-gradient-to-r from-secondary via-accent to-secondary shadow-[0_0_18px_rgba(201,168,76,0.6)]"
    />
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Floating ambient orbs (3D parallax)                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export function FloatingOrbs() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 2000], [0, -300]);
  const y2 = useTransform(scrollY, [0, 2000], [0, 200]);
  const y3 = useTransform(scrollY, [0, 2000], [0, -150]);

  return (
    <div
      data-testid="floating-orbs"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ perspective: "1200px" }}
    >
      <motion.div
        style={{ y: y1 }}
        animate={{
          x: [0, 40, -20, 0],
          rotateZ: [0, 8, -4, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-32 top-[8%] h-[560px] w-[560px] rounded-full opacity-60 blur-3xl"
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(13,59,46,0.85),rgba(13,59,46,0)_70%)]" />
      </motion.div>

      <motion.div
        style={{ y: y2 }}
        animate={{
          x: [0, -30, 20, 0],
          scale: [1, 1.08, 0.95, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[-10%] top-[28%] h-[460px] w-[460px] rounded-full opacity-50 blur-3xl"
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(201,168,76,0.55),rgba(201,168,76,0)_70%)]" />
      </motion.div>

      <motion.div
        style={{ y: y3 }}
        animate={{
          x: [0, 50, -10, 0],
          scale: [1, 0.92, 1.05, 1],
        }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[35%] top-[55%] h-[520px] w-[520px] rounded-full opacity-40 blur-3xl"
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(232,160,32,0.40),rgba(232,160,32,0)_70%)]" />
      </motion.div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Cinematic 3D hero mockup — mouse + scroll tilt phone w/ live AI demo      */
/* ────────────────────────────────────────────────────────────────────────── */

const HERO_MESSAGES = [
  { q: "Tomato price in Harare today?", a: "Avg $0.38/kg across 12 listings. Lowest: $0.30 in Mazowe." },
  { q: "I need a truck Mutare → Harare, 800kg", a: "Request posted. 3 drivers nearby. Expect quotes within the hour." },
  { q: "My cattle have red eyes…", a: "Sounds like Pink Eye (IBK). Isolate now, apply oxytet ointment." },
];

export function CinematicHeroMockup() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-100, 100], [12, -12]), { stiffness: 120, damping: 18 });
  const rotY = useSpring(useTransform(mx, [-100, 100], [-14, 14]), { stiffness: 120, damping: 18 });

  const wrapRef = useRef<HTMLDivElement>(null);
  const [demoIdx, setDemoIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setDemoIdx((i) => (i + 1) % HERO_MESSAGES.length), 4200);
    return () => clearInterval(id);
  }, []);

  function handleMove(e: React.MouseEvent) {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(e.clientX - r.left - r.width / 2);
    my.set(e.clientY - r.top - r.height / 2);
  }
  function handleLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <div
      ref={wrapRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="relative mx-auto h-[540px] w-full max-w-md select-none"
      style={{ perspective: "1400px" }}
      data-testid="hero-3d-mockup"
    >
      {/* Floating glow behind */}
      <motion.div
        animate={{ rotateZ: [0, 360] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(201,168,76,0.35), rgba(13,59,46,0.1), rgba(232,160,32,0.30), rgba(201,168,76,0.35))",
        }}
      />

      {/* The "phone" / dashboard slab */}
      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative h-[500px] w-[280px] rounded-[36px] border border-white/10 bg-gradient-to-br from-[#0F1F18] via-[#0a1a13] to-[#080F0C] p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(201,168,76,0.08),inset_0_1px_0_rgba(255,255,255,0.05)]"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Notch */}
          <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black/80" />

          {/* Screen */}
          <div
            className="relative h-full w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0a1c14] to-[#06120c] p-4"
            style={{ transform: "translateZ(20px)" }}
          >
            {/* Status row */}
            <div className="mb-4 flex items-center justify-between text-[10px] text-foreground/60">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-secondary" />
                <span className="text-secondary">Harvest AI</span>
              </div>
            </div>

            {/* Header */}
            <div className="mb-4 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-secondary/20">
                <Sparkles className="h-4 w-4 text-secondary" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-foreground">Harvest AI</div>
                <div className="text-[10px] text-emerald-400">● Online · Live data</div>
              </div>
            </div>

            {/* Chat bubbles - cycle */}
            <div className="space-y-3">
              {HERO_MESSAGES.map((m, i) => (
                <motion.div
                  key={i}
                  animate={{
                    opacity: demoIdx === i ? 1 : 0.12,
                    y: demoIdx === i ? 0 : 6,
                    scale: demoIdx === i ? 1 : 0.96,
                  }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                  className="space-y-2"
                >
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-secondary/15 px-2.5 py-1.5 text-[10px] leading-snug text-foreground ring-1 ring-secondary/25">
                      <MessageSquare className="mb-0.5 h-2.5 w-2.5 text-secondary" />
                      {m.q}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-secondary/20">
                      <Sparkles className="h-2.5 w-2.5 text-secondary" />
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white/[0.05] px-2.5 py-1.5 text-[10px] leading-snug text-foreground/80 ring-1 ring-white/5">
                      {m.a}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Bottom KPI strip */}
            <div className="absolute inset-x-4 bottom-4 grid grid-cols-3 gap-1.5">
              {[
                { Icon: TrendingUp, label: "Maize", val: "+4.2%" },
                { Icon: Wheat, label: "Soya", val: "+1.8%" },
                { Icon: Truck, label: "Trips", val: "12" },
              ].map(({ Icon, label, val }) => (
                <div
                  key={label}
                  className="rounded-lg border border-white/5 bg-white/[0.03] p-1.5 text-center"
                >
                  <Icon className="mx-auto mb-0.5 h-2.5 w-2.5 text-secondary" />
                  <div className="text-[8px] text-muted-foreground">{label}</div>
                  <div className="text-[9px] font-semibold text-emerald-400">{val}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Floating card 1 — Order confirmed */}
        <motion.div
          initial={{ opacity: 0, x: -40, y: -20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.9, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{ transform: "translateZ(60px)" }}
          className="absolute -left-12 top-16 hidden lg:block"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            className="glass-strong w-44 rounded-2xl p-3 shadow-2xl ring-1 ring-secondary/20"
          >
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/20">
                <span className="text-xs">✓</span>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-emerald-400">Order paid</div>
                <div className="text-[9px] text-muted-foreground">via EcoCash</div>
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-[10px] text-muted-foreground">3.2t maize</span>
              <span className="font-display text-sm text-secondary">$1,184</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Floating card 2 — Price ticker */}
        <motion.div
          initial={{ opacity: 0, x: 40, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.9, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ transform: "translateZ(80px)" }}
          className="absolute -right-10 bottom-16 hidden lg:block"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
            className="glass-strong w-48 rounded-2xl p-3 shadow-2xl ring-1 ring-secondary/20"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-foreground">Live market</span>
              <span className="text-[9px] text-emerald-400">● Bulawayo</span>
            </div>
            <div className="space-y-1.5">
              {[
                { c: "Tomato", p: "$0.38", d: "+3%" },
                { c: "Beef", p: "$4.20", d: "+1%" },
              ].map((row) => (
                <div key={row.c} className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">{row.c}</span>
                  <span className="text-foreground">{row.p}</span>
                  <span className="text-emerald-400">{row.d}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  3D tilt card                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

export function Tilt3DCard({
  children,
  className = "",
  intensity = 8,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  [key: string]: unknown;
}) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-50, 50], [intensity, -intensity]), {
    stiffness: 240,
    damping: 20,
  });
  const rotY = useSpring(useTransform(mx, [-50, 50], [-intensity, intensity]), {
    stiffness: 240,
    damping: 20,
  });
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 100);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 100);
  }
  function handleLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave} style={{ perspective: 900 }}>
      <motion.div
        style={{
          rotateX: rotX,
          rotateY: rotY,
          transformStyle: "preserve-3d",
        }}
        className={className}
        {...rest}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Animated counter                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

export function AnimatedCounter({
  to,
  duration = 1.6,
  prefix = "",
  suffix = "",
  className = "",
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className={className} data-testid="animated-counter">
      {prefix}
      {n.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Cinematic reveal — 3D rotateX entrance                                    */
/* ────────────────────────────────────────────────────────────────────────── */

export function RevealOnScroll({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: -8, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ transformPerspective: 1200, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Parallax wrapper (depth based on scroll)                                  */
/* ────────────────────────────────────────────────────────────────────────── */

export function Parallax({
  children,
  speed = 0.3,
  className = "",
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [80 * speed, -80 * speed]) as MotionValue<number>;
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}
