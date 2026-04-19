# Simulator V3 design folder

This folder is the single source of truth for the V3 cockpit-layout
rework of `/simulator`.

## Files

- `STITCH_BRIEF.md` - copy-paste-ready prompts for Google Stitch. Run
  these manually in Stitch, export PNGs and SVGs, drop them into
  `exports/` below.
- `SPEC.md` - engineering spec for the V3 UI. Layout, overlays,
  interactions, verification checklist. Physics engine unchanged.
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
