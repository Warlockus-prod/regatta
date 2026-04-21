# Simulator V3 design folder

This folder is the single source of truth for the V3 cockpit-layout
rework of `/simulator`.

## Current status (2026-04-21)

Shipped live at `/simulator-v3` on `main`:

- PR-1 - feature-module split (route -> `src/features/simulator-v3/`).
- PR-2 - live runtime loop (30 Hz fixed-step, control interpolation,
  setInterval so hidden tabs still tick).
- PR-3 - heading-intent steering + HelmPod compass. TWA / tack flip
  drive `targetHeading`; boat heading walks there at
  `HEADING_TURN_RATE_DEG_PER_S = 45`, so a tack takes ~4 s through the
  wind instead of a teleport.
- PR-4 - mode bar + scenarios + drills. Three modes (Free Sail / Drills
  / Scenarios), 4 scenario presets, 3 drills with timer + hold-for
  evaluation + win/fail.
- Visual polish - animated waves, wind streaks, wake trail, distinct
  main (boom + battens) and jib silhouettes, wind-responsive belly.
- UX fixes - sail rotation sign corrected; mobile layout restructured
  so the scene gets 55 vh of its own and pods live in a 2x2 grid
  underneath.

Remaining pipeline items (from `BACKLOG.md`):

- PR-5 - feedback rewrite (4-level taxonomy + delta-sensitive msgs).
  Partially done via colored drill-result border; the primary-feedback
  priority table itself is still PR-1 shape.
- PR-6 - QA hardening and release cleanup.

Known minor notes:

- Initial hydration can log transient React "NaN attribute" warnings
  on some derived rotations. Guarded with `finite()` helpers so the
  DOM is always valid; warnings are dev-only noise.

## Files

- `STITCH_BRIEF.md` - copy-paste-ready prompts for Google Stitch. Run
  these manually in Stitch, export PNGs and SVGs, drop them into
  `exports/` below.
- `SPEC.md` - engineering spec for the V3 UI. Layout, overlays,
  interactions, verification checklist. Physics engine unchanged.
- `PIPELINE.md` - V3-only product map and implementation pipeline for
  developers. Use this as the delivery plan for the next rebuild wave.
- `BACKLOG.md` - PR-sized engineering backlog with file ownership,
  acceptance criteria, and recommended implementation order.
- `BEHAVIORAL_CONTRACTS.md` - testable V3 behavior contracts. Use this
  before calling any V3 phase "done".
- `exports/` - Stitch exports go here (PNG per state variant, any
  SVG/Figma tokens Stitch provides). Created when first export arrives.

## Workflow

1. Open Google Stitch.
2. Create a project "Regatta Simulator V3".
3. Paste `STITCH_BRIEF.md` section 0 (style guide) into the project.
4. Paste section 1 (MAIN SCREEN) and generate.
5. Paste sections 2-5 (variants) and generate each.
6. Optionally paste section 6 (desktop) and 7 (detail screens).
7. Export PNGs and any SVG/Figma tokens Stitch gives you.
8. Drop everything into `docs/design/simulator-v3/exports/` in the repo
   with filenames like:
     - `main-default.png`
     - `main-bad-trim.png`
     - `main-overpowered.png`
     - `main-reefed.png`
     - `rear-view.png`
     - `desktop.png`
     - `tokens.json` (if Stitch exports any)
9. Ping me, I'll build V3 to match.

## Notes

- See `SPEC.md` section "Verification checklist" for the exit criteria
  before V3 replaces V1 at `/simulator`.
- If Stitch produces something off-brand, section 9 of STITCH_BRIEF.md
  has ready-made correction prompts to reply with.
