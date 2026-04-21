# Simulator V3 - engineering backlog

**Status:** PR-1..PR-4 shipped on `main`. PR-5 partial. PR-6 open.
**Scope:** V3 only
**Related docs:**

- `PIPELINE.md` - product map and delivery phases
- `SPEC.md` - cockpit layout and interaction reference
- `README.md` - current status snapshot

This file translates the V3 plan into concrete PR-sized work for developers.

---

## 1. Delivery model

The safest sequence is:

1. PR-1: split current V3 code without changing behavior **[done, 7523d59]**
2. PR-2: introduce V3-local runtime loop **[done, d5ca577]**
3. PR-3: add heading-intent control model **[done, 22e914a]**
4. PR-4: add drills and scenarios **[done, fae1ee4]**
5. PR-5: feedback and UX polish **[partial - drill result visuals + NaN guards done; feedback taxonomy rewrite open]**
6. PR-6: QA hardening and release cleanup **[open]**

Do not combine PR-1 and PR-2. The route file is too large today, and runtime work on top of it will become noisy and hard to review.

---

## 2. Current code to break apart

Current monolith:

- `src/app/simulator-v3/page.tsx`

Current subareas inside that file:

- state and simulation model
- trim heuristics
- feedback selection
- top scene
- rear scene
- scene overlays
- control pods
- metrics strip
- commentary line
- glossary

These should become a feature module before behavior changes land.

---

## 3. Target file map

```text
src/
  app/
    simulator-v3/
      page.tsx
  features/
    simulator-v3/
      index.ts
      SimulatorV3Page.tsx
      runtime/
        runtime-types.ts
        create-runtime-state.ts
        step-runtime.ts
        scenario-presets.ts
        trim-heuristics.ts
        feedback.ts
      hooks/
        use-simulator-v3.ts
      ui/
        SceneTop.tsx
        SceneRear.tsx
        SceneOverlayLabels.tsx
        GlossaryFooter.tsx
        MetricsStrip.tsx
        CommentaryLine.tsx
        shared.tsx
        pods/
          WindPod.tsx
          MainPod.tsx
          JibPod.tsx
          ViewPod.tsx
          HelmPod.tsx
        panels/
          ModeBar.tsx
          DrillCard.tsx
```

`HelmPod.tsx`, `ModeBar.tsx`, and `DrillCard.tsx` do not need to exist in PR-1.

---

## 4. PR backlog

## PR-1 - V3 module split, no behavior change

### Goal

Move V3 out of a single route file and into a feature folder without changing runtime behavior.

### Files to add

- `src/features/simulator-v3/index.ts`
- `src/features/simulator-v3/SimulatorV3Page.tsx`
- `src/features/simulator-v3/runtime/trim-heuristics.ts`
- `src/features/simulator-v3/runtime/feedback.ts`
- `src/features/simulator-v3/ui/SceneTop.tsx`
- `src/features/simulator-v3/ui/SceneRear.tsx`
- `src/features/simulator-v3/ui/SceneOverlayLabels.tsx`
- `src/features/simulator-v3/ui/GlossaryFooter.tsx`
- `src/features/simulator-v3/ui/MetricsStrip.tsx`
- `src/features/simulator-v3/ui/CommentaryLine.tsx`
- `src/features/simulator-v3/ui/shared.tsx`
- `src/features/simulator-v3/ui/pods/WindPod.tsx`
- `src/features/simulator-v3/ui/pods/MainPod.tsx`
- `src/features/simulator-v3/ui/pods/JibPod.tsx`
- `src/features/simulator-v3/ui/pods/ViewPod.tsx`

### Files to change

- `src/app/simulator-v3/page.tsx`

### Work items

1. Move the root component into `src/features/simulator-v3/SimulatorV3Page.tsx`.
2. Leave `src/app/simulator-v3/page.tsx` as a thin route wrapper.
3. Extract pure helpers:
   - `recommendedTrim`
   - `pickPrimaryFeedback`
   - math helpers that are V3-specific
4. Extract visual subcomponents with the same props shape as today.
5. Keep `DEFAULT_UI`, `UiState`, and `SimulationModel` unchanged in behavior.

### Must not change

- no new runtime loop
- no new controls
- no visual redesign
- no string rewrite wave

### Acceptance criteria

- route still looks and behaves the same
- reviewer can read scene code separately from runtime helpers
- `page.tsx` becomes a small shell

### Review focus

- imports are clean
- no circular dependencies
- V3-specific logic is not pushed into shared physics

---

## PR-2 - Introduce V3 live runtime

### Goal

Replace `useMemo(settle(...))` with a persistent runtime loop while keeping the same visible surface.

### Files to add

- `src/features/simulator-v3/runtime/runtime-types.ts`
- `src/features/simulator-v3/runtime/create-runtime-state.ts`
- `src/features/simulator-v3/runtime/step-runtime.ts`
- `src/features/simulator-v3/hooks/use-simulator-v3.ts`

### Files to change

- `src/features/simulator-v3/SimulatorV3Page.tsx`
- `src/features/simulator-v3/runtime/trim-heuristics.ts`
- `src/features/simulator-v3/runtime/feedback.ts`

### Work items

1. Define runtime state:
   - sim time
   - boat state
   - live controls
   - target controls
   - UI state
   - derived diagnostics
2. Create deterministic initial state factory.
3. Add fixed-step simulation loop:
   - recommended `dt = 1/30`
   - cap accumulated frame lag
4. On each step:
   - move current controls toward targets
   - call shared `tick()`
   - recompute optimal trim and feedback
5. Update the screen to render runtime snapshots instead of memoized solved snapshots.

### Must not change

- no new modes yet
- no new layout system
- no scenarios yet

### Acceptance criteria

- changing trim produces a live transition, not an instant jump
- top and rear views stay synchronized
- reset returns to the same baseline
- performance is stable on desktop and mobile

### Review focus

- runtime loop does not depend on React render cadence
- no stale closure bugs
- no hidden `settle(...)` path remains in the main render flow

---

## PR-3 - Heading-intent control model

### Goal

Add steering feel without building full rudder physics.

### Files to add

- `src/features/simulator-v3/ui/pods/HelmPod.tsx`

### Files to change

- `src/features/simulator-v3/runtime/runtime-types.ts`
- `src/features/simulator-v3/runtime/create-runtime-state.ts`
- `src/features/simulator-v3/runtime/step-runtime.ts`
- `src/features/simulator-v3/SimulatorV3Page.tsx`
- `src/features/simulator-v3/ui/pods/WindPod.tsx`
- `src/features/simulator-v3/ui/pods/ViewPod.tsx`

### Work items

1. Add heading target into runtime state.
2. Add simple turn-toward-target behavior:
   - current heading moves toward target heading with rate limit
3. Decide final UI placement:
   - preferred: separate `HelmPod`
   - acceptable first pass: compact heading control inside `ViewPod`
4. Keep existing course presets, but map them to heading or TWA targets.
5. Preserve tack helper, but demote it from primary interaction.

### Must not change

- no full rudder hydrodynamics
- no race course logic
- no external route changes

### Acceptance criteria

- user can change heading and watch the boat adapt over time
- trim becomes something you respond with, not just a static parameter
- default state remains easy to understand

### Review focus

- turn behavior feels smooth, not twitchy
- steering model is simple and explainable
- mobile controls remain usable

---

## PR-4 - Product loop: Free Sail, Drill, Scenario

### Goal

Give V3 repeatable sessions and goals.

### Files to add

- `src/features/simulator-v3/runtime/scenario-presets.ts`
- `src/features/simulator-v3/ui/panels/ModeBar.tsx`
- `src/features/simulator-v3/ui/panels/DrillCard.tsx`

### Files to change

- `src/features/simulator-v3/runtime/runtime-types.ts`
- `src/features/simulator-v3/runtime/create-runtime-state.ts`
- `src/features/simulator-v3/runtime/step-runtime.ts`
- `src/features/simulator-v3/SimulatorV3Page.tsx`

### Work items

1. Add internal modes:
   - free
   - drill
   - scenario
2. Add first scenario set:
   - beam reach healthy baseline
   - overpowered close-hauled
   - overtrimmed main
   - bad jib slot
3. Add first drills:
   - recover from main stall
   - reduce heel with reef
   - open the slot
   - hold trim above threshold for N seconds
4. Add simple score or pass/fail state.
5. Add deterministic reset per mode.

### Must not change

- no leaderboard
- no persistence outside V3 local state
- no cross-route dependencies

### Acceptance criteria

- V3 now has repeatable exercises
- each drill teaches one concept
- reset works reliably

### Review focus

- mode boundaries are clean
- scenario definitions are data, not UI hardcode
- drill evaluation uses the same diagnostics as feedback

---

## PR-5 - Feedback rewrite and UX polish

### Goal

Make the simulator readable under motion.

### Files to change

- `src/features/simulator-v3/runtime/feedback.ts`
- `src/features/simulator-v3/ui/CommentaryLine.tsx`
- `src/features/simulator-v3/ui/MetricsStrip.tsx`
- `src/features/simulator-v3/ui/SceneTop.tsx`
- `src/features/simulator-v3/ui/SceneRear.tsx`
- `src/features/simulator-v3/ui/pods/MainPod.tsx`
- `src/features/simulator-v3/ui/pods/JibPod.tsx`

### Work items

1. Rewrite feedback priority table around four levels:
   - healthy
   - edge
   - warning
   - critical
2. Add delta-sensitive messaging where useful:
   - improving
   - worsening
3. Tighten metrics emphasis so the eye goes to:
   - speed
   - heel
   - AWA
   - trim
4. Refine rear-view readability.
5. Improve mobile spacing if HelmPod made the layout crowded.

### Must not change

- no new runtime model
- no new scenario system shape

### Acceptance criteria

- commentary remains short and trustworthy
- no contradictory state between pod badges, metrics, and commentary
- rear view explains heel better than top view

### Review focus

- every message has a causal basis
- no "AI fluff"
- no overloaded mobile UI

---

## PR-6 - QA hardening and release prep

### Goal

Stabilize V3 for shipping.

### Files to change

- V3 files as needed for fixes
- V3 docs in `docs/design/simulator-v3/`

### Work items

1. Add V3 QA checklist to docs if needed.
2. Run browser checks on:
   - mobile
   - tablet
   - desktop
3. Verify:
   - default state
   - trim recovery
   - reef recovery
   - top/rear sync
   - reset determinism
   - drill completion
4. Clean up dead helpers left from the old page shape.
5. Update V3 docs to match shipped reality.

### Acceptance criteria

- no major V3 contradictions
- no dead code path to old solve-on-change behavior
- docs reflect actual V3 behavior

### Review focus

- honest QA coverage
- no stale docs
- no hidden regression in the V3-only surface

---

## 5. Task breakdown by developer role

## Runtime owner

Primary files:

- `runtime-types.ts`
- `create-runtime-state.ts`
- `step-runtime.ts`
- `use-simulator-v3.ts`

Responsibilities:

- deterministic state model
- fixed-step loop
- control interpolation
- heading target logic
- scenario reset behavior

Watch for:

- stale closures
- frame spikes after tab inactivity
- mixing UI state with runtime state unnecessarily

## UI owner

Primary files:

- `SimulatorV3Page.tsx`
- `SceneTop.tsx`
- `SceneRear.tsx`
- `SceneOverlayLabels.tsx`
- `MetricsStrip.tsx`
- `CommentaryLine.tsx`
- `pods/*`

Responsibilities:

- rendering runtime snapshots
- responsive layout
- visual hierarchy
- compact mobile interactions

Watch for:

- overfilling mobile corner pods
- visual changes that hide runtime problems
- making rear view prettier but less legible

## Content and feedback owner

Primary files:

- `feedback.ts`
- `scenario-presets.ts`
- `DrillCard.tsx`

Responsibilities:

- scenario copy
- drill design
- feedback priority rules
- success criteria per drill

Watch for:

- teaching too many concepts at once
- generic text not tied to diagnostics
- messages that conflict with on-screen numbers

## QA owner

Primary files:

- V3 docs
- browser test notes

Responsibilities:

- behavioral contract verification
- device matrix check
- deterministic reset verification
- visible-state consistency

Watch for:

- assuming animation means simulation correctness
- desktop-only validation
- stale doc claims after behavior changes

---

## 6. Starter checklist for the first implementation wave

This is the exact starting sequence I would recommend.

### Step 1

Create the feature folder and move the route shell.

### Step 2

Extract the following first:

- `SceneTop`
- `SceneRear`
- `MetricsStrip`
- `CommentaryLine`
- `GlossaryFooter`

Reason:

- these have the clearest boundaries
- extracting them reduces route-file weight fast

### Step 3

Extract pods and shared pod primitives:

- `PodCard`
- `PodLabel`
- `PodSlider`
- `PodSegmented`
- `StatusDot`

### Step 4

Extract runtime helpers:

- `recommendedTrim`
- `pickPrimaryFeedback`
- V3 math helpers

### Step 5

Only after the split is merged, start the live runtime PR.

---

## 7. Definition of done per PR

Each PR is done only if:

- changed files match the declared scope
- V3 still works in browser
- mobile layout was checked
- no em dash or en dash was introduced
- docs remain truthful for the touched V3 area

In addition:

- PR-1 done = same behavior, smaller structure
- PR-2 done = live runtime exists
- PR-3 done = heading intent exists
- PR-4 done = repeatable drills/scenarios exist
- PR-5 done = feedback is stable and legible
- PR-6 done = V3 can ship honestly

---

## 8. Recommended issue list

If this is entered into an issue tracker, create these tickets:

1. `V3-01 Split simulator-v3 route into feature module`
2. `V3-02 Add V3 runtime state and fixed-step simulation hook`
3. `V3-03 Replace settle-on-change with persistent live stepping`
4. `V3-04 Add heading target control to V3`
5. `V3-05 Add Free Sail / Drill / Scenario mode bar`
6. `V3-06 Create first 4 scenario presets`
7. `V3-07 Create first 4 guided drills`
8. `V3-08 Rewrite V3 feedback priority model`
9. `V3-09 Improve mobile layout after HelmPod`
10. `V3-10 V3 QA pass across mobile/tablet/desktop`

---

## 9. Recommendation

The first real coding PR should be PR-1 only:

- split the file
- preserve behavior
- make PR-2 possible

That is the lowest-risk start and gives the team a clean base for the actual simulator upgrade.
