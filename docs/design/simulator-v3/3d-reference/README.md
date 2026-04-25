# Bavaria 46 lowpoly reference model

Source: starter low-poly Bavaria 46 inspired model (1776 vertices,
87 named objects). Got this from the user as a candidate to plug
into the simulator.

## What's in here

- `bavaria_46_lowpoly_sloop.glb` - glTF binary (77 KB). Drops directly
  into a Three.js / R3F scene via `useGLTF`. **This is the right home
  for the V2 lane**, not V3.
- `bavaria_46_lowpoly_sloop.obj` - same geometry in text format (104 KB),
  parseable from Python / Node.
- `extract_silhouettes.py` - parses the OBJ, prints orthographic
  bounding boxes and convex-hull silhouettes for top / side / rear
  views.
- `convert_to_svg.py` - takes the silhouettes and emits SVG path
  strings in V3's local coordinate frames at the correct scale.

## How V3 used it

V3 stays SVG by design (the trainer focus is on physics readability,
not on photo-real rendering). Instead of loading the GLB at runtime,
we extracted the orthographic silhouettes and used them as path
strings in `SceneTop.tsx`, `SceneRear.tsx`, and `SceneSide.tsx`.

Concrete numbers picked up from the model:

- Length overall: 13.9 m  (X axis stern -6.95 .. bow +6.95)
- Beam:           4.35 m  (Y axis -2.17 .. +2.17)
- Hull bottom:    0.47 m below waterline at midship
- Sheer line:     0.75 m above waterline at bow + stern
- Cabin top:      1.50 m above waterline (at the maximum)
- Cabin extent:   x = -3.50 .. +3.90 m
- Keel draft:     1.87 m (top at -0.62 m, bulb at -2.49 m)
- Rudder:         x = -6.25 .. -5.55 m (mounted at the transom)
- Mast top:       18.10 m above waterline (16.6 m above the deck)

Scales used in V3:

- SceneTop  : 18.42 px/m  (length 256 px, beam 80 px)
- SceneSide : 25.90 px/m  (length 360 px = HULL_LEN)
- SceneRear : 50.00 px/m  (beam 220 px wide on a 760 canvas)

## How V2 should use it

Drop the GLB straight into the V2 R3F scene:

```ts
import { useGLTF } from '@react-three/drei';
const { scene } = useGLTF('/3d-reference/bavaria_46_lowpoly_sloop.glb');
```

Static asset path needs serving from `public/`, not from `docs/`.
Move the GLB to `public/models/bavaria_46.glb` if V2 picks this up.

The model has separate named objects (Hull, Keel, Rudder, Mast,
Boom, MainSail, Jib) so the V2 scene can grab them by name and
attach physics / animation / rotation pivots independently.

## Original README (from the model author)

See `bavaria_46_workflow_ru.txt` (renamed for clarity) - has
Blender-side workflow notes on splitting objects, adding subdivision,
PBR materials, colliders, and pivot points for sails / boom / rudder.
