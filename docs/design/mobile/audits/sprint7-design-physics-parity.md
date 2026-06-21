# Sprint 7 design and physics parity audit

Date: 2026-05-13
Branch: `app`

## Why build 8 still felt flat

The app had the VPP engine and a layered Skia yacht, but the visual layer did
not yet match the web product.

1. Web `/anatomy` uses `YachtViewer3D` with `/public/models/Andryu_Yacht_v8.glb`
   plus two finished anatomy poster sets. Mobile `/anatomy` used a top photo and
   a vector hotspot poster only.
2. Web `/simulator-v3` shows labeled wind sectors, force vectors, wake, sail
   belly, battens, main and jib distinction, and visual feedback. Mobile
   `/simulator` showed a small top-down sprite with weak sail contrast.
3. Mobile free mode drew a decorative green zigzag course and three buoys even
   when the user was not in a mission. That looked like a broken movement line.
4. Mobile switched to `spinnaker` by hiding the main and jib, so on broad reach
   and run the user lost the normal sail shapes.
5. The wordmark had tight line heights, so native text rendering could clip it
   on device fonts.

## Shipped in this pass

1. Removed the free-mode green zigzag. Mission marks still appear only in
   mission mode. Free mode now keeps only wind map, actual track, wake, no-go
   cone, apparent wind and the boat.
2. Enlarged the simulator yacht from 30/36 px half-length to 48/56 px
   half-length. This makes sail geometry readable on phone screens.
3. Reworked `SkiaYacht` sail geometry:
   - taller main and jib
   - stronger sail outlines
   - battens and sail detail strokes
   - spinnaker seam
   - deck detail lines
   - main remains visible with spinnaker
   - reef reduces main height
   - twist opens the sail shape visually
4. Added a real wake path behind the moving boat and lowered track opacity so
   track and wake read as different things.
5. Added compact scene legend for `WIND MAP` and `TRACK`.
6. Bundled the web anatomy posters into mobile assets and added a native poster
   gallery/lightbox on `/anatomy` for RU and EN.
7. Fixed wordmark line heights and removed wordmark letter spacing so the logo
   is not clipped by native font metrics.
8. Added simulator view modes:
   - `Top`: original interactive map with steering and wind compass
   - `Side`: yacht profile with mast, boom, main, jib, spinnaker, keel, rudder,
     wake, drive arrow, reef and twist readouts
   - `Rear`: heel/side-force view that makes roll and leeway easier to see
9. Added wind map modes:
   - `Steady`: fixed wind field
   - `Shift`: true wind direction oscillates around the selected base heading
   - `Gust`: wind speed pulses above the selected base speed and the gust band
     is visible in the scene

## Remaining product gaps

1. True 3D in the mobile simulator is not implemented. The app still uses Skia
   2D, while web has GLB assets. A proper mobile 3D pass needs either
   `expo-gl` with a Three.js adapter or a pre-rendered sprite/turntable
   pipeline from the GLB.
2. Wind map is still pedagogical, not meteorological. It now has steady, shift
   and gust modes, but it does not yet model multiple gust cells or local
   gradients.
3. Physics has real VPP sail forces, heel, leeway, slot and stall, but screen
   movement is still a simplified 2D integrator. Rudder hydrodynamics, inertia
   and current are not first-class.
4. Side/rear views are visual teaching projections, not separate physics
   engines. They read from the same VPP diagnostics.
5. App Store screenshots still need real iPhone capture after the next
   TestFlight build.

## Recommended next sprint

1. Add force-vector overlays and sail working sectors to the new `Top` view.
2. Decide 3D path: GLB runtime on device or baked yacht sprite atlas generated
   from `Andryu_Yacht_v8.glb`.
3. Add dedicated drills for shift and gust response.
4. Add real-device QA: iPhone SE FPS, iPhone 15 screenshot pass, font scaling at
   135 percent.
