# Harvest Hub Zimbabwe — PRD

## Original problem statement
Build a landing page for Harvest Hub Zimbabwe with cinematic 3D animations.

User supplied marketing collateral (`HH guide.pdf`) and confirmed they wanted
cinematic 3D animations added on top of the existing Harvest Hub codebase
(TanStack Start + Supabase + Cloudflare Workers).

## Architecture
- **Frontend**: TanStack Start (React 19) on Cloudflare Workers via nitro/wrangler
- **Backend / DB**: Supabase (auth, postgres, RLS) — no FastAPI/Mongo
- **Styling**: Tailwind v4 + custom Harvest Hub dark theme (deep green / gold / parchment)
- **Animations**: framer-motion 12.x (already installed), pure CSS 3D, GPU-accelerated
- **Dev port**: vite dev on `:3000` (manually launched; supervisor config doesn't match this layout)

## What's been implemented (Jan 2026)
### Landing page at `/` (route: `_authenticated/index.tsx`)
- ✅ Cinematic 3D hero mockup — mouse-tracked phone with auto-cycling AI demo
- ✅ Floating "Order paid" + "Live market" cards orbit the phone in 3D space
- ✅ Letter-by-letter rotateX reveal of the hero headline
- ✅ Top scroll progress bar (gold gradient w/ glow)
- ✅ Floating ambient orbs (3 large blurred orbs w/ parallax scroll)
- ✅ Tilt-on-hover 3D cards (feature grid, stats, testimonials)
- ✅ Animated count-up counters on stats
- ✅ Cinematic rotateX/scale RevealOnScroll for AI spotlight, money-math, shops sections
- ✅ Rotating conic-gradient glow behind final CTA
- ✅ Mobile responsive (3D mockup hides on small screens)
- ✅ Reuses existing Harvest Hub palette + fonts (DM Serif Display + Instrument Sans)

### Existing app routes (untouched, preserved)
- Marketplace, Equipment, Transport, Shops, Farmers
- Dashboard, Disease ID, Financial Hub, Market Intelligence, Community
- Checkout, Receipts, Settings, Admin
- Login / Signup / Forgot password / Reset password

### Key new file
- `/app/src/components/landing/Cinematic3D.tsx` — animation primitives
  (`ScrollProgressBar`, `FloatingOrbs`, `CinematicHeroMockup`, `Tilt3DCard`,
  `AnimatedCounter`, `RevealOnScroll`, `Parallax`)
- `/app/src/routes/_authenticated/index.tsx` — landing page wired to new primitives

### Config touch
- `vite.config.ts` — added `server.allowedHosts: true` so Emergent preview URL works

## Backlog
- P1: Add testimonials carousel that auto-rotates (currently 3 static cards)
- P1: Add Zimbabwe-province SVG heatmap showing activity per region
- P2: Newsletter signup form wired to Supabase / Resend
- P2: Add Trustpilot / Google reviews badge
- P2: Optional 3D Zimbabwe-shaped wheat sigil rotating in hero (decorative)
- P3: A/B test hero copy variants
