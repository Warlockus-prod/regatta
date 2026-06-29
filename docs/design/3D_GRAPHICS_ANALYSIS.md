# Week to Regatta: 3D Graphics Upgrade - Decision-Ready Analysis

Author: Lead Graphics Architect
Stack: Next.js 16, React 19, three 0.184, @react-three/fiber 9.6, @react-three/drei 10.7. `@react-three/postprocessing` is NOT yet a dependency (confirmed absent in package.json) and must be added.
Constraint baseline: web + Expo/iOS mobile, 60fps on mobile, graceful degradation, parallel V1/V2/V3 lanes.

---

## 1. Executive summary

- **What is weak now:** the production simulator (V1) is pure 2D top-down canvas with no heel, no horizon, no perspective. The only real R3F 3D scene (V2 `SailingScene`) is shelved behind a `redirect('/simulator')` and was shipped-then-hidden precisely because it missed the bar. Where 3D does ship (`/anatomy` `YachtViewer3D`), it has no environment map, no real shadows (`castShadow={false}`), no tone mapping, and no post-processing, so PBR surfaces render flat and grey.
- **The single dominant defect is missing image-based lighting.** Every metalness surface (water 0.25, mast/boom 0.5) has nothing to reflect, so it reads as dull plastic. This one gap kills the water and all the metal/gelcoat at once. It was avoided everywhere for a CSP reason (`connect-src 'self'` blocks `raw.githack.com`), which is fixable by self-hosting one HDRI.
- **The water is a flat plane with summed `sin()` humps, no reflections, no Fresnel, no Gerstner, and a flat top-facing normal** so it shades like plastic. After IBL, this is the second biggest realism loss.
- **The boat asset is not engine-ready.** The canonical GLB has 142/142 meshes with no normals and no UVs, two components load two different GLB versions (v3 vs v8), 5 dead GLBs sit in `public/models/`, and there is no shared boat loader. Sails are rigid shells with no luffing, telltales, or trim-driven shape, which is fatal for a product whose whole point is teaching trim.
- **What "good" looks like:** a reflective Gerstner ocean under a self-hosted HDRI sky, ACES/AgX tone mapping with a light bloom on highlights, a single rigged hero boat with separately animated sails that visibly luff and twist with trim, a spring-damped follow camera, and heel/pitch coupling. This is achievable at 60fps on mobile by faking reflections in-shader on the mobile tier and reserving planar reflection / postFX for desktop.
- **Recommended home for the upgrade:** build a NEW shared `<RegattaScene>` R3F component in the V3 lane (`src/features/simulator-v3/*`), driven entirely by physics state passed as props. V3 owns a greenfield 3D surface, so it can host the new scene without touching V1 (production, do-not-touch) or the i18n/layout plumbing. V2's `SailingScene` is the seed to cannibalize, not extend. The same component later mounts in mobile (Expo) and can adapt the race surfaces (`/game`, `/multiplayer`, `/replay`) once it is proven.
- **Recommended path:** ship a Phase 0 "two-line miracle" (HDRI + reflective ocean + tone map) into a V3 sandbox in days, then build the shared `<RegattaScene>` around a clean Gerstner abstraction so the visual water and boat can be upgraded later without touching the physics-to-shape contract.
- **Opinionated bottom line:** do not try to revive V2 as-is and do not touch V1. Build one shared, physics-fed `<RegattaScene>` in V3, get IBL + ocean + tone mapping landing first, then layer the rigged boat and trim-driven sails. Everything else (CSM shadows, GPGPU cloth, WebGPU FFT) is a later, optional tier.

---

## 2. Current state - honest scorecard

| Surface | Tech today | Visual quality (1-5) | Biggest weakness |
|---|---|---|---|
| **SailingScene V2** (`src/app/simulator2/SailingScene.tsx`) | R3F, procedural primitives + extruded hull + custom cambered-sail BufferGeometry, bespoke 4-sine water shader, drei `<Sky>`, scripted chase cam | 2.5 | Shipped then hidden behind `redirect('/simulator')` (dead code). No envMap (explicitly "CSP-safe, local lights only"), no tone mapping, no bloom; water has no reflections / Fresnel / Gerstner / wave-driven normals. The cambered sails are the one good part. |
| **YachtViewer3D** (`src/components/YachtViewer3D.tsx`, used by `/anatomy`) | R3F, `useGLTF(Andryu_Yacht_v8.glb)`, OrbitControls, hotspots, 5 camera presets, fullscreen | 2.5 | No environment map, no real shadows (key light `castShadow={false}`, only fake `ContactShadows`), no post-processing. Loads a different GLB than the lab. Runtime material surgery on the mainsail. |
| **3d-lab** (`src/app/simulator-3d-lab/ModelLabClient.tsx`) | R3F QA sandbox, `useGLTF(...Prototype_v3.glb)`, diagnostics, sail-sweep slider, runtime pivot/rig synthesis, real shadows + `<Sky>` | 3 (as a tool) | Inspects a STALE v3 asset while prod ships v8, so it QAs the wrong file. Diagnostics partly hard-coded (`MODEL_DIAGNOSTICS`), can lie. Runtime rig synthesis papers over an asset with no rig. Ironically has better lighting than production. |
| **V1 Simulator** (`src/app/simulator/page.tsx`) | 2D canvas, inline yacht + `drawHull()` bezier, sine-particle water, compass/POS sectors | 3 (for 2D) | Pure top-down, no heel, no perspective. Richest 2D scene and the best teaching surface, but production + Shared-lane-owned, so do-not-touch from here. |
| **Arcade Game** (`src/app/game/GameClient.tsx`) | 2D canvas, follow cam, `drawBoat()` with TWA-driven lee sails, marks/laylines/minimap | 3 (for 2D) | Top-down radar look; would feel like a game with a 3D chase view but carries camera/fleet/HUD complexity. |
| **Multiplayer** (`src/app/multiplayer/MultiplayerClient.tsx`) | 2D canvas, interpolated server snapshots, stripped `drawBoat()` (hull + one triangle) | 1.5 | Wire format carries only `{x,y,h,s,l,f}` - no heel, no sail angle. 3D limited to what snapshots expose. |
| **Replay** (`src/app/r/[code]/ReplayViewer.tsx`) | 2D canvas, static frame scrub, bare triangle boat | 1 | A track scrubber; benefits least visually, but its `Sample` carries signed `twa` so sail side is reconstructable. |

Cross-cutting facts that frame every decision:

- **No surface models heel.** There is no `heel` field anywhere in state or `race-physics.ts`. This is the single biggest visual win 3D unlocks and it must be added (cheaply derivable from `speedFactor` + wind strength for visuals).
- **No envMap, no tone mapping, no post-processing anywhere** in the shipped 3D. `@react-three/postprocessing` is not even installed.
- **Asset chaos:** 5 GLBs in `public/models/`, 142/142 meshes missing normals and UVs, no shared `<Yacht>` loader, two divergent Z-up to Y-up conventions.

---

## 3. Target vision - two coherent modes

Both modes share ONE physics core and ONE `<RegattaScene>`. They differ only in assists, input granularity, camera defaults, HUD density, postFX intensity, and quality tier. This is the productized version of Sailaway's Beginner/Intermediate/Expert tiers.

### Arcade Game mode ("Regatta")
Pick-up-and-play, juicy, objective-driven. The graphics goal is **readable spectacle**.

Graphics it needs:
- Spring-damped chase cam, speed-adaptive FOV (75 to ~95 deg), slight surge lag for drama.
- Stylized-but-reflective ocean (Gerstner + in-shader sky reflection on mobile), pronounced heel, generous bow spray and wake foam.
- Bright, bloom-lit marks/buoys (emissive + `toneMapped={false}` so bloom selects them), bold readable wind dial, mark arrow, ghost layline.
- Telltales present but mostly decorative; luffing shown as a clear flutter.
- PostFX: Bloom + Vignette + SMAA, tone-map last. Camera shake on wave slam and crash gybe (trauma-based, Perlin-smoothed, rotational, capped).

### Serious Simulator mode ("Helmsman")
Authentic trainer. The graphics goal is **physical truthfulness as instrumentation**.

Graphics it needs:
- First-person cockpit/helm default (Sailaway rule: steer only from the helm), orbit for trim inspection.
- HDRI-lit ocean with real directional sun shadows (CSM on desktop), restrained postFX, no FOV gimmicks, minimal rotational-only shake.
- **Trim-driven sail shape is non-negotiable here:** per-slice twist from apparent-wind-per-height, camber depth/draft from outhaul/cunningham, luffing when AOA drops below stall. Telltales are the primary "am I sailing well" signal (inner luff = sheet in / bear away, outer stall = ease / head up).
- Full instrument cluster (AWA/AWS, TWA/TWS, HDG, SOG, VMG) with a graphical wind dial.

The shared engineering contract for sails (so you can ship Arcade now and Simulator later without rewriting gameplay): `AWA -> AOA -> per-slice rotation; sheet -> twist; outhaul/cunningham -> camber depth + draft position; AOA < stall -> luffing`.

---

## 4. The 6 pillars of quality

Effort key: S = up to ~2 days, M = ~3-7 days, L = 1-3+ weeks.

### (a) Ocean and water

- **Good (S):** three.js `Water` (via `WaterSurfaceSimple` or the raw object dropped into R3F) + drei `<Sky>` + self-hosted `<Environment>` HDRI, with a CPU Gerstner sum (4-6 waves) for buoyancy. Reflection RT 256-512 scaled by DPR; sun glint from `sunDirection`. Foam = scrolling texture + Fresnel edge. The only code you write is buoyancy, and because it mirrors the GPU wave function on the CPU you get heave/pitch/roll for free from 4 hull-point samples.
- **Better (M):** custom Gerstner ocean with LOD rings / projected grid, depth-based foam, and **in-shader sky reflection on mobile (no planar pass)** following the Nugget8 model that holds 120fps on a mid-range phone. Enable a cheap planar reflection or SSR only on desktop. Wake via a ping-pong foam render target behind the boat. Multi-point hull buoyancy with lerped (not snapped) orientation.
- **Best (L):** WebGPU + TSL FFT ocean (JONSWAP, 2 cascades) + analytical Gerstner swells to break tiling, 3 foam layers, caustics, geometry clipmap, GPU height-sampling buoyancy, with automatic WebGL2 fallback. DIY is multi-week; licensing Three.js Water Pro integrates the same stack in days.
- **Libraries/components:** `three/addons/objects/Water.js`, `WaterMesh.js` (WebGPU), `WaterSurface` (nhtoby311), `react-three-ocean` (haf-decent), drei `<Sky>` / `<Environment>` / `<MeshReflectorMaterial>`. drei does NOT ship an `<Ocean>` helper - bring your own mesh.
- **Decision:** target **Better** as the shippable bar; the single 60fps-protecting decision is "no planar reflection on mobile, fake sky reflection in the fragment shader." Keep buoyancy on a shared Gerstner abstraction so the visual water can be swapped later without touching physics.

### (b) Boat hull and rig assets

- **Good (S):** consolidate to ONE canonical GLB, delete the other 4, run it through Blender once to compute normals + UVs, extract a single shared `<Yacht>` loader (one `MODEL_URL`, one Z-up to Y-up convention). Named-node rig: `Hull`, `Mast`, `Boom` (child of Mast), `MainSail`, `Jib`, `Rudder`, `Tiller`, driven by `useFrame`. No skeleton needed.
- **Better (M):** PBR materials (clearcoat hull, sheen + double-side sails, high-metalness fittings), Poly Haven CC0 textures for wood/metal, gltfjsx-generated typed component with `--keepnames`, Draco geometry + KTX2 textures, GLB under 4 MB. Procedural/instanced fleet for opponents sharing one base mesh.
- **Best (L):** light armature or morph targets for sail belly baked in Blender, LOD variants (`<Detailed>`), KTX2 per-slot (ETC1S color, UASTC normal/AO/metalRough), a live diagnostics + pass/fail gate (normals present, UVs present, tri-budget, collider naming) as the asset-acceptance step.
- **Libraries/tools:** `useGLTF`, gltfjsx (`--transform --types --keepnames --instance`), `gltf-transform` CLI (`optimize`, per-slot `etc1s`/`uastc`/`draco`), drei `<Instances>`/`<Merged>`/`<Detailed>`.
- **Decision:** named-node transforms for boom/rudder/tiller (deterministic, physics-driven), morph targets over bones for any baked cloth on mobile (stability), bones/rigid only for hardware. Hybrid sourcing: imported hero hull + procedural/instanced fleet.

### (c) Sails and cloth/trim animation

- **Good (S):** parametric parabolic sail built on CPU per trim change using the Atterwind per-slice rotation method (camber ~45% position, ~10% depth; twist from apparent-wind-per-height). Mesh ~20x12 quads. Animation = vertex-shader flutter overlay (noise/sine x `windStrength`); luffing = ramp flutter amplitude and flatten camber near the luff when AOA < threshold. Telltales = instanced ribbons, 2-3 per sail, state from per-slice AOA (top breaks first because it is most twisted). This alone reads as "realistic." The V2 `buildCamberedSail` is a partial head start.
- **Better (M):** replace the flutter overlay on the hero mainsail + spinnaker with GPGPU mass-spring cloth (`GPUComputationRenderer`), anchored to mast/boom/forestay, stiffened along batten lines; spinnaker gets an ideal-gas pressure force for billow/collapse/refill. Morph-target fallback tier for low-end. Add a scrolling flow-streamline texture whose separation line follows AOA (Sailaway-style teaching overlay).
- **Best (L):** full GPGPU cloth on all sails with batten-stiffened leech and wind sampled from the same gradient model that feeds the VPP, plus a lightweight flow-visualization layer; quality tiers via capability detection. Even WebGPU high-res cloth is at the edge of real-time, so cap resolution and LOD distant boats.
- **Decision:** the parametric parabolic + per-slice-rotation shape (Good) is the highest-leverage sail piece and cheap enough for any device. Reserve GPGPU cloth for 1-2 hero sails. Never run CPU mass-spring for many boats on the main thread.

### (d) Lighting, sky and post-processing

This pillar has the best ratio of perceived quality to effort: correct color management + IBL + tone mapping get ~70% of "AAA" for near-zero runtime cost.

- **Good (S):** sRGB output + ACESFilmic (or AgX) tone mapping at exposure ~0.8-1.1; self-hosted 1k gainmap/EXR HDRI via `<Environment>` (presets are CDN-backed and CSP-blocked here, so self-host); one `directionalLight` for the sun with a 1024-2048 shadow map and a tight frustum; `<ContactShadows frames={1}>` under the hull. PostFX: Bloom + Vignette + SMAA, ToneMapping LAST in the `EffectComposer`.
- **Better (M):** 2k HDRI + 2-3 hand-placed `<Lightformer>` (a warm rect low on the horizon for the sun streak across water is the AAA secret weapon), `<AccumulativeShadows>` + `<RandomizedLight>` for static soft shadows, optional DoF for menu/hero shots, N8AO on the boat/rigging.
- **Best (L):** CSM (4 cascades) for crisp near+far sun shadows over the open horizon, live custom `<Environment frames={Infinity} resolution={256}>` with 5+ Lightformers, GodRays for sun shafts (note React 19 caveats on GodRays/Lensflare/FXAA), mild chromatic aberration/grain.
- **Libraries:** drei `<Environment>`/`<Sky>`/`<Lightformer>`/`<ContactShadows>`/`<AccumulativeShadows>`; `@react-three/postprocessing` (`<EffectComposer>`, `<Bloom mipmapBlur>`, `<Vignette>`, `<SMAA>`, `<ToneMapping>`); `three-csm` / `three-csm-typescript`.
- **Decision:** this is the first thing to build. Self-host one HDRI to clear CSP, set tone mapping on the Canvas, add Bloom + Vignette + SMAA. Make the sun an emissive `toneMapped={false}` mesh so Bloom selects it. ToneMapping pass must be last.

### (e) Camera, controls and game-feel

- **Good (S):** frame-rate-independent spring-damped follow cam (`SmoothDamp`/critically-damped, not a raw spring), ~7-12 m behind and 2-4 m above the stern, one-key camera cycle plus direct hotkeys (1=chase, 2=cockpit, 3=orbit, 4=cinematic), UI-hide toggle, FOV slider. **Heel/pitch coupling** (boat rolls to leeward as it powers up, stands up when eased) is the primary "loaded up" feel.
- **Better (M):** speed-adaptive FOV and damping, mast-cam/bow-cam for reading sail shape, trauma-based Perlin-smoothed rotational camera shake (capped, auto-decay, ~0.1-0.3s bursts) on slams/crash gybes, two named modes (Arcade chase / Sim cockpit) with "steer only from helm" in Sim.
- **Best (L):** cinematic/drone spectate cam (view-only), tactical zoomable top-down, full mobile touch ergonomics (left thumb steer, right thumb sheet slider + auto-trim/ease buttons, tap-to-tack, pinch-zoom orbit), instrument cluster with graphical wind dial and green-VMG arcade simplification.
- **Libraries:** drei `<OrbitControls>` (inspect only), `<PerspectiveCamera>`; custom follow-cam in `useFrame`; reuse the existing `CameraDriver` preset pattern from `YachtViewer3D`.
- **Decision:** keep the scene a render target driven by physics props (as V2 already does), but add the follow cam and heel/pitch coupling in-scene. Continuous analog trim for Sim, discrete one-press maneuvers for Arcade, both bound, mode picks the default. Do not over-juice: effects must never occlude the wind dial or telltales.

### (f) Performance and mobile budget

- **Good (S):** `dpr={[1,2]}` (clamp to 1.5 on mobile), `gl={{ antialias:false, powerPreference:'high-performance' }}` (MSAA off when postFX is on), tight shadow frustum, reuse geometries/materials in module scope (remember `THREE.ColorManagement.enabled=true` for module-scope colors), `<BakeShadows>`.
- **Better (M):** `<PerformanceMonitor onDecline/onIncline>` to scale DPR, `<AdaptiveDpr pixelated>`, instancing for buoys/opponents/waves/telltales, `<Detailed>` LOD for distant boats, KTX2 textures, 1-2k HDRI. Fix the two known V2 leaks: `Water` must NOT rebuild geometry+material when `amplitude` changes (drive `uAmplitude` as a uniform on static geometry) and `Wake` must NOT rebuild its `ShaderMaterial` when `intensity` changes (one material, live uniform); dispose old geometry/material on any rebuild.
- **Best (L):** WebGPU with WebGL2 fallback for FFT/compute (10-100x on the sim step), tiered quality compiled at init (strip disabled shader features, do not branch heavily in-shader), nested Suspense to stream low-res then high-res.
- **Decision:** mobile budget = no planar reflection (in-shader sky reflection), reflection RT 128-256 if any, water tessellation 80x80 not 180x180 (V2's 180x180 ~130k tris is overkill for low-frequency sine), drop SSAO/DoF/GodRays on mobile, lower shadow mapSize, smaller HDRI. A constantly animating ocean defeats `frameloop="demand"`, so gate the loop to active sim/camera only.

---

## 5. Asset-creation pipeline using our tools

End-to-end workflow (Blender MCP + Hyper3D/Hunyuan + Trellis + Poly Haven + Sketchfab + gltfjsx + gltf-transform). HARD blocker confirmed: every Blender MCP tool errors until Blender is open with the BlenderMCP addon connected (Sidebar > BlenderMCP > Connect). Verify with a `get_scene_info` call returning JSON before doing real work.

**Stage A - Concept and source decision (per asset):**
1. Specific real class (J/70, Optimist, Laser): try Sketchfab first (`search_sketchfab_models` -> `get_sketchfab_model_preview` -> `download_sketchfab_model`). Filter to CC-BY or CC0, downloadable, commercial-OK, derivatives-allowed (you must re-rig, so avoid CC-BY-ND, and avoid CC-BY-NC for an App Store product). Record author + URL + license now for `public/models/CREDITS.md`.
2. Stylized hull, no real match: generate. Prefer image-to-3D for hulls (better silhouette control). Use Photoshop/ComfyUI to make a clean side + 3/4 reference, then Hunyuan3D (best texture fidelity, PRO allows text+image, RAPID disallows text) or Hyper3D-via-images. Trellis is a GLB-native text-to-3D alternative.
3. Sails: build procedurally in Blender (`execute_blender_code`: subdivided plane + deform), NOT generated - AI fuses sails into the hull, and you want to control the exact geometry you later animate.

**Stage B - Generate/download into Blender:** run the generator, poll status, import. After import call `get_scene_info` / `get_object_info` / `get_viewport_screenshot` to confirm scale/orientation/arrival. Expect arbitrary scale, off-center origin, Z-up, messy n-gon topology, sometimes inverted normals.

**Stage C - Clean, scale, rig as NAMED NODES (the load-bearing step), all via `execute_blender_code`:**
1. Normalize transform: apply rotation/scale, set hull origin to waterline center, 1 unit = 1 meter (physics is metric).
2. Separate riggable parts into named objects: `Hull`, `Mast`, `Boom`, `MainSail`, `Jib`, `Rudder`, `Tiller`, `Keel`. Place each child's origin at its real rotation axis BEFORE parenting (rudder pivot, gooseneck).
3. Parent hierarchy = the rig: `Boom`/`MainSail` children of `Mast`; `Rudder`/`Tiller` children of `Hull`. This becomes the glTF node tree you drive by ref.
4. Name materials descriptively (`Mat_Hull_Gelcoat`, `Mat_Sail_Canvas`, `Mat_Wood_Deck`, `Mat_Metal_Fittings`) - gltfjsx surfaces them as `materials.Mat_*`.
5. Apply Poly Haven CC0 PBR textures where AI texture is weak (`search_polyhaven_assets type=textures` -> `download_polyhaven_asset` -> `set_texture`).
6. Compute normals; generate UVs - this fixes exactly the 142/142 missing-normals/UVs defect in the current asset.

**Stage D - Export GLB from Blender:** `bpy.ops.export_scene.gltf(export_format='GLB', export_yup=True, export_apply=True)`, only the boat collection (no camera/lights/world). Output e.g. `public/models/regatta_yacht_raw.glb`.

**Stage E - Optimize + emit R3F component (repo Node toolchain, not Blender):**
```
npx gltfjsx public/models/regatta_yacht_raw.glb \
  --transform --types --keepnames -o src/features/simulator-v3/Yacht.tsx
```
`--transform` runs gltf-transform (Draco geometry, textures to 1024 WebP, dedup/instance/prune, 70-90% smaller). `--keepnames` preserves `Hull`/`Mast`/`Rudder`/`MainSail` so rig refs work. `--types` emits typed TSX (matches strict-TS rule). Use Meshopt instead of Draco if the boat carries morph-target sails or keyframed animation. Move the `-transformed.glb` into `public/models/` and point `useGLTF` at it.

**Stage F - Drop into the scene:** wire `nodes.Rudder`, `nodes.Boom`, `nodes.MainSail` refs to game state; `<Environment files="/hdri/sky.hdr" background />` from a Poly Haven HDRI in `public/hdri/`; water lit by the same HDRI so reflections match.

**Default path per asset:** hero player boat = Hunyuan image-to-3D then manual re-rig in Blender (never trust AI for riggable pivots); background fleet = Sketchfab CC0/CC-BY, optimize hard, instance; sails = procedural in Blender, billow in a shader; sky + materials = always Poly Haven CC0.

**Legal to bake into the repo:** Poly Haven = CC0, ship freely. Sketchfab CC-BY = mandatory in-app attribution (`public/models/CREDITS.md` + credits screen). AI-generated = check provider ToS for commercial rights on the free tier; use your own paid key for anything that ships. Free-trial generation caps mean you should iterate the cheap reference image, not re-generate 3D repeatedly.

---

## 6. Recommended architecture: `<RegattaScene>`

A single shared, physics-fed R3F component. It is a pure render target: every input is a prop, no physics or input handling inside (mirrors V2's clean separation, fixes V2's per-tick rebuild leaks).

**Location:** `src/features/simulator-v3/RegattaScene.tsx` (V3 lane owns `src/features/simulator-v3/*`). It MAY read shared physics (`src/lib/sailing-physics/*`) and data files but must not edit i18n, layout, V1, or V2.

**Props/inputs:**
```
type BoatState = {
  position: { x: number; y: number };   // WORLD units (800x1200), or meters once normalized
  heading: number;                       // deg, 0=N, CW
  heel: number;                          // deg, NEW field (derive from speedFactor + wind if physics lacks it)
  pitch?: number;                        // deg, optional, from wave sampling
  mainAngle: number;                     // deg sail trim
  jibAngle: number;                      // deg
  twaSigned: number;                     // deg, sign = lee side
  speed: number;                         // knots, drives wake + spray
  reef?: number;                         // 0..1 sail-area scale
  luffing?: boolean;                     // AOA < stall -> flutter + flat luff
  style?: 'cruiser' | 'racer';
  isPlayer?: boolean;
};

type RegattaSceneProps = {
  player: BoatState;
  opponents?: BoatState[];               // instanced
  wind: { dir: number; speed: number; gust?: number };
  course?: { marks: Vec2[]; startLine: [Vec2, Vec2] };
  mode: 'arcade' | 'sim';                // picks camera default, HUD density, postFX intensity
  quality: 'low' | 'mid' | 'high';       // set by PerformanceMonitor + device detect
  camera?: 'chase' | 'cockpit' | 'orbit' | 'cinematic';
  onReady?: () => void;
};
```

**Internal structure:**
- `<Canvas>` with tone mapping, sRGB, DPR clamp, shadows set in `onCreated`.
- `<Ocean>` (Gerstner) exposing a `sampleWave(x,z,t)` used both in-shader and on CPU for buoyancy. `uAmplitude`/`uTime` as live uniforms on STATIC geometry (no per-prop rebuild).
- `<Environment>` self-hosted HDRI + (high tier) Lightformers; one `directionalLight` sun; `<ContactShadows>`.
- `<Yacht>` (the gltfjsx component) wrapped in a `<group>` that applies heading (yaw), heel (roll), pitch from buoyancy sampling at 4 hull points; sails are child groups rotated by `mainAngle`/`jibAngle` with the parabolic + per-slice-twist shape and luffing overlay; telltales instanced.
- `<Opponents>` via `<Instances>` sharing one mesh; `<Marks>`/`<Buoys>` instanced and emissive (bloom-selected).
- `<FollowCamera>` (SmoothDamp) keyed off `mode`/`camera`, speed-adaptive FOV, trauma shake hook.
- `<EffectComposer>` gated by `quality`: Bloom + Vignette + SMAA always, DoF/N8AO/GodRays desktop-only, ToneMapping last.
- `<PerformanceMonitor>` + `<AdaptiveDpr>` + `<BakeShadows>`.

**How V3 mounts it:** the V3 page builds `BoatState` from `src/lib/sailing-physics/*` output each tick and renders `<RegattaScene player={...} wind={...} mode="sim" quality={detected} />`. The scene never reaches back into physics.

**How V2 could mount it (optional, later):** V2 already has the prop shape; it can swap its `SailingScene` import for `<RegattaScene>` with an adapter. Not required and not in V3's lane to do.

**How mobile reuses it:** the Expo app imports the same `<RegattaScene>` + `BoatState` contract, hitting the existing web API for state, passing `quality="low"` (no planar reflection, in-shader sky reflection, smaller HDRI, postFX trimmed to Bloom+Vignette). Per CLAUDE.md mobile rules, this argues for eventually extracting `src/lib/sailing-physics/*` and the scene into a shared package so web and mobile import one source of truth - plan that extraction in the Shared lane before any duplication.

**Race surfaces (game/multiplayer/replay):** all three already agree on world coords via `race-physics.ts`. A `RaceBoat -> BoatState` adapter lets `<RegattaScene>` replace their three divergent `drawBoat()` implementations later. Multiplayer's wire format (`{x,y,h,s,l,f}`) carries no heel/sail angle, so those are client-derived from `h` + `wind.dir` until the wire format grows.

---

## 7. Phased roadmap (ordered by leverage)

### Phase 0 - Quick wins (days, S)
Deliverables: a V3 sandbox route (e.g. `/simulator-v3` or a `3d-lab` successor) rendering a minimal scene with (1) self-hosted HDRI `<Environment>`, (2) reflective ocean (three.js `Water` + `<Sky>`), (3) ACES/AgX tone mapping + exposure, (4) the existing canonical boat GLB with computed normals. Consolidate to ONE GLB and delete the other 4 from `public/models/`. Add `@react-three/postprocessing` and a Bloom+Vignette+SMAA pass.
Acceptance: side-by-side beats current V2/anatomy look; 60fps on a mid phone with DPR clamp; CSP passes (no external HDR fetch); `npx tsc --noEmit` clean, `npm run build` passes.
Effort: S.

### Phase 1 - The shared scene skeleton (M)
Deliverables: `<RegattaScene>` with the prop contract above; Gerstner ocean with shared CPU/GPU `sampleWave`; 4-point buoyancy -> heave/pitch/roll; follow camera (SmoothDamp); heel/pitch coupling driven by a NEW `heel` value (derive from `speedFactor` + wind if physics lacks it); fix the V2 rebuild leaks (uniforms not `useMemo` keys, dispose on rebuild); `PerformanceMonitor`/`AdaptiveDpr` tiering.
Acceptance: boat visibly floats, heels, and pitches; no GPU-memory growth over a 10-min session; quality tier auto-drops on a throttled device; physics untouched (scene is pure render target).
Effort: M.

### Phase 2 - Boat + trim-driven sails (M-L)
Deliverables: one rigged hero boat through the full Blender + gltfjsx + gltf-transform pipeline (named nodes, UVs, normals, PBR materials, sub-4MB GLB); parametric parabolic sails with per-slice twist + camber from trim, luffing overlay, instanced telltales; rig hardware (boom/rudder/tiller) driven by physics in `useFrame`; instanced opponent fleet sharing one mesh.
Acceptance: sails visibly twist and luff with trim and AOA; telltales break at the top first; opponents render in a few draw calls; asset passes a normals/UVs/tri-budget gate.
Effort: M (Good sails) to L (with GPGPU hero cloth).

### Phase 3 - Mode polish, postFX, mobile + race-surface reuse (L)
Deliverables: Arcade vs Sim mode defaults (camera, HUD density, postFX intensity, assists); CSM shadows + Lightformers + DoF/N8AO/GodRays on desktop tier; trauma camera shake; mobile Expo mount at `quality="low"`; `RaceBoat -> BoatState` adapter so `/game` (and later multiplayer/replay) can use the 3D scene; plan the shared-package extraction in the Shared lane.
Acceptance: Arcade reads as a polished game and Sim as a serious trainer from one scene; 60fps on mobile in low tier; game surface renders through `<RegattaScene>` without regressing race logic.
Effort: L.

---

## 8. Build this FIRST - the highest-leverage proof-of-concept

**What it is:** a single self-contained V3 sandbox scene that proves the "two-line miracle" plus the architecture spine: reflective Gerstner ocean + self-hosted HDRI sky + a boat placeholder with separately animated sails + a SmoothDamp follow camera + heel/pitch coupling, all fed by a mocked `BoatState`. This is Phase 0 fused with the Phase 1 skeleton, scoped to compile and run in the V3 lane without touching V1/V2/i18n. It validates the four riskiest things at once: CSP-safe IBL, reflective water + buoyancy, the prop-driven scene contract, and trim-driven sail motion.

**Files to add (all in V3 lane):**
- `src/features/simulator-v3/RegattaScene.tsx` - the scene component (skeleton below).
- `src/features/simulator-v3/Ocean.tsx` - Gerstner ocean exposing `sampleWave`.
- `src/features/simulator-v3/sailShape.ts` - parametric parabolic + per-slice-twist vertex builder (seeded from V2's `buildCamberedSail`).
- `src/app/simulator-v3/page.tsx` - sandbox page that mocks `BoatState` on a clock and mounts `<RegattaScene>` (V3 owns `src/app/simulator-v3/*`).
- `public/hdri/sky_1k.hdr` - one self-hosted HDRI (Poly Haven CC0) to clear CSP.
- Add `@react-three/postprocessing` to package.json.

**drei/three pieces used:** drei `<Sky>`, `<Environment>`, `<ContactShadows>`, `<PerformanceMonitor>`, `<AdaptiveDpr>`, `<BakeShadows>`; three `Water` (or a custom Gerstner shader plane), `MeshStandardMaterial`/`MeshPhysicalMaterial`; `@react-three/postprocessing` `<EffectComposer>`/`<Bloom>`/`<Vignette>`/`<SMAA>`/`<ToneMapping>`; R3F `useFrame`, `useThree`.

**Skeleton (ASCII-only, compilable-shaped):**

```tsx
'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, ContactShadows, PerformanceMonitor, AdaptiveDpr, BakeShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, SMAA, ToneMapping } from '@react-three/postprocessing';
import * as THREE from 'three';

// ---- contract (subset of the full BoatState in section 6) ----
export type BoatState = {
  position: { x: number; y: number };
  heading: number;     // deg, 0 = N, clockwise
  heel: number;        // deg, leeward roll
  mainAngle: number;   // deg
  jibAngle: number;    // deg
  twaSigned: number;   // deg, sign picks lee side
  speed: number;       // knots
  luffing?: boolean;
};

type RegattaSceneProps = {
  player: BoatState;
  wind: { dir: number; speed: number };
  quality?: 'low' | 'mid' | 'high';
};

const deg = (d: number) => (d * Math.PI) / 180;

// ---- shared Gerstner wave: SAME math on CPU and (conceptually) GPU ----
// 4 directional waves; returns height + approximate normal at world (x, z, t).
const WAVES = [
  { dir: [1, 0], amp: 0.25, len: 14, speed: 1.1 },
  { dir: [0.7, 0.7], amp: 0.18, len: 9, speed: 1.4 },
  { dir: [-0.4, 0.9], amp: 0.10, len: 5, speed: 1.8 },
  { dir: [0.2, -0.95], amp: 0.06, len: 3, speed: 2.2 },
];

function sampleWave(x: number, z: number, t: number) {
  let y = 0;
  let nx = 0;
  let nz = 0;
  for (const w of WAVES) {
    const k = (2 * Math.PI) / w.len;
    const phase = k * (w.dir[0] * x + w.dir[1] * z) + t * w.speed;
    y += w.amp * Math.sin(phase);
    const d = w.amp * k * Math.cos(phase);
    nx -= w.dir[0] * d;
    nz -= w.dir[1] * d;
  }
  const n = new THREE.Vector3(nx, 1, nz).normalize();
  return { y, normal: n };
}

// ---- ocean placeholder (swap for three.js Water / custom shader later) ----
function Ocean() {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1b4a63', metalness: 0.0, roughness: 0.25 }),
    [],
  );
  // NOTE: production replaces this with a Gerstner vertex shader feeding off WAVES,
  // and (desktop) a planar reflection; on mobile the sky is reflected in-shader.
  useFrame(({ clock }) => {
    if (ref.current) (ref.current.material as THREE.Material).needsUpdate = false;
    void clock;
  });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} receiveShadow material={mat}>
      <planeGeometry args={[400, 400, 80, 80]} />
    </mesh>
  );
}

// ---- a single sail: parametric shape lives in sailShape.ts; placeholder here ----
function Sail({ angleDeg, luffing }: { angleDeg: number; luffing?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const flutter = luffing ? Math.sin(clock.elapsedTime * 9) * 0.06 : 0;
    ref.current.rotation.y = deg(angleDeg) + flutter;
  });
  return (
    <group ref={ref}>
      {/* replace plane with buildCamberedSail() output (parabolic + per-slice twist) */}
      <mesh castShadow>
        <planeGeometry args={[1.4, 4.2, 12, 12]} />
        <meshPhysicalMaterial color="#f4f4ee" roughness={0.85} sheen={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ---- boat group: yaw + heel + pitch from buoyancy sampling at 4 hull points ----
function Boat({ state }: { state: BoatState }) {
  const group = useRef<THREE.Group>(null);
  const sailSide = state.twaSigned >= 0 ? -1 : 1;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    const { x, y } = state.position;
    // 4 hull samples -> heave (center), pitch (bow vs stern), roll (port vs stbd)
    const c = sampleWave(x, y, t);
    const bow = sampleWave(x, y + 1.5, t).y;
    const stern = sampleWave(x, y - 1.5, t).y;
    const port = sampleWave(x - 0.8, y, t).y;
    const stbd = sampleWave(x + 0.8, y, t).y;

    group.current.position.set(x, c.y, y);
    const yaw = deg(state.heading);
    const heel = deg(state.heel) * sailSide;          // lean to leeward
    const pitch = Math.atan2(bow - stern, 3.0);       // wave-driven trim
    const waveRoll = Math.atan2(port - stbd, 1.6) * 0.5;
    // lerp toward target so it feels like mass on water, not a glued cork
    group.current.rotation.set(pitch, yaw, heel + waveRoll);
  });

  return (
    <group ref={group}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.0, 0.4, 4.0]} />
        <meshStandardMaterial color="#dfe6ea" metalness={0.1} roughness={0.5} />
      </mesh>
      <group position={[0, 3.6, 0]}>
        <Sail angleDeg={state.mainAngle * sailSide} luffing={state.luffing} />
      </group>
      <group position={[0, 2.6, 1.6]}>
        <Sail angleDeg={state.jibAngle * sailSide} luffing={state.luffing} />
      </group>
    </group>
  );
}

// ---- SmoothDamp follow camera (frame-rate independent), speed-adaptive FOV ----
function FollowCamera({ state }: { state: BoatState }) {
  const { camera } = useThree();
  const vel = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    const yaw = deg(state.heading);
    const dist = 9 + state.speed * 0.5;
    const target = new THREE.Vector3(
      state.position.x - Math.sin(yaw) * dist,
      3.0 + state.speed * 0.1,
      state.position.y - Math.cos(yaw) * dist,
    );
    // critically-damped smoothing (no overshoot for a trainer)
    const smooth = 1 - Math.pow(0.0025, dt);
    camera.position.lerp(target, smooth);
    camera.lookAt(state.position.x, 1.0, state.position.y);
    const persp = camera as THREE.PerspectiveCamera;
    const targetFov = 70 + Math.min(state.speed, 10) * 2.5; // 70 -> ~95
    persp.fov += (targetFov - persp.fov) * smooth;
    persp.updateProjectionMatrix();
    void vel;
  });
  return null;
}

export default function RegattaScene({ player, wind, quality = 'mid' }: RegattaSceneProps) {
  const sun = useMemo(() => {
    const a = deg(wind.dir);
    return new THREE.Vector3(Math.sin(a) * 50, 22, Math.cos(a) * 50);
  }, [wind.dir]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ fov: 72, position: [0, 4, 14] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping; // or AgXToneMapping
        gl.toneMappingExposure = 0.95;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      {/* self-hosted HDRI clears CSP (no external CDN fetch) */}
      <Environment files="/hdri/sky_1k.hdr" environmentIntensity={1.0} />
      <Sky sunPosition={[sun.x, sun.y, sun.z]} turbidity={6} rayleigh={1.2} />

      <hemisphereLight intensity={0.4} />
      <directionalLight
        position={[sun.x, sun.y, sun.z]}
        intensity={2.2}
        color="#ffe2b0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      <Ocean />
      <Boat state={player} />
      <ContactShadows position={[player.position.x, 0.02, player.position.y]} scale={20} blur={2.5} far={6} opacity={0.5} frames={1} />

      <FollowCamera state={player} />

      {quality !== 'low' && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={1} intensity={0.7} />
          <Vignette offset={0.3} darkness={0.5} />
          <SMAA />
          <ToneMapping />
        </EffectComposer>
      )}

      <PerformanceMonitor />
      <AdaptiveDpr pixelated />
      <BakeShadows />
    </Canvas>
  );
}
```

The sandbox page mocks `BoatState` on a clock (drift `heading`, oscillate `heel` and `mainAngle`, toggle `luffing` when `twaSigned` crosses the no-go threshold) so the scene animates with no physics dependency yet. Once it looks right, swap the mocked state for `src/lib/sailing-physics/*` output and replace the `Ocean` placeholder with the real Gerstner shader and the `Sail` plane with `buildCamberedSail()`.

---

## 9. Risks, unknowns, and open questions

- **CSP self-hosted HDRI:** confirm `connect-src 'self'` allows loading `/hdri/sky_1k.hdr` from the same origin (it should, since presets fail only because they fetch `raw.githack.com`). Validate `.hdr` vs gainmap `.webp` (smallest footprint) decoding in the production build.
- **No `heel` in physics:** `heel`/`pitch` do not exist in any state object or `race-physics.ts`. Decide whether to add a real heel term to `sailing-physics` (Shared/owning lane concern) or derive it visually in-scene from `speedFactor` + wind. Visual derivation is fine for Arcade; Sim may want it physically truthful.
- **WebGPU readiness:** three r171+ WebGPURenderer with WebGL2 fallback is production-ish, but Safari/iOS WebGPU maturity in the Expo WebView is unverified for this app. Treat WebGPU FFT (Best tier) as optional and gate behind capability detection.
- **Mobile cloth:** SkinnedMesh has documented low-end mobile crashes and far-from-origin precision bugs; prefer morph targets/procedural for sails on mobile. GPGPU cloth budget on a mid iPhone is unmeasured - prototype before committing the hero-cloth tier.
- **Asset legality:** verify commercial-use rights for any AI-generated or Sketchfab asset before App Store ship; CC-BY needs in-app attribution; avoid CC-BY-ND/NC. Open question: is one purchased rigged yacht (CGTrader/TurboSquid) cheaper end-to-end than generate-then-rig given free-trial caps?
- **Lane coordination:** building in V3 avoids touching V1/V2/i18n, but a future shared-package extraction of `sailing-physics` + `<RegattaScene>` for mobile is a Shared-lane decision per CLAUDE.md and needs an ADR in `docs/design/mobile/DECISIONS.md`. Do not duplicate `src/data/*` or physics before that plan exists.
- **Blender MCP dependency:** the entire asset-generation half is dead until Blender is open with the BlenderMCP addon connected (confirmed errors otherwise). It is a desktop GUI dependency, not headless - plan asset work around that and the free-trial generation caps.
- **Buoyancy/physics divergence:** if the visual ocean later moves to FFT (displacement texture), the CPU cannot cheaply re-derive height. Keep a coarse analytic Gerstner on the CPU purely for physics while FFT drives visuals.
- **`frameloop="demand"`:** a constantly animating ocean defeats on-demand rendering. Decide per surface whether to gate the loop to active sim/camera (good for menus/idle) or always render (race).

---

## 10. Source links (deduplicated)

Ocean / water:
- https://threejs.org/docs/pages/Water.html
- https://threejs.org/docs/pages/WaterMesh.html
- https://threejs.org/docs/pages/Reflector.html
- https://github.com/nhtoby311/WaterSurface
- https://github.com/haf-decent/react-three-ocean
- https://www.npmjs.com/package/react-three-ocean
- https://github.com/jbouny/fft-ocean
- https://github.com/Nugget8/Three.js-Ocean-Scene
- https://github.com/achalpandeyy/OceanFFT
- https://barthpaleologue.github.io/Blog/posts/ocean-simulation-webgpu/
- https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models
- https://sbcode.net/threejs/gerstnerwater/
- https://medium.com/karmanltd/ocean-simulation-pt-3-gerstner-waves-a747069e1b59
- https://franky-arkon-digital.medium.com/realistic-but-fast-water-waves-in-three-js-a48e2c9b0695
- https://www.seacreaturegame.com/blog/gerstner-waves-with-buoyancy-godot
- https://threejsroadmap.com/assets/threejs-water-pro
- https://docs.threejswaterpro.com/
- https://ilikekillnerds.com/2026/05/21/i-built-tidewater-threejs-ocean-kit/
- https://tympanus.net/codrops/2025/03/04/creating-stylized-water-effects-with-react-three-fiber/
- https://80.lv/articles/have-a-look-at-this-ocean-shader-with-dynamic-foam-realistic-reflections
- https://moldstud.com/articles/p-mastering-realistic-water-effects-in-threejs-techniques-and-tips-for-stunning-visuals

Sails / cloth:
- https://github.com/flyinggorilla/simulator.atterwind.info/wiki/Simulation
- https://simulator.atterwind.info/
- http://www.onemetre.net/design/Parab/Parab.htm
- https://sailzing.com/shaping-your-mainsail-part-1-angle-of-attack/
- https://sailzing.com/shaping-your-mainsail-part-3-draft-shape-and-position/
- https://sailzing.com/shaping-your-sail-part-4-controlling-twist/
- https://mandurahyachtacademy.au/shaping-your-sail-with-draft-twist-angle-of-attack-camber-wind-conditions/
- https://en.wikipedia.org/wiki/Apparent_wind
- https://en.wikipedia.org/wiki/Wind_gradient
- https://www.spinsheet.com/racing/telltales-tell-tale-part-1
- https://sailcare.com/a-telltale-tale/
- https://sailzing.com/mainsail-telltales-a-better-approach/
- https://www.sailingworld.com/how-to/angles-of-attack/
- https://www.uksailmakers.com/encyclopedia/53-sailing-to-telltales
- https://threejs.org/examples/#webgl_animation_cloth
- https://threejs.org/docs/#examples/en/misc/GPUComputationRenderer
- https://github.com/cabbibo/PhysicsRenderer
- https://github.com/RobertoLovece/Cloth
- https://github.com/amandaghassaei/MassSpringShader
- https://antongerdelan.net/opengl/blend_shapes.html
- https://arxiv.org/pdf/2507.11794
- https://arxiv.org/pdf/physics/0407003
- https://www.technetexperts.com/react-three-fiber-skinnedmesh-mobile-fix/
- https://github.com/mrdoob/three.js/issues/13288
- https://sailaway.world/aboutsa
- https://sailaway.world/devsa3
- https://www.esailyachtsimulator.com/
- https://www.sailrhythm.com/
- https://www.sailrhythm.com/guide
- https://github.com/QusaiAlbonni/three-sails
- https://github.com/leeboardtools/bythelee
- https://discourse.threejs.org/t/see-sailing-sailing-performance-visualisation/70374
- https://discourse.threejs.org/t/help-building-a-sailing-viewer/47336
- https://threejs.org/examples/webgl_shaders_ocean.html

Boat assets / PBR / compression:
- https://sketchfab.com/blogs/community/an-introduction-to-creative-commons-licenses/
- https://www.licenseorg.com/guide/3d-assets/sketchfab
- https://www.voxelmatters.com/sketchfab-download-re-use-remix-3d-cultural-heritage/
- https://sketchfab.com/tags/sailingyacht
- https://sketchfab.com/developers/download-api/guidelines
- https://polyhaven.com/
- https://polyhaven.com/license
- https://polyhaven.com/hdris
- https://github.com/madjin/awesome-cc0
- https://www.meshy.ai/tags/yacht
- https://www.cgtrader.com/3d-models/yacht
- https://free3d.com/3d-models/boat
- https://github.com/KhronosGroup/glTF-Sample-Models
- https://gltf-transform.dev/
- https://gltf-transform.dev/cli
- https://github.com/donmccurdy/glTF-Transform
- https://github.com/donmccurdy/glTF-Transform/discussions/1305
- https://github.com/juunini/gltf-optimizer
- https://github.com/klich3/threejs-gltf-with-compressions-sample
- https://discourse.threejs.org/t/compression-draco-ktx2-example/31382
- https://www.utsubo.com/blog/threejs-best-practices-100-tips
- https://www.axl-devhub.me/en/blog/optimizing-3d-models
- https://github.com/pmndrs/gltfjsx
- https://gltf.pmnd.rs/
- https://sbcode.net/react-three-fiber/gltfjsx/
- https://r3f.docs.pmnd.rs/tutorials/loading-models
- https://blog.logrocket.com/configure-3d-models-react-three-fiber/
- https://medium.com/@zmommaerts/how-to-import-a-gltf-file-into-your-react-application-using-react-three-fiber-63ecf905182c
- https://sbcode.net/react-three-fiber/environment/
- https://onion2k.github.io/r3f-by-example/examples/lighting/pbr-environment-map/
- https://onion2k.github.io/r3f-by-example/examples/materials/materials/
- https://docs.pmnd.rs/react-three-fiber/tutorials/loading-textures
- https://github.com/pmndrs/react-three-fiber/discussions/2485
- https://medium.com/@ertugrulyaman99/react-three-fiber-enhancing-scene-quality-with-drei-performance-tips-976ba3fba67a
- https://threejs.org/docs/pages/MeshPhysicalMaterial.html
- https://discourse.threejs.org/t/fabric-shader-on-threejs
- https://tympanus.net/codrops/2020/02/11/how-to-create-a-physics-based-3d-cloth-with-cannon-js-and-three-js/
- https://steemit.com/utopian-io/@azcax/how-to-simulate-the-wind-cloth-by-three-js-or-three-js
- https://medium.com/@pablobandinopla/simple-cloth-simulation-with-three-js-and-compute-shaders-on-skeletal-animated-meshes-acb679a70d9f
- https://github.com/pmndrs/react-three-fiber/discussions/1494
- https://codeworkshop.dev/blog/2021-01-20-react-three-fiber-character-animation
- https://dev.to/trevorzylks/three-js-react-three-fiber-basics-and-loading-3d-models-gltf-5g80
- https://dev.to/studio_hungry/notes-on-react-three-fiber-4f8g
- https://www.khronos.org/ktx/
- https://www.khronos.org/news/press/khronos-ktx-2-0-textures-enable-compact-visually-rich-gltf-3d-assets
- https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXArtistGuide.md
- https://doc.babylonjs.com/features/featuresDeepDive/materials/using/ktx2Compression
- https://binomialllc.github.io/basis_universal/
- https://discourse.threejs.org/t/gltf-loading-performance-for-large-files-r3f/39701
- https://moldstud.com/articles/p-creating-lightweight-3d-assets-the-case-for-gltf-in-threejs
- https://moldstud.com/articles/p-exploring-threejs-procedural-geometry-real-world-applications-and-inspiring-examples
- https://discourse.threejs.org/t/parametric-boat-with-dynamic-water-masking/88150
- https://threejs-journey.com/lessons/imported-models

Lighting / postFX / performance:
- https://r3f.docs.pmnd.rs/advanced/scaling-performance
- https://www.donmccurdy.com/2020/06/17/color-management-in-threejs/
- https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791
- https://www.lune.dev/questions/9652/how-do-the-new-color-management-changes-in-threejs-r-affect-my-rendering-workflo
- https://discourse.threejs.org/t/shadermaterial-and-colormanagement/78130
- https://discourse.threejs.org/t/tone-mapping-overview/75204
- https://discourse.threejs.org/t/is-agx-tonemapping-implemented-correctly/60609
- https://discourse.threejs.org/t/acesfilmictonemapping-leading-to-low-contrast-textures/15484
- https://modelviewer.dev/examples/tone-mapping
- https://threejs.org/docs/#api/en/renderers/WebGLRenderer.toneMapping
- https://drei.docs.pmnd.rs/staging/environment
- https://drei.docs.pmnd.rs/staging/lightformer
- https://drei.docs.pmnd.rs/staging/sky
- https://drei.docs.pmnd.rs/staging/contact-shadows
- https://drei.docs.pmnd.rs/staging/accumulative-shadows
- https://drei.docs.pmnd.rs/performances/adaptive-dpr
- https://www.thefrontdev.co.uk/mastering-skybox-realism-loading-and-applying-hdri-with-three-and-r3f/
- https://react-postprocessing.docs.pmnd.rs/
- https://react-postprocessing.docs.pmnd.rs/effects/bloom
- https://react-postprocessing.docs.pmnd.rs/effects/depth-of-field
- https://react-postprocessing.docs.pmnd.rs/effects/ssao
- https://react-postprocessing.docs.pmnd.rs/effects/god-rays
- https://react-postprocessing.docs.pmnd.rs/effects/tone-mapping
- https://nannyakore.com/en/blog/react-three-postprocessing-custom-shader-en/
- https://threejs-journey.com/lessons/post-processing-with-r3f
- https://threejsroadmap.com/blog/the-complete-guide-to-threejs-post-processing-in-2026
- https://discourse.threejs.org/t/help-needed-screen-space-reflections-ssr-integration-with-react-three-fiber-postprocessing/89475
- https://github.com/0beqz/screen-space-reflections
- https://github.com/StrandedKitty/three-csm
- https://github.com/alexnil/three-csm-typescript
- https://threejs.org/examples/webgl_shadowmap_csm.html
- https://threejs.org/docs/pages/CSM.html
- https://sbcode.net/threejs/csm/
- https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/
- https://tympanus.net/codrops/2026/04/24/susurrus-crafting-a-cozy-watercolor-world-with-three-js-and-shaders/
- https://wawasensei.dev/courses/react-three-fiber/lessons/optimization
- https://www.utsubo.com/blog/webgpu-threejs-migration-guide
- https://www.utsubo.com/blog/threejs-2026-what-changed
- https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/
- https://github.com/mrdoob/three.js/wiki/Migration-Guide

Camera / controls / game-feel:
- https://steamcommunity.com/sharedfiles/filedetails/?id=918991750
- https://steamcommunity.com/app/552920/discussions/0/2666626316172223227/
- https://steamcommunity.com/app/552920/discussions/0/1726450077646353799/
- http://www.stentec.com/anonftp/pub/ss5/Manual_EN.pdf
- https://vrinshore.zendesk.com/hc/en-us/articles/360012273900-The-game-interface
- https://vrinshore.zendesk.com/hc/en-us/articles/360012294540-How-do-I-control-my-boat
- https://pixune.com/blog/game-camera-setups/
- https://generalistprogrammer.com/tutorials/game-camera-systems-complete-programming-guide-2025
- https://gamedev.net/forums/topic/556037-chase-camera-w-spring/4571519/
- https://jermesa.com/free-smooth-third-person-vehicle-follow-camera-script-for-unity/
- https://www.modland.net/beamng.drive-mods/other/enhanced-chase-camera-fix-adaptive-height-refined-fov.html
- https://cogconnected.com/review/wind-leaves-psvr-review/
- https://steamcommunity.com/sharedfiles/filedetails/?id=2207228979
- https://www.esailyachtsimulator.com/the-world-of-esail/learn-to-sail/
- https://steamcommunity.com/app/794860/discussions/0/3085520348643220749/
- https://steamcommunity.com/sharedfiles/filedetails/?id=2643208790
- https://sailwind.fandom.com/wiki/Basic_Sailing
- https://boatsgeek.com/sailaway-sailing-simulator-review/
- https://www.lifeofsailing.com/blogs/articles/best-virtual-sailing-simulators-and-games
- https://virtualregatta.zendesk.com/hc/en-us/articles/115001723653-The-speed-polar
- https://virtualregatta.zendesk.com/hc/en-us/articles/115001723793-Find-out-the-speed-polar-for-my-boat
- https://www.practical-sailor.com/marine-electronics/wind-systems-part-2-data-display-and-user-interface/
- http://www.ockam.com/2013/05/16/graphical-sailing-displays/
- https://www.westmarine.com/west-advisor/Selecting-Navigational-Instruments.html
- https://grokipedia.com/page/Vibesail
- https://sailing-around.com/reading-the-wind/
- https://en.wikipedia.org/wiki/Game_feel
- https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design
- https://www.bloodmooninteractive.com/articles/juice.html
- https://itch.io/blog/1059831/making-a-game-feel-juicy-with-simple-effects
- https://gt3000.medium.com/juice-it-adding-camera-shake-to-your-game-e63e1a16f0a6
- https://kidscancode.org/godot_recipes/4.x/2d/screen_shake/index.html
- https://roystan.net/articles/camera-shake/
- https://github.com/baratgabor/Unity3D-PerlinCameraShake
- https://www.wayline.io/blog/the-juice-problem-how-exaggerated-feedback-is-harming-game-design
- https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms/Mobile_touch
- https://www.yorku.ca/mack/ec2017.html
- https://www.yorku.ca/mack/ie2014.html
- https://playgama.com/blog/general/what-are-the-key-design-elements-and-ergonomics-considerations-when-drawing-a-gaming-controller-concept-for-my-game/

Our tooling (asset pipeline):
- https://github.com/ahujasid/blender-mcp
- https://developer.hyper3d.ai/get-started/readme-1
- https://deepwiki.com/ahujasid/blender-mcp/3.4-hunyuan3d-integration
- https://github.com/ahujasid/blender-mcp/pull/182
- https://github.com/pmndrs/drei

---

## Appendix A - Unified architecture: both modes from ONE scene

Decision locked with the product owner: ship BOTH Arcade ("Regatta") and Simulator ("Helmsman") from a SINGLE `<RegattaScene>`, not two renderers. This appendix turns that decision into a buildable contract. It supersedes any reading of sections 3/6 that implies two code paths.

### A.1 The core rule: two ORTHOGONAL axes

There are two independent knobs. Conflating them is the trap that left V1 stuck in 2D and V2 shelved.

- `mode: 'arcade' | 'sim'` decides WHAT to communicate: intent, assists, camera framing, HUD density, postFX flavor, input granularity. It is a design choice, set by the user/route.
- `quality: 'low' | 'mid' | 'high'` decides HOW MUCH GPU to spend: reflections, shadows, postFX cost, cloth, LOD, DPR. It is a hardware choice, set by `PerformanceMonitor` + device detect.

Any of the 2 x 3 = 6 combinations must be valid. The two flagship targets are **Arcade-low** (mobile game) and **Sim-high** (desktop trainer); **Sim-low** (mobile trainer) and **Arcade-high** (desktop showpiece) are real and must not crash or look broken.

### A.2 What is IDENTICAL across both modes (single source of truth)

These never fork. Build once, at SIM fidelity:

- Physics core and the `BoatState` contract (section 6).
- The boat GLB + named-node rig (`Hull/Mast/Boom/MainSail/Jib/Rudder/Tiller`).
- The Gerstner ocean geometry and the shared `sampleWave(x,z,t)` used for buoyancy.
- The parametric sail-shape builder (twist + camber + luff). The sail math from section 3.65 (`AWA -> AOA -> per-slice rotation; sheet -> twist; outhaul/cunningham -> camber; AOA < stall -> luffing`) is built to sim grade in BOTH modes. Arcade does not get a cheaper sail; it gets the same sail with telltales de-emphasized.
- The HDRI lighting rig and tone-mapping pipeline.

The renderer is sim-grade. Arcade is a PRESET over it, never a second renderer.

### A.3 Mode matrix - what `mode` actually changes

| Dimension | Arcade ("Regatta") | Sim ("Helmsman") | Notes |
|---|---|---|---|
| Default camera | chase (spring-damped), cinematic on idle | first-person cockpit/helm, orbit for trim inspection | both camera rigs exist from Phase 1 |
| FOV | speed-adaptive 75 to ~95, slight surge lag | fixed ~60-65, no gimmick | one `FollowCamera`, mode-parameterized |
| Camera shake | trauma on wave slam / crash gybe, pos + rot | minimal, rotational-only, low cap | same shake module, different gain |
| Heel feel | visually amplified for drama (`heelVisualGain` ~1.4) | physically truthful (`heelVisualGain` 1.0) | ONE heel term, multiplied late |
| Telltales | decorative flutter | primary diagnostic (break-at-top = trim signal) | same geometry, different emphasis |
| HUD | minimal: wind dial, mark arrow, ghost layline | full cluster AWA/AWS, TWA/TWS, HDG, SOG, VMG | HUD is a DOM overlay, NOT in canvas |
| Assists | layline ghost, no-go shading, auto-trim hint on | off by default, optional | scene draws hints only if flag set |
| PostFX flavor | bloom hot, emissive bloom-lit buoys, vignette | restrained, accurate exposure, no bloom-bait | gated by `mode` AND `quality` |
| Input granularity | one-tap tack/gybe, coarse single sheet | continuous sheet, separate main/jib, helm steer | lives in the page/controller, not the scene |
| Framing | race / score / marks | free sail + drills + instrument practice | route-level, scene is agnostic |

Key consequence: every row is a PARAMETER, not a branch. The scene reads a resolved `MODE[mode]` object; it never has `if (arcade) renderA() else renderB()`.

### A.4 Quality matrix - what `quality` changes (orthogonal to mode)

| Subsystem | low (mobile) | mid | high (desktop) |
|---|---|---|---|
| Water reflection | in-shader sky reflection only | cheap SSR-ish | planar reflector / FFT displacement |
| Shadows | `<ContactShadows>` only | single dir light + PCF soft | CSM cascades |
| Environment | 1k HDRI | 2k HDRI | 2k HDRI + Lightformers |
| PostFX | Bloom + Vignette (or off) | + SMAA | + DoF / N8AO / GodRays |
| Sails | procedural shape, shader flutter | + finer slices | GPGPU hero cloth |
| Fleet | instanced, low LOD | instanced, mid LOD | full LOD |
| DPR clamp | [1, 1.5] | [1, 2] | [1, 2] |

Mode picks the FLAVOR of postFX (arcade wants bloom); quality picks the BUDGET (low may drop it). A `mode=arcade, quality=low` scene still wants bloom but may get a cheap one or none on a weak phone. These two decisions are resolved separately and then combined.

### A.5 How it threads through the code (illustrative, not shipping code)

One resolved config per axis, read by the same `<RegattaScene>`:

```
type ModeConfig = {
  camera: { def: 'chase' | 'cockpit'; allowOrbit: boolean;
            fov: { base: number; speedGain: number }; shake: 'trauma' | 'minimal' | 'none' };
  heelVisualGain: number;                 // 1.0 truthful (sim) .. ~1.4 dramatized (arcade)
  telltales: 'diagnostic' | 'decorative';
  hud: 'full' | 'minimal';                // consumed by a DOM overlay, not the canvas
  assists: { laylineGhost: boolean; noGoShading: boolean; autoTrimHint: boolean };
  postFx: { bloom: number; vignette: number; dof: boolean };
};

const MODE: Record<'arcade' | 'sim', ModeConfig> = { /* two presets */ };
// scene: const m = MODE[mode]; const q = resolveQuality(perfMonitor, device);
// camera, shake, heel gain read from m; reflections/shadows/cloth read from q.
```

### A.6 Two rules that protect the "one scene" promise

1. **HUD lives OUTSIDE the canvas.** Instrument cluster, wind dial, mark arrows, laylines are React/DOM overlays bound to the same `BoatState`, not THREE objects. This keeps the 3D canvas byte-identical between modes (HUD density becomes a pure CSS/React concern), and it keeps i18n + accessibility in normal React, which matters for a 7-language App Store product.
2. **Mode never reaches into physics.** One-tap vs continuous input changes how `mainAngle/jibAngle/helm` are produced upstream (page/controller), not how the scene renders them. The scene stays a pure render target for both modes.

### A.7 Open decisions specific to the unified path

- **Heel term ownership.** Sim needs a truthful `heel`; arcade multiplies it visually. Decide before Phase 1 whether to add a real heel term to `src/lib/sailing-physics/*` (a Shared-lane change, needs coordination) or derive it in-scene from `speedFactor` + wind. Recommendation: add a real heel term so both modes read one source; arcade applies `heelVisualGain` late.
- **Cockpit asset.** Sim cockpit/helm view needs at least a masked foreground or a low-poly helm; arcade never shows it. Budget that low-poly cockpit only when Sim cockpit actually ships (Phase 3), not in the POC.
- **PostFX double-gate.** Confirm the resolve order: `mode` proposes the postFX flavor, `quality` caps the cost. Write it as `effects = capByQuality(MODE[mode].postFx, quality)` so a weak phone can never be forced into an expensive arcade bloom.

### A.8 Bottom line for the unified build

Build the renderer once at Simulator fidelity (truthful sail shape, real heel, accurate exposure, both camera rigs). Make Arcade a thin preset (`MODE.arcade`) plus a DOM HUD swap: assists on, instruments hidden, postFX juiced, camera loosened, heel dramatized by one multiplier. Never fork the renderer. This is exactly what prevents a repeat of the V1-2D / V2-shelved split, and it means the Phase 0 POC in section 8 should already carry the `mode` prop (even if only `'sim'` is wired first) so the preset seam exists from day one.

---

## Appendix B - Live-site audit (V1 / V3 / anatomy) and a boat-first reprioritization

Grounded by screenshots of the live deployed site plus the V3 runtime source. The product owner reprioritized: yacht visual + sails + sail mechanics (learn to steer) FIRST, water LATER, targeting eSail-level (orbit the yacht, raise/spread/trim the sails).

### B.1 What is actually live on the site

- **V1 `/simulator`** - pure 2D `<canvas>`, top-down (`getContext('2d')`, `drawHull()` bezier; drag to set heading). Good first-touch teacher, zero 3D, no orbit, no perspective. Shared-lane production, do not touch.
- **V3 `/simulator-v3`** - labeled "V3 - COCKPIT, VPP - trener na zywo" (live-physics trainer). It is NOT 3D: three orthographic SVG projections (top / rear / side via `SceneTop`/`SceneRear`/`SceneSide`). BUT it already runs the full trim engine. Confirmed in code and on screen:
  - `RuntimeState { boat: BoatState, live/target: Controls, lastDiag: TickDiagnostics }` from `@/lib/sailing-physics`.
  - `Controls = { mainSheet, jibSheet, mainTwist, jibTwist, reef, jibFurl, jibSide }` (0..1), rate-limited so the boat responds over ~1.5-3 s instead of snapping.
  - Live on screen: PREDKOSC 6.1 kts, PRZECHYL (heel) -7 deg, AWA 62 deg, TRIM 90%, slot health ("Slot zdrowy - oba zagle ciagna"), GROT/FOK angle + reef (Pelny/R1/R2) + furl (Zwiniecie 100%) + "PRACUJE" (working) status, NO-GO sector, optimum ghost ("Duch optimum"), points of sail (BEJ/GALF/BAK/FORD).
  - `SceneSide` already computes sail-shape geometry: main belly/leech curve, jib luff-leech bezier, telltales, and luffing as alternate flutter paths (idle/f1/f2). The camber/twist/luff math a 3D sail needs is ALREADY solved here in 2D.
- **`/anatomy` `YachtViewer3D`** - the ONE real orbitable 3D yacht. OrbitControls (drag to rotate), 5 presets (3-4 / top / side / bow / stern), auto-rotate, ContactShadows, loads `Andryu_Yacht_v8.glb` (~46 ft: LOA 14 m, beam 4.31 m, draft 2.18 m, mast 20.75 m). On screen: flat matte grey, low detail, FLAT TRIANGLE sails, no envMap, no real shadows, no water/sky. It proves the orbit mechanic works in-stack; it does not prove fidelity.

Correction to section 2: the "no heel anywhere" claim holds for the RACE surfaces (V1/game/multiplayer/replay + `race-physics.ts`) but NOT for V3. V3's `BoatState` carries heel and the engine computes AWA/AoA/forces. V3 is the heel/trim source of truth already.

### B.2 The reframing: you already own the two halves of eSail, separately

- The BODY: an orbitable 3D yacht exists at `/anatomy` (OrbitControls + GLB).
- The BRAIN: the real trim engine exists in V3 (sheet/twist/reef/furl controls, heel, AWA, slot, luff, optimum, plus sail-shape math).

eSail level = marry them: render V3's `BoatState + Controls + TickDiagnostics` through a 3D scene with an orbit camera and 3D sails that raise/reef/furl/trim/luff, instead of (or beside) the SVG. eSail's "right-drag to orbit" is literally drei OrbitControls, which `/anatomy` already has.

### B.3 What actually separates us from eSail (boat + sails)

eSail's quality is ~80% the ASSET, ~20% lighting/shaders. Ranked gaps:

1. **The yacht ASSET.** eSail ships an artist-grade hull (PBR topsides + teak deck + gelcoat), full standing rigging (forestay, backstay, shrouds, spreaders), running rigging, deck hardware (winches, cleats, pulpit/pushpit, stanchions + lifelines), and crucially a RIGGABLE rig: a mainsail on a boom and a furling headsail as SEPARATE meshes that raise/reef/furl. Our v8 GLB is 142 meshes with no normals/UVs and non-riggable flat sails. This single gap is most of the visual delta.
2. **Materials + lighting.** eSail uses IBL/HDRI + tone mapping; `/anatomy` has neither, so it reads matte grey. One self-hosted HDRI + ACES tone mapping closes most of it.
3. **Interactive 3D sails.** eSail's sails change shape with trim and luff head-to-wind. Port V3's already-solved camber/twist/luff math from 2D SVG onto a 3D sail mesh driven by the same `Controls`.
4. **Orbit + zoom + view presets + cockpit.** Cheapest part: drei OrbitControls (have it) + a cockpit camera. eSail's bottom HUD (compass, speed, depth, sail/anchor icons) is a DOM overlay, not 3D.

### B.4 How to get an eSail-grade riggable yacht with our tools (ranked)

- **A. BUY one good rigged yacht** (CGTrader / TurboSquid, ~$20-80, glTF/FBX, sails as separate objects). Fastest, most reliable route to the look. Re-rig pivots in Blender, optimize via gltf-transform.
- **B. SOURCE free**: Sketchfab CC-BY/CC0 sailing yachts (download via Blender MCP), Poly Haven for HDRI + PBR (CC0). Watch licenses (avoid CC-BY-ND/NC for an App Store product; CC-BY needs in-app credit).
- **C. GENERATE**: Hunyuan3D / Hyper3D from a clean reference image, then hand-rig in Blender. Most control over silhouette, most labor; AI fuses sails into the hull, so sails are always built separately anyway.
- **D. UPGRADE v8**: recompute normals/UVs, split sails into named nodes, add PBR. Cheapest, but the base is weak.

Recommendation for "such a level": A or B for the hull + rig; sails ALWAYS built and rigged separately (procedural, so V3 can drive their shape); HDRI + materials from Poly Haven. Never trust a baked sail you cannot deform.

### B.5 Reprioritized roadmap (boat + sails + orbit FIRST, water LAST)

- **Step 1 - Asset**: land ONE rigged hero yacht (buy/source), run `gltfjsx --transform --keepnames` -> `Yacht.tsx` with named nodes `Hull/Mast/Boom/MainSail/Jib/Rudder`. Consolidate the 5 GLBs to one. (M)
- **Step 2 - Showcase scene**: yacht + self-hosted HDRI `<Environment>` + ACES tone mapping + OrbitControls + zoom + view presets, on a SIMPLE flat water plane (water deferred). This alone reaches eSail-grade STATIC look and is orbitable. (S-M)
- **Step 3 - Living sails from the V3 brain**: feed V3 `Controls` + `TickDiagnostics` + heel into the scene. Mainsail/jib raise, reef, furl, trim (camber + per-slice twist ported from `SceneSide`), luff/flutter when AoA < stall; boat heels to PRZECHYL; rudder follows helm. THIS is "see how the sail works, learn to steer", now in 3D. (M-L)
- **Step 4 - Later**: real water (Gerstner + reflections), spray, wake, sky/clouds, Arcade vs Sim modes, mobile tiers. (L)

Net: water (the hardest realism item) moves to the end; the boat + sail learning loop comes first and reuses the V3 engine wholesale.

### B.6 One open decision - where the 3D view lives

(a) replace V3's SVG with the 3D scene; (b) add the 3D scene as a new view toggle inside V3 (keep SVG as the analytic diagram, add a "3D" view); (c) build a fresh V3-lane route. Recommendation: **(b)** - the View pod (WIDOK: Gora / Z tylu / Z boku / Oba) is already a view switcher, so a "3D" button slots right in. The rich 2D diagnostics stay, the 3D body is additive and low-risk, and both read the same V3 state.

### B.7 Existing GLB assets - verdict and sourcing

GLB structural audit (parsed all 5 files in `public/models/`):

| File | Tris | Normals | UV/textures | Sails separate? | Rudder separate? |
|---|---|---|---|---|---|
| v3 Prototype | 7.9k | no | none | YES (Grot/Jib/Boom/Rudder nodes + documented pivots) | yes |
| v3_branded | 7.3k | yes | 1 (logo only) | yes | yes |
| v7_2_visual | 7.8k | no | yes | no (merged by material) | no |
| v7_4 | 11k | no | 3 + vertex colors | yes | hull+deck+rig one mesh |
| **v8** (ships at /anatomy) | 7.8k | **no** | yes (2 tex) | merged by material | **no - rudder fused into keel** |

`asset_metadata_v3.json` self-describes as "advanced prototype, ready for Blender cleanup and engine import", "Bavaria 46 inspired modern cruising sloop", LOA 13.9 m, with documented animated-part pivots (rudder/boom/main/jib yaw origins).

Verdict: the existing models are a competent BLOCKOUT with good naming and documented rig pivots, but NOT eSail-grade and not sufficient for interactive sails. Reasons: (1) 7.7-11k tris is an order of magnitude below eSail-grade detail; there is no modeled deck hardware (winches, stanchions, lifelines, pulpit); (2) the files diverged - the good-looking ones (v8/v7_2) have UVs but NO normals and merged sails / a rudder fused to the keel, while the riggable one (v3 prototype) lacks normals/UVs/PBR; no single file combines rig + normals + PBR. This is exactly why /anatomy reads flat grey with triangle sails. Per the owner's rule ("keep if sufficient, else search") this fails the bar -> source a better model.

Sourcing pass (Sketchfab v3 API, commercial-usable licenses only, CC0/CC-BY): the free pool skews to historical/scanned wooden sloops. Modern-cruiser candidates found, all CC-BY (attribution in `public/models/CREDITS.md`), 0 animations (re-rig sails ourselves anyway), 90-200k faces (web-feasible after gltf-transform Draco/WebP):

- **Sailboat** (177k) - modern white sloop, single mast, closest to the eSail / Bavaria silhouette. https://sketchfab.com/3d-models/sailboat-d59913994a44444b8d054f4de5f519bc
- **Yacht** (118k) - teak-deck sailing yacht, good deck detail. https://sketchfab.com/3d-models/yacht-ae42c1609c25412cbfe40baf9728d987
- **Cruising Sailboat** (93k) - traditional schooner, if a classic look is wanted. https://sketchfab.com/3d-models/cruising-sailboat-76c953c11a0f4698bc5a9bef9d3ff7c7
- Others (Boat 03b tall ship, Trimaran Qarib 6, Plywood Xpress day-sailer) are off-target for a modern monohull trainer.

Caveats: Sketchfab CC download needs a (free) account login or Blender MCP with Sketchfab enabled. For a guaranteed eSail-grade, already-rigged, game-ready modern cruiser, paid marketplaces (CGTrader / TurboSquid, ~$20-90, glTF/FBX with separate sail objects) are the reliable source and worth a dedicated search if budget allows. Recommended: prototype Step 2 with the free "Sailboat" to prove the pipeline, decide on a paid hero model before shipping.