# Harvest Hub Zimbabwe — PRD

## Original problem statement
Build a landing page for Harvest Hub Zimbabwe, then layer in cinematic 3D
animated background, a Zimbabwe province-activity heatmap, and an
auto-rotating testimonials carousel. Keep the cinematic background scoped to
the public landing experience so authenticated operational screens stay calm
and performant.

User supplied marketing collateral (`HH guide.pdf`) and confirmed an
existing TanStack Start + Supabase codebase.

## Architecture
- **Frontend**: TanStack Start (React 19) on Cloudflare Workers via nitro/wrangler
- **Backend / DB**: Supabase (auth, postgres, RLS)
- **Styling**: Tailwind v4 + custom Harvest Hub dark theme (deep green / gold / parchment)
- **Animations**: framer-motion 12.x + pure CSS 3D + 2D canvas (no Three.js)
- **Dev port**: local dev runs from the Vite server configured in `vite.config.ts`

## What's been implemented (Jan 2026)
### Landing cinematic 3D background (mounted in `_authenticated/index.tsx`)
- ✅ `CinematicBackground` renders behind the public landing page
- ✅ 5 saturated aurora gradient blobs drifting in 3D parallax
- ✅ Synthwave-style perspective grid receding to a glowing horizon
- ✅ Conic god-rays from top corners (screen blend)
- ✅ 110 canvas particles with depth-of-field blur, gold/green/ember tints
- ✅ Whole-scene mouse parallax (subtle horizontal/vertical shift)
- ✅ Top + bottom vignettes keep nav/footer legible
- ✅ Respects `prefers-reduced-motion`
- ✅ Authenticated app pages keep their existing calmer dashboard background

### Landing page (`_authenticated/index.tsx`)
- ✅ Cinematic 3D hero mockup — mouse-tracked phone w/ cycling AI demo
- ✅ Floating "Order paid" + "Live market" satellite cards orbit phone in 3D
- ✅ Letter-by-letter `rotateX` reveal of headline
- ✅ Top scroll progress bar (gold gradient w/ glow)
- ✅ `Tilt3DCard` perspective hover on feature/stats/testimonial cards
- ✅ `AnimatedCounter` count-up stats
- ✅ `RevealOnScroll` rotateX/scale entrances on key sections
- ✅ Rotating conic-gradient glow behind final CTA
- ✅ **`TestimonialCarousel`** — auto-rotating (6s), pause-on-hover, dots +
     prev/next, AnimatePresence cross-slide w/ 3D rotateY tilt, progress bar
     reflecting auto-rotate timing
- ✅ **`ZimbabweHeatmap`** — SVG of 8 provinces + Harare/Bulawayo city pulses,
     colored by live Supabase listing counts (gold→green heat scale), tooltip
     on hover, side panel with national total + top province + activity legend

### Authentication pages (`login.tsx`, `signup.tsx`, `forgot/reset` via `AuthShell`)
- ✅ Existing animated entrance + glass form panel still works
- ✅ Existing lightweight auth backgrounds remain in place

### App layout / authenticated routes (`AppLayout`)
- ✅ Existing `FieldMapBackground` remains behind sidebar + topbar + main content
- ✅ Loading + redirect spinners keep the original lightweight app background

### Guest layout (marketplace / market-intelligence for non-logged-in users)
- ✅ Marketplace / market-intelligence keep the existing public app background

## Key new files
- `/app/src/components/landing/CinematicBackground.tsx` — global animated bg
- `/app/src/components/landing/Cinematic3D.tsx` — `ScrollProgressBar`,
  `CinematicHeroMockup`, `Tilt3DCard`, `AnimatedCounter`, `RevealOnScroll`, `Parallax`
- `/app/src/components/landing/ZimbabweHeatmap.tsx`
- `/app/src/components/landing/TestimonialCarousel.tsx`

## Config touches
- `_authenticated/index.tsx` — mounts `<CinematicBackground />` for the landing page
- `AppLayout.tsx`, `AuthShell.tsx`, `_authenticated.tsx`, `login.tsx` — keep their
  existing app/auth background treatments

## Backlog
- P1: Province heatmap could use slightly more accurate province silhouettes
     (current paths are stylized polygons; recognizable but not survey-grade)
- P1: Performance test on low-end mobile — canvas at 110 particles might want
     to step down to ~50 on `prefers-reduced-data` or small viewports
- P2: Newsletter signup form (Supabase or Resend)
- P2: Add live Supabase realtime subscription so heatmap counters tick in real-time
- P3: Optional 3D rotating Zimbabwe-shaped wheat sigil in hero
