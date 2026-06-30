/**
 * Cinematic 3D Animated Background — vivid version.
 *
 * Multi-layer composition:
 *   1. CinematicFarmPlate — animated real farm image with parallax/slow push
 *   2. AuroraGlow         — restrained color wash for depth
 *   3. LightRays          — animated god-rays from top
 *   4. CinematicParticles — canvas particles with depth-of-field
 *   5. MouseParallax      — entire scene shifts subtly with mouse
 *
 * Respects `prefers-reduced-motion`. GPU-only effects.
 */

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/* ────────────────────────────────────────────────────────────────────────── */
/*  1. Real farm scene plate                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

function CinematicFarmPlate() {
  return (
    <>
      <motion.div
        aria-hidden
        className="absolute -inset-[3%] bg-cover bg-center"
        style={{
          backgroundImage: "url('/landing-farm-cinematic.png')",
          filter: "saturate(1.08) contrast(1.05)",
          transformOrigin: "55% 42%",
        }}
        animate={{
          scale: [1.03, 1.08, 1.04],
          x: ["-0.8%", "0.8%", "-0.4%"],
          y: ["0%", "-1.2%", "0%"],
        }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,16,11,0.82)_0%,rgba(6,16,11,0.48)_34%,rgba(6,16,11,0.20)_68%,rgba(6,16,11,0.05)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_70%_18%,rgba(255,186,83,0.28),transparent_55%),radial-gradient(ellipse_70%_80%_at_18%_70%,rgba(13,59,46,0.55),transparent_62%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#06100B] via-[#06100B]/70 to-transparent" />
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  2. Aurora glow                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

function AuroraGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        animate={{
          x: [0, 80, -50, 0],
          y: [0, -40, 30, 0],
          rotate: [0, 14, -10, 0],
        }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-[15%] -top-[10%] h-[760px] w-[760px] rounded-full opacity-35 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, rgba(13,80,60,1), rgba(13,59,46,0.6) 35%, rgba(13,59,46,0) 75%)",
        }}
      />
      <motion.div
        animate={{
          x: [0, -60, 40, 0],
          y: [0, 50, -25, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        className="absolute -right-[10%] top-[12%] h-[640px] w-[640px] rounded-full opacity-45 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(232,160,32,0.7), rgba(201,168,76,0.4) 40%, rgba(201,168,76,0) 75%)",
        }}
      />
      <motion.div
        animate={{
          x: [0, 70, -30, 0],
          y: [0, -25, 35, 0],
          rotate: [0, -10, 12, 0],
        }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut", delay: 8 }}
        className="absolute left-[20%] top-[40%] h-[700px] w-[700px] rounded-full opacity-25 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(232,160,32,0.5), rgba(232,160,32,0) 75%)",
        }}
      />
      <motion.div
        animate={{
          x: [0, -40, 30, 0],
          y: [0, 30, -20, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute right-[8%] bottom-[5%] h-[560px] w-[560px] rounded-full opacity-20 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(52,211,153,0.45), rgba(52,211,153,0) 75%)",
        }}
      />
      {/* extra purple-deep mid for depth contrast */}
      <motion.div
        animate={{
          x: [0, 50, -30, 0],
          y: [0, -30, 20, 0],
        }}
        transition={{ duration: 38, repeat: Infinity, ease: "easeInOut", delay: 6 }}
        className="absolute left-[5%] bottom-[20%] h-[520px] w-[520px] rounded-full opacity-15 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(94,42,128,0.35), rgba(94,42,128,0) 75%)",
        }}
      />
    </div>
  );
}

function LightRays() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ mixBlendMode: "screen" }}
    >
      <motion.div
        animate={{ rotate: [0, 8, -5, 0], opacity: [0.35, 0.55, 0.4, 0.35] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-[10%] -top-[30%] h-[140%] w-[70%]"
        style={{
          background:
            "conic-gradient(from 200deg at 50% 0%, transparent 0deg, rgba(232,160,32,0.45) 8deg, transparent 18deg, rgba(232,160,32,0.30) 28deg, transparent 40deg, rgba(201,168,76,0.25) 50deg, transparent 60deg)",
          filter: "blur(22px)",
          transformOrigin: "50% 0%",
        }}
      />
      <motion.div
        animate={{ rotate: [0, -10, 6, 0], opacity: [0.30, 0.50, 0.35, 0.30] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute -right-[5%] -top-[25%] h-[130%] w-[65%]"
        style={{
          background:
            "conic-gradient(from 160deg at 50% 0%, transparent 0deg, rgba(52,211,153,0.30) 12deg, transparent 25deg, rgba(232,160,32,0.35) 35deg, transparent 50deg)",
          filter: "blur(28px)",
          transformOrigin: "50% 0%",
        }}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  4. Cinematic particles — depth-of-field aware                             */
/* ────────────────────────────────────────────────────────────────────────── */

function CinematicParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let dpr = window.devicePixelRatio || 1;
    function resize() {
      if (!canvas || !ctx) return;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset before scale
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    type P = {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      size: number;
      hue: "gold" | "green" | "ember";
      twinkle: number;
    };

    const COUNT = reduced ? 0 : 110;
    const particles: P[] = [];
    for (let i = 0; i < COUNT; i++) {
      const z = Math.random();
      const hueRoll = Math.random();
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        z,
        vx: (Math.random() - 0.5) * 0.25 * (1 - z),
        vy: -0.35 - Math.random() * 0.55 * (1 - z),
        size: 0.8 + (1 - z) * 3.4,
        hue: hueRoll > 0.65 ? "green" : hueRoll > 0.18 ? "gold" : "ember",
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    let raf = 0;
    let last = performance.now();

    function tick(now: number) {
      if (!ctx || !canvas) return;
      const dt = Math.min(40, now - last);
      last = now;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const p of particles) {
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        p.twinkle += dt * 0.0025;
        if (p.y < -30) {
          p.y = window.innerHeight + 30;
          p.x = Math.random() * window.innerWidth;
        }
        if (p.x < -30) p.x = window.innerWidth + 30;
        if (p.x > window.innerWidth + 30) p.x = -30;

        const closeness = 1 - p.z;
        const baseAlpha = 0.35 + Math.sin(p.twinkle) * 0.18;
        const alpha = baseAlpha * (0.55 + closeness * 0.5);

        const color =
          p.hue === "gold"
            ? `rgba(232,160,32,${alpha})`
            : p.hue === "green"
              ? `rgba(82,231,173,${alpha * 0.85})`
              : `rgba(255,120,40,${alpha * 0.7})`;

        ctx.shadowBlur = 10 + p.z * 24;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(tick);
    }
    if (!reduced) raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ mixBlendMode: "screen" }}
    />
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Public                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

export function CinematicBackground() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(useTransform(mx, [-1, 1], [-18, 18]), { stiffness: 60, damping: 18 });
  const y = useSpring(useTransform(my, [-1, 1], [-12, 12]), { stiffness: 60, damping: 18 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  return (
    <div
      data-testid="cinematic-background"
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0, backgroundColor: "#06100B" }}
    >
      <CinematicFarmPlate />

      <motion.div style={{ x, y }} className="absolute inset-0">
        <AuroraGlow />
        <LightRays />
        <CinematicParticles />
      </motion.div>

      {/* Top vignette so the nav stays readable */}
      <div
        className="absolute inset-x-0 top-0 h-24"
        style={{
          background:
            "linear-gradient(to bottom, rgba(6,16,11,0.85) 0%, transparent 100%)",
        }}
      />
      {/* Bottom vignette */}
      <div
        className="absolute inset-x-0 bottom-0 h-32"
        style={{
          background:
            "linear-gradient(to top, rgba(6,16,11,0.7) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
