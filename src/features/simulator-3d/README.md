# Simulator V2 - standalone 3D sailing module

A self-contained 3D sailboat simulator: a Blender-built cruising sloop you can
orbit, with sails driven by morph targets and a science-based physics model
(apparent wind, polar speed, heel, leeway, trim coaching). Built to be lifted
out of this app and reused.

## What is in here

```
config.ts              feature flag + GLB url
types.ts               YachtState, SimLabels (English defaults)
physics/sailModel.ts   slim UI/coach helpers (the GOLDEN VPP engine in
                       src/lib/sailing-physics does the physics since 2026-07-06),
                       polar speed, trim quality, leeway, coaching
physics/useSailingSim.ts  rAF loop hook: steps the model, writes a rig-state ref
Yacht.tsx              loads the GLB, drives morphs + rig nodes from the ref
RegattaScene.tsx       the R3F <Canvas> (OrbitControls, sky, water, lights)
Simulator3D.tsx        PORTABLE core component (no Next.js, no i18n)
SimulatorV2.tsx        app wrapper (Next.js + i18n + V1/V2/V3 switcher)
index.ts               exports
```

## Dependencies (peer)

- react, react-dom
- three (>= 0.184)
- @react-three/fiber (>= 9)
- @react-three/drei (>= 10)

`Simulator3D` (the portable core) uses ONLY those. `SimulatorV2` additionally
uses `next` and the app i18n - drop it if you embed the module elsewhere.

## Use it (portable core)

```tsx
import { Simulator3D } from './simulator-3d';

export default function Page() {
  return <Simulator3D />; // English UI; pass `labels` to localize
}
```

Host the model so it is reachable at the URL in `config.ts`
(`/models/regatta_sloop.glb` by default - change `YACHT_MODEL_URL` to your path).

## Modes

- Free trim: sliders set the rig directly; points-of-sail presets.
- Sailing: the physics model sails the boat. You steer (helm) and sheet
  (main/jib), set wind speed/direction, and get live telemetry + a trim coach.

## Route

`/simulator2` is always on: the iOS app's "3D" tab embeds it via WebView, so a
kill switch would break the shipped app (the old NEXT_PUBLIC_SIM_V2 flag was
removed 2026-07-05). The module itself is inert until mounted. Product role:
see docs/design/SIMULATORS.md ("3D boat view", not a third simulator).

## Asset

`regatta_sloop.glb`: ~13.9 m fractional cruising sloop, Y-up, with named rig
nodes (MainRig, JibRig, Rudder) and sail morph targets (Camber, Twist, Luff,
Reef). See the model package README for full part/scale details. Geometry and
proportions follow docs/design/SAILING_PHYSICS_REFERENCE.md.

## Note on axis signs

Heel / boom / rudder directions live in the `SIGN` constant in `Yacht.tsx`. If a
motion reads backwards after a visual check, flip the relevant 1 to -1.
