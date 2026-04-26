# Yacht rig and physics spec

Scope: Bavaria 46 inspired cruising sloop model used by `/simulator-3d-lab`
and future browser 3D simulator.

## Coordinate System

Source GLB uses:

- `x`: stern negative, bow positive.
- `y`: port-starboard beam.
- `z`: up.

Three.js scene uses Y-up. The lab wraps the whole GLB in:

```ts
rotation={[-Math.PI / 2, 0, 0]}
```

All rig pivots are still specified in source GLB coordinates before that
wrapper rotation.

## Critical Asset Finding

Current GLB object names imply pivots, but actual node transforms are all at
origin:

- `LOD0_Rudder_Animated_Yaw_Pivot`: `translation [0, 0, 0]`.
- `LOD0_Boom_Animated_Yaw_Pivot`: `translation [0, 0, 0]`.
- `LOD0_MainSail_Grot_Animated_ClothSurface`: `translation [0, 0, 0]`.
- `LOD0_Jib_Staksel_Genoa_Animated_ClothSurface`: `translation [0, 0, 0]`.

The vertices are baked in world coordinates. Directly rotating these meshes is
physically wrong because they rotate around the boat origin, not around the
rudder stock, gooseneck, mast luff, or forestay.

The web lab compensates by creating synthetic pivot groups and translating
mesh geometry into those groups. Blender cleanup should bake the same pivots
into the GLB so runtime code can stay simple.

## Required Pivots

Use these source-coordinate pivots:

| Part | Pivot | Source position | Correct axis |
|---|---:|---:|---|
| Rudder | rudder stock top | `[-6.05, 0, -0.45]` | yaw around source `z` |
| Boom + main | gooseneck | `[-0.25, 0, 2.38]` | yaw around source `z` |
| Main sail cloth | mast luff | `[-0.25, 0, 2.32]` | yaw around source `z`, plus cloth camber |
| Jib | tack / forestay base | `[6.58, 0, 1.03]` | yaw around source `z`, plus cloth camber |
| Center of mass | hull COM | `[-0.4, 0, 0.12]` | physics reference |

## Physical Control Model

### Rudder

The rudder is not a throttle. It creates yaw torque and drag.

Recommended visual range:

- Normal steering: `-25 deg` to `+25 deg`.
- Hard-over: `-35 deg` to `+35 deg`.
- Visual response: damped, `0.15-0.35 s` smoothing.

Physics:

- Rudder force scales with water speed squared.
- At near-zero boat speed, rudder should do almost nothing.
- More rudder angle means more drag and speed loss.
- During tack, heading change should be rate-limited, not instant.

Current V3 runtime already does the correct high-level behavior:

- `targetHeading` changes.
- `approachHeading()` turns at fixed degrees per second.
- Tack duration is around 4-5 seconds.

### Main Sail

Main sail is attached to mast luff and controlled by sheet and boom.

Visual:

- Boom and main rotate together around gooseneck.
- Sail is never a flat board in final view.
- Camber must bulge to leeward.
- Leech opens with twist at the top.
- Reef reduces sail height/area and lowers center of pressure.

Physics:

- Sheet tension maps to boom angle off centerline.
- Hard sheeted: small angle off centerline.
- Eased: larger angle off centerline.
- Main side is leeward:
  - TWA > 0, wind from starboard, sails to port.
  - TWA < 0, wind from port, sails to starboard.
- If angle of attack is too high, main stalls.

### Jib

Jib is attached along the forestay and controlled by sheets.

Visual:

- Jib clew moves leeward with sheet angle.
- Luff stays close to forestay.
- Cloth camber should be visible.
- On normal courses, jib is on same side as main.
- On deep downwind, wing-on-wing can put jib opposite the main.

Physics:

- Jib angle has its own sheet control.
- Jib creates slot effect on main when both are attached and same side.
- Jib furl reduces area and center of pressure.
- Same-side jib is blanketed near dead downwind.

### Heel And Leeway

Heel is a consequence of side force and center of pressure height.

Visual:

- Hull rolls away from wind pressure.
- Keel and rudder stay attached to hull.
- Wake should shift with leeway, not only with heading.

Physics:

- More side force means more heel.
- Reefing lowers center of pressure and reduces heel.
- Leeway grows with side force and falls with boat speed.
- Excess heel should reduce effective sail force.

## Browser Implementation Plan

1. Keep V3 physics as the source of truth for sail force, heel, leeway, AWA,
   AWS, slot and stall.
2. Add a 3D adapter that maps runtime diagnostics to model transforms.
3. Do not run Unity physics in the browser version.
4. Use GLB only as visual/rig asset.

Mapping:

- `boat.heading` -> yacht yaw.
- `boat.heel` -> yacht roll.
- `diag.awa` and controls -> sail camber/twist visualization.
- `mainAngle` -> main pivot yaw.
- `jibAngle` -> jib pivot yaw.
- tack sign -> leeward side.
- `boat.leeway` -> wake direction offset.
- `mainStalled / jibStalled` -> visual flutter or red flow markers.

## Blender Cleanup Checklist

- Bake real object origins at the pivots above.
- Export normals.
- Add UVs or procedural material coordinates.
- Keep sails as separate named surfaces.
- Keep `COL_*` hidden from render and separate from visual nodes.
- Merge static small meshes by material only after animation pivots are fixed.
- Preserve names for runtime lookup.
