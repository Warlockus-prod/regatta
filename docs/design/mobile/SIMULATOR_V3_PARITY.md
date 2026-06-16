# Mobile simulator -> web V3 parity

Goal: bring `mobile/app/simulator/index.tsx` up to the full web V3 simulator
(`src/features/simulator-v3/*`) look and feature set. Decided 2026-06-06 (user:
"full parity").

> **STATUS 2026-06-06: PARITY REACHED - work stopped by user choice ("хватит").**
> The audit overstated the gaps: 3 views, the 4-slider + auto-trim control panel,
> and a 5-branch/7-language coach were ALL already present. This session added
> animated water (3 views), an interactive points-of-sail wind rose + course-name
> readout, a `?view=` deep-link, and the red->amber caution recolor. Remaining
> items below are OPTIONAL polish the user declined for now (telltales, richer
> wake, Side/Rear readout crowding, deeper coaching).

## Baseline (already at parity - do NOT redo)

- **Physics**: `mobile/src/simulator/physics/*` is a verbatim copy of the web
  VPP engine `src/lib/sailing-physics/*`. Same Controls, same outputs. The brain
  is identical.
- **3 views**: top / side / rear are all implemented as Skia scenes
  (`SideProfileScene`, `RearScene` + the inline top canvas).
- **Modes**: Free / Drill (6) / Mission.
- **Wind**: steady / shift / gust + live weather (same `/api/weather`).
- **Sail feedback states**: luff / stall / overtrim / good (`sail-feedback.ts`).

## The gap (what web V3 has that mobile is lighter on)

1. **Visual aliveness** - web has animated water, wake/spray particles, sail
   telltales, a richer compass. Mobile is flatter (static water, single-line
   trail, no telltales).
2. **Manual control pods** - web exposes ~8-9 sliders (main sheet + main twist,
   jib sheet + jib furl, helm TWA, wind). Mobile auto-trims and exposes fewer;
   twist/furl are not hand-controllable.
3. **Coaching depth** - web has a 4-tier commentary system
   (`src/features/simulator-v3/runtime/feedback.ts`, CRITICAL/WARNING/EDGE/
   HEALTHY) with many branches. Mobile commentary is short.

## Plan (phased, verify each on device before moving on)

### Phase 1 - Visual aliveness (the "looks old" fix) [in progress]
- [x] Animate the water (Top view): layered swells (per-row phase) + a faster
      shimmer layer, driven off `sim.tickN`. Verified animating on device.
- [x] **Interactive wind rose / compass.** Replaced the bare 34px arrow with a
      48px points-of-sail rose: 5 colour-coded sectors (no-go / close-hauled /
      beam / broad / run) rotated to the live wind, a bow-heading marker, and
      the boat's current point of sail lights up. Drag-to-set-wind kept. Uses
      the same sector geometry + tints as the Courses `PointsOfSailDiagram`.
      Verified on device. (User asked for this specifically: "understand the
      wind direction like the site".)
- [x] Point-of-sail NAME readout: an accented pill in the scene readout naming
      the live point of sail (e.g. "IN IRONS" / "BEAM REACH"), localized from the
      `pointsOfSail` data. Verified on device.
- [x] Animate the water on the Side + Rear scenes (SVG quads: per-line phase,
      vertical bob + crest pulse off `tickN`). Verified on device.
- [x] Deep-link a view: `regatta://simulator?view=side|rear` (a real feature, and
      it lets the dev loop reach the Side/Rear scenes for verification).
- [ ] Wind-rose polish (optional): cardinal N/E/S/W labels (needs a text overlay;
      low value on the small corner rose - deferred).
- [ ] Tidy the Side/Rear readout crowding (the shared IN IRONS/TWA/AWA/VMG pills
      overlap the scene's own LEEWAY/REEF/TWIST labels).
- [ ] Wake / spray behind the boat (bow wave + dispersing stern wake), scaled by
      boat speed.
- [ ] Telltales on main + jib, angle driven by attached/stalled flow (AoA).

### Phase 2 - Manual control pods  [ALREADY DONE - audit was wrong]
The audit claimed mobile had no manual twist/reef and was auto-trim-only. FALSE.
The control panel already has FOUR vertical sliders - **main sheet, jib sheet,
twist, reef** - plus an **auto-trim ON/OFF toggle** (`sim.setAutoTrim`). This is
effectively the web's control set (web has jib-furl instead of reef; mobile's
reef is the equivalent depower). Nothing to build here.
- [ ] (optional) Add a continuous jib-furl slider to mirror the web exactly.

### Phase 3 - Rich coaching  [mostly there]
Mobile already has `commentaryFor()` - a **5-branch, 7-language** coach (no-go /
stall / high-heel / healthy-trim / default) wired to the live commentary line.
Web's `feedback.ts` is more granular (more situational branches) but mobile is
functional and localized.
- [ ] (optional) Add a few more situational branches (pinching, sailing-by-the-lee,
      start-line speed) to match the web's depth.

## Constraints

- App lane owns `mobile/*`. May READ web V3 as reference; do NOT edit web V3.
- Keep `tsc` + lint + 108 tests green at every step.
- Engine is frozen - this is UI only, no physics edits.
- All of this rides in the uncommitted v1.2 bucket (ships after v1.1 clears
  Apple review). Update WEB_VS_APP_PARITY.md when phases land.
