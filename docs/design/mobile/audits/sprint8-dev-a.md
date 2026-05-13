# Sprint 8 - Dev-A status: SkiaYacht photo mode

Date: 2026-05-13
Branch: `app`
Lane: Mobile (Dev-A of three parallel devs)

## Goal

Give `SkiaYacht` an opt-in `mode='photo'` so the simulator hull can read as a
real boat when the user wants visual fidelity, without taking on a runtime GLB
loader on device. The vector mode shipped in build 8 stays the default.

## Path taken

**Fallback path: single static yacht-top.png.**

The plan listed two routes - bake a 16-frame sprite atlas from the GLB via the
Blender MCP, or fall back to the existing `mobile/assets/anatomy/yacht-top.png`
top-down photograph. The Blender MCP was offline at the start of this sprint:

```
mcp__blender__get_scene_info
  -> Error getting scene info: Could not connect to Blender. Make sure
     the Blender addon is running.
mcp__trellis__get_scene_info
  -> Could not connect to Blender. Make sure the Blender addon is running.
```

Rather than burn the budget bringing Blender up, I shipped the fallback. The
`<SkiaYacht mode='photo'>` mode now renders the existing 768x768 top-down
white-hull photo as a Skia Image, rotated by the same outer Group transform
that already rotates the vector paths. Vector sails (main, jib, spinnaker, with
luff flutter, battens, twist, reef) overlay on top, so trim feedback still
reads in photo mode.

I also wrote `mobile/scripts/bake-yacht-sprites.mjs`, a documented bake script
for the Blender route. When the Blender MCP comes back online the script can
produce 16 PNG frames in `mobile/assets/yacht-sprites/` and a future patch can
swap the rotated single-photo render for nearest-frame lookup. The sprite-atlas
slot is reserved in the API but not wired - see "Follow-ups" below.

## Files

Created:
- `mobile/scripts/bake-yacht-sprites.mjs` - Blender headless / MCP bake script.
  Prints the Python program for `execute_blender_code`. Not executed this
  sprint (Blender MCP was offline).
- `docs/design/mobile/audits/sprint8-dev-a.md` - this status note.

Modified:
- `mobile/src/design-system/components/SkiaYacht.tsx`
  - Added `mode: SkiaYachtMode = 'vector' | 'photo'` and `photoSizePx?: number`
    props (vector is the default; existing call sites unaffected).
  - Imports `Image as SkiaImage` and `useImage` from `@shopify/react-native-skia`.
  - Loads `mobile/assets/anatomy/yacht-top.png` via `useImage`. The require()
    sits at module scope so Metro bundles it once.
  - In photo mode: renders a centered SkiaImage (size `photoSizePx ?? length *
    2.6`, default min 48 px) inside the existing rotation Group, then the
    sails / mast / boom / no-go ring on top.
  - Defensive: if `useImage` returns null (asset missing or first paint), the
    component renders the original vector hull paths instead. No flicker, no
    error boundary needed.
- `mobile/src/design-system/components/index.ts`
  - Re-exports the new `SkiaYachtMode` type alongside the existing
    `SkiaYachtProps`.
- `mobile/jest.setup.js`
  - Skia mock now exposes `Image: passthrough` and `useImage: () => null` so
    the existing test suite still renders SkiaYacht callsites without
    crashing. `useImage` returning null at test time is exactly the photo-mode
    fallback path, so vector sails still draw under jest-native renderer.

Untouched (per scope rules):
- `mobile/app/simulator/*` (Dev-B owns the wiring)
- `mobile/src/simulator/*` (Dev-B)
- `mobile/scripts/asc.mjs`, `asc-list.mjs`, `sync-content.ts` (Dev-C may extend)
- `mobile/__tests__/*` (no new tests added; existing coverage still passes)

## Photo-mode API for Dev-B

```ts
import { SkiaYacht } from '@/src/design-system/components';

<SkiaYacht
  mode='photo'         // default 'vector'
  photoSizePx={110}    // optional, default = length * 2.6 (min 48)
  centerX={...} centerY={...}
  headingRad={boat.heading}
  awaDeg={boatExt.awaDeg}
  mainSheet={controls.mainSheet ?? 0.5}
  jibSheet={controls.jibSheet ?? 0.4}
  sailSet={boatExt.sailSet}
  // ...all existing props unchanged
/>
```

Recommended photoSizePx for the existing simulator views:

- `Top` view (current half-length 56): try `photoSizePx={140}` so the photo
  hull fills roughly the same screen area as the vector silhouette.
- `Side` view: stays vector. Photo mode is a top-down photograph; it would
  not fit the side projection.
- `Rear` view: stays vector. Same reason.

When toggling, keep the prop reactive to a user setting; the component handles
the transition without remounting.

## Verification

```
cd mobile
npm run check
  - sync-content:check    OK
  - lint                  OK (--max-warnings=0)
  - typecheck             OK (tsc --noEmit clean)
  - test                  20/20 suites, 104/104 tests
```

Baseline before the change was the same 20/20 / 104/104. No new test
regressions, no new warnings.

## Follow-ups

For Dev-B (simulator wiring, next sprint):

1. Add a "photo" toggle next to the `Top / Side / Rear` view selector. When the
   user picks Photo, set `mode='photo'` on the Top view's SkiaYacht; keep
   Side/Rear in vector mode (the photo is top-down only).
2. Pick a sensible `photoSizePx` per view; `length * 2.6` is the default but
   `Top` may want 140-160 to match the current vector silhouette weight.
3. Consider gating photo mode on a `lowEndDevice` check - Skia's image rotation
   is cheap on iPhone 12+ but worth a perf check on iPhone SE. If FPS drops,
   fall back to vector silently with a one-time warn.

For Designer (next pass):

1. Source a real top-down hull photograph (or render) with transparent
   background. The current `yacht-top.png` is a 768x768 RGB on dark water and
   reads OK at 110 px hull size, but the surrounding water tint can look like
   a halo against the wind-map blue. A transparent PNG would composite cleaner.
2. If we want lighting-correct shadows per heading, that is the case where the
   16-frame atlas wins over rotating one image. The bake script is ready to
   run when Blender MCP is back online.

For PM:

1. The GLB-on-device path is still risky and not in this sprint. Photo mode is
   the "looks photo-quality without the runtime risk" deliverable from the
   sprint brief.
2. Bundle size impact: zero. The yacht-top.png is already shipped (anatomy
   screen uses it). Photo mode reuses the same asset.

## Decision rationale

- Single rotating photo over baked atlas, this sprint: Blender MCP was offline,
  baking would have meant local Blender install + figuring out a pipeline that
  matches what the MCP runtime would have produced. The single rotating sprite
  is 90% of the visual win at 0% of the schedule risk.
- Photo asset path = require() at module scope: keeps Metro happy, avoids any
  dynamic bundling of the asset, and makes the test mock trivial.
- Falls back to vector silently on null image: no spinner, no error UI. Photo
  mode is a visual upgrade, not a feature - if the image fails to load on a
  particular device, the user still gets the simulator.
- Did NOT extract YachtSprite into its own component. The photo path adds
  about 12 lines to SkiaYacht and reuses the existing rotation Group, sails,
  and mast head dot. A separate primitive would have duplicated the trim
  overlay logic; not worth it for one mode flag.
