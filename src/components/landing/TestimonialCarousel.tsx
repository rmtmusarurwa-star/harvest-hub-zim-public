/**
 * Auto-rotating Testimonials Carousel
 *
 * Single large card that crossfades + slides between testimonials every ~6s.
 * Pauses on hover. Supports manual prev/next + dot navigation. Uses
 * framer-motion's AnimatePresence for smooth 3D-ish transitions.
 */

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";

export type Testimonial = {
  name: string;
  role: string;
  quote: string;
  initials: string;
};

type Props = {
  testimonials: Testimonial[];
  intervalMs?: number;
};

export function TestimonialCarousel({ testimonials, intervalMs = 6000 }: Props) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const len = testimonials.length;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setTimeout(() => {
      setDir(1);
      setIdx((i) => (i + 1) % len);
    }, intervalMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [idx, paused, intervalMs, len]);

  function go(delta: number) {
    setDir(delta > 0 ? 1 : -1);
    setIdx((i) => (i + delta + len) % len);
  }

  function jump(i: number) {
    setDir(i > idx ? 1 : -1);
    setIdx(i);
  }

  const t = testimonials[idx];

  return (
    <div
      data-testid="testimonial-carousel"
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ perspective: 1400 }}
    >
      <div className="glass relative overflow-hidden rounded-3xl p-8 sm:p-12">
        {/* Big watermark quote */}
        <Quote
          className="absolute -left-3 -top-3 h-24 w-24 text-secondary/10"
          strokeWidth={1.2}
        />

        <div className="relative min-h-[260px] sm:min-h-[220px]">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={idx}
              custom={dir}
              initial={{ opacity: 0, x: dir * 60, rotateY: dir * 8 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              exit={{ opacity: 0, x: dir * -60, rotateY: dir * -8 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformStyle: "preserve-3d" }}
              className="absolute inset-0 flex flex-col justify-center gap-6"
            >
              <p className="font-display text-xl leading-snug text-foreground/90 sm:text-2xl md:text-[1.7rem]">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="flex items-center gap-3 border-t border-white/5 pt-5">
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary/20 text-sm font-bold text-secondary"
                >
                  {t.initials}
                </motion.div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-5">
          <div className="flex items-center gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => jump(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                data-testid={`testimonial-dot-${i}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-8 bg-secondary" : "w-1.5 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
              {idx + 1} / {len}
            </span>
            <button
              onClick={() => go(-1)}
              aria-label="Previous testimonial"
              data-testid="testimonial-prev"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-foreground/80 transition hover:bg-white/[0.08]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next testimonial"
              data-testid="testimonial-next"
              className="grid h-9 w-9 place-items-center rounded-full border border-secondary/30 bg-secondary/10 text-secondary transition hover:bg-secondary/20"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress bar reflecting auto-rotate */}
        <motion.div
          key={`bar-${idx}-${paused ? "p" : "r"}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: paused ? 0 : 1 }}
          transition={{ duration: paused ? 0 : intervalMs / 1000, ease: "linear" }}
          style={{ transformOrigin: "0% 50%" }}
          className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-secondary via-accent to-secondary"
        />
      </div>
    </div>
  );
}
