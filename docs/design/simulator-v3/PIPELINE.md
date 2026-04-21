# Simulator V3 - product map and developer pipeline

**Status:** working plan
**Scope:** V3 only
**Constraint:** do not refactor `/game`, `/multiplayer`, V1, V2, or shared site flows as part of this plan
**Primary target:** turn V3 from a static teaching panel into a live, comfortable simulator surface while staying inside the V3 boundary

---

## 1. Executive summary

V3 already has three strong assets:

- a real sail-force core in `src/lib/sailing-physics/`
- a clear cockpit layout concept in `docs/design/simulator-v3/SPEC.md`
- a rich visual scene with top and rear views in `src/app/simulator-v3/page.tsx`

V3 also has one core weakness:

- it behaves like a steady-state solver, not like a simulator session

Today the page recomputes a final settled result on every control change via `settle(...)`, instead of running a persistent live state over time. The result is educationally useful, but weak as a simulator product:

- no sense of inertia
- no sense of control lag
- no sense of transition from bad trim to recovery
- no session loop beyond "move slider, read numbers"
- one route file carrying product state, runtime logic, renderer, commentary, and controls

This plan fixes that without touching the rest of the project. The key move is not "more 3D". The key move is a V3-local runtime layer between UI controls and the shared sailing physics.

---

## 2. Current state snapshot

### What exists now

- Route and all UI in one file:
  - `src/app/simulator-v3/page.tsx`
- Shared force-balance engine:
  - `src/lib/sailing-physics/`
- Top view scene:
  - `SceneTop`
- Rear view scene:
  - `SceneRear`
- Control pods:
  - `WindPod`
  - `MainPod`
  - `JibPod`
  - `ViewPod`
- Metrics and commentary:
  - `MetricsStrip`
  - `CommentaryLine`

### What is structurally wrong today

- The route file is too large and mixes too many responsibilities.
- Runtime behavior is implicit inside `useMemo`, not explicit inside a simulation loop.
- Input changes jump straight to solved output instead of flowing through a state transition.
- Product surface is mostly "trim panel with rich illustration", not "live simulator session".

### What we should preserve

- current visual language
- current pod-based information density
- current glossary idea
- current top/rear dual-view concept
- shared sailing physics as the aero/hydro core

### What we should replace

- `settle-on-every-change` as the main runtime model
- a single giant route file as the implementation shape
- "course presets + optim button" as the whole session loop

---

## 3. Product map

This is the product definition for V3 only. It does not assume a rewrite of the rest of the app.

### 3.1 Product promise

V3 should teach one thing clearly:

- how helm, wind angle, sail trim, and heel change over time, not only in a final solved state

### 3.2 Target users

#### User A - novice sailor

Needs:

- understand what the boat is doing
- avoid overload
- see one clear cause and one clear effect

What matters:

- stable default state
- readable visuals
- obvious "bad -> better" recovery loop

#### User B - improving club sailor

Needs:

- practice trim and heading changes repeatedly
- understand slot, stall, heel, and leeway in one place

What matters:

- live response
- easy reset
- guided drills

#### User C - technically curious user

Needs:

- inspect apparent wind, AoA, drive, side force, VMG logic

What matters:

- visible diagnostics
- reproducible scenario presets
- no fake or contradictory feedback

### 3.3 Core product modes

V3 should become one route with three internal modes, in this order:

1. **Free Sail**
   - default mode
   - live sandbox
   - users steer, trim, reef, furl, swap view

2. **Guided Drill**
   - one goal at a time
   - examples:
     - recover from overtrim
     - reduce heel with reef
     - find fast upwind trim
     - open the slot correctly

3. **Scenario**
   - short constrained setup
   - examples:
     - beam reach in 12 kts
     - overpowered close-hauled in 22 kts
     - broad reach with bad jib trim

Do not start with race mode inside V3. That is scope creep.

### 3.4 Core user loop

The V3 loop should be:

1. enter a scenario or free sail
2. see the boat already moving
3. make one control change
4. watch live transition
5. get one short explanation
6. improve result
7. reset or move to the next drill

If any step requires reading too much text or scrolling, the loop is broken.

### 3.5 Information hierarchy

Always visible:

- scene
- current mode
- speed
- heel
- AWA
- trim quality
- one primary feedback line

Second layer:

- main and jib state
- wind controls
- view controls

On demand only:

- glossary
- advanced diagnostics
- scenario details

### 3.6 Success criteria

Product success for V3 is not "looks impressive". It is:

- user can recover from a bad trim state without leaving the viewport
- user sees the difference between top and rear view immediately
- the page feels alive within 5 seconds
- default state feels healthy, not stalled
- controls remain usable on mobile

### 3.7 Non-goals

Do not put these in the first V3 rebuild:

- full race loop
- multiplayer inside V3
- asset pipeline work in Blender
- rigid-body ocean physics
- advanced sail wardrobe
- broad platform refactor outside the V3 folder and V3 feature module

---

## 4. Product surface map

### 4.1 Main screen layout

Keep the cockpit concept, but define clearer zones:

- **Scene zone**
  - top view or rear view
  - main teaching surface

- **Control zone**
  - wind
  - main
  - jib
  - mode
  - optional helm card

- **Outcome zone**
  - metrics strip
  - commentary line
  - drill goal or scenario goal

### 4.2 Scene requirements

Top view must answer:

- where wind comes from
- where boat points
- where sails are now
- what the optimum roughly is
- whether force is building or dying

Rear view must answer:

- why heel is happening
- whether heel is manageable
- whether reefing helped

### 4.3 Control model

Current control model is trim-heavy. V3 needs one extra concept:

- **heading intent**

The user should be able to change heading as a target, not only set a static TWA snapshot. This can still be implemented locally inside V3 without changing the shared engine:

- V3 runtime stores heading target
- V3 runtime moves current heading toward target over time
- runtime calls shared `tick()` using the evolving heading state

That one change is enough to make the simulator feel temporal.

### 4.4 Feedback model

Every moment should expose one of four states:

- healthy
- edge
- warning
- critical

And the primary feedback line should always choose only one message:

- what is wrong or right
- what to do next

No list. No paragraph.

---

## 5. Technical target architecture

## 5.1 Principle

Keep the shared sailing engine as the physics core, but build a V3-local runtime around it.

### 5.2 Required split

Current implementation shape:

- one route file doing everything

Target implementation shape:

```text
src/
  features/
    simulator-v3/
      runtime/
        create-runtime.ts
        runtime-types.ts
        step-runtime.ts
        scenario-presets.ts
        feedback.ts
        trim-heuristics.ts
      hooks/
        use-simulator-v3.ts
      ui/
        SimulatorV3Screen.tsx
        SceneTop.tsx
        SceneRear.tsx
        SceneOverlayLabels.tsx
        GlossaryFooter.tsx
        pods/
          WindPod.tsx
          MainPod.tsx
          JibPod.tsx
          ViewPod.tsx
          HelmPod.tsx
        panels/
          MetricsStrip.tsx
          CommentaryLine.tsx
          DrillCard.tsx
  app/
    simulator-v3/
      page.tsx
```

`page.tsx` should become a thin route shell that mounts the V3 feature.

### 5.3 Runtime layers

#### Layer A - shared physics core

Source:

- `src/lib/sailing-physics/`

Role:

- apparent wind
- AoA
- stall
- sail forces
- heel
- leeway
- boat speed

Do not duplicate this logic inside V3.

#### Layer B - V3 runtime wrapper

New V3-only layer.

Role:

- own persistent runtime state
- apply control targets over time
- move heading toward heading target
- optionally apply small wind variation
- manage pause/reset/session time
- output stable data for scene + pods + metrics + drills

#### Layer C - presentational UI

Role:

- render state
- send user intents
- never solve physics directly

### 5.4 V3 runtime state

Suggested shape:

```ts
interface V3RuntimeState {
  simTime: number;
  paused: boolean;

  boat: BoatState;
  controls: Controls;

  targets: {
    heading: number;
    mainAngle: number;
    jibAngle: number;
    reefLevel: 0 | 1 | 2;
    jibFurlPct: number;
  };

  ui: {
    view: "top" | "rear";
    sailsRaised: "both" | "main" | "jib";
    showOptimal: boolean;
    mode: "free" | "drill" | "scenario";
    diagnosticsOpen: boolean;
  };

  session: {
    scenarioId: string | null;
    drillId: string | null;
    score: number | null;
    lastImprovementAt: number | null;
  };

  derived: {
    trimScore: number;
    optimal: OptimalTrim;
    feedback: PrimaryFeedback;
  };
}
```

### 5.5 Runtime stepping model

Replace the current solve-on-change pattern with:

1. create initial state once
2. run `requestAnimationFrame`
3. convert real frame delta to fixed-step simulation loop
4. on each fixed step:
   - move heading toward target heading
   - move control values toward target values
   - map V3 local state to shared `Controls`
   - call shared `tick()`
   - compute derived diagnostics
5. render latest state

Recommended fixed step:

- `dt = 1 / 30` or `1 / 20`

Recommended behavior:

- render can be 60 fps
- sim can step at lower fixed rate
- never bind physics directly to React render frequency

### 5.6 Why this is enough

Even without touching the rest of the project, this local runtime gives:

- inertia feel
- visible transitions
- recoverability
- better drill design
- less UI jank

---

## 6. Implementation pipeline

Each phase should land end to end and remain V3-scoped.

## Phase 0 - baseline and contracts

### Goal

Lock the behavioral definition of V3 before writing code.

### Tasks

- define 5 to 7 behavioral contracts for V3
- define test scenarios and manual QA script
- freeze scope for the first shipping pass

### Required contracts

At minimum:

1. default beam reach opens in a healthy state
2. overtrim reduces drive within visible live transition
3. reefing in heavy air lowers heel within visible live transition
4. top and rear views show the same state, not different simulations
5. reset restores the scenario exactly
6. mobile layout keeps scene + primary controls visible

### Attention points

- do not start refactoring before these contracts are written
- use PATTERNS D1 language: behavior, not appearance

### Exit criteria

- documented behavior checklist exists in this folder
- team agrees what "done" means for V3

## Phase 1 - codebase split without behavior change

### Goal

De-risk the current 1500-line page before new runtime work.

### Tasks

- extract UI and helper functions from `src/app/simulator-v3/page.tsx`
- keep existing behavior identical
- route becomes shell only

### Suggested extraction order

1. glossary
2. metrics + commentary
3. pods
4. scenes
5. trim heuristics and feedback
6. root screen composition

### Attention points

- no visual rewrite in this phase
- no runtime rewrite in this phase
- keep imports clean and local
- keep V3-only files under a single feature folder

### Exit criteria

- no behavior change
- `page.tsx` is thin
- scene and pods are isolated components

## Phase 2 - V3 local runtime

### Goal

Introduce persistent live state without changing the shared engine contract.

### Tasks

- create `use-simulator-v3.ts`
- create runtime state and reducer or state machine
- add fixed-step loop
- replace `useMemo(settle(...))` with persistent stepping
- retain current metrics, commentary, and view modes

### Recommended rules

- controls should update targets instantly
- actual boat state should move toward those targets over time
- reset must be deterministic

### Attention points

- avoid stale React closures in the runtime loop
- avoid frame-delta chaos on background tab resume
- cap accumulated lag so returning to tab does not simulate 30 seconds instantly
- keep runtime ownership outside the visual components

### Exit criteria

- boat speed, heel, and AWA evolve over time
- no more full re-solve on every control change
- top and rear views both read one live runtime state

## Phase 3 - control model redesign

### Goal

Make V3 feel like a simulator session, not a parameter board.

### Tasks

- add heading target control
- decide whether heading lives in Wind pod or new Helm pod
- keep trim controls
- keep tack flip only as helper, not primary interaction
- preserve quick preset buttons for onboarding

### Preferred interaction model

- user nudges heading target
- runtime turns toward it over time
- user trims sails while the boat settles

### Attention points

- do not overload the first shipping version with full rudder hydrodynamics
- a simple target-heading model is enough for V3 phase one
- keep keyboard affordance if possible

### Exit criteria

- user can create a heading change and watch the boat adapt over time
- trimming now feels like response to motion, not isolated input math

## Phase 4 - drills and scenarios

### Goal

Give V3 a repeatable product loop.

### Tasks

- add `Free Sail`, `Guided Drill`, `Scenario`
- add 4 to 6 scenario presets
- add simple scoring for drills
- add success condition and reset

### Suggested first drills

1. ease the main until stall disappears
2. recover slot health
3. take reef and reduce heel below target
4. find fast beam reach trim

### Suggested first scenarios

1. beam reach, 12 kts, healthy baseline
2. close-hauled, 22 kts, overpowered
3. broad reach, overtrimmed jib
4. running, jib partially furled

### Attention points

- each drill should teach one concept
- avoid mixed goals like "fix trim and hit VMG and reduce heel"
- scenario copy must be short and localizable

### Exit criteria

- V3 can be used repeatedly, not only explored once
- users have a reason to stay beyond 30 seconds

## Phase 5 - feedback and pedagogy polish

### Goal

Make the simulator understandable under load.

### Tasks

- rewrite feedback priority rules
- add temporal feedback triggers
- show what changed, not only current state
- define tone ladder: healthy, edge, warning, critical

### Examples of better feedback

- "Main recovered, drive is building"
- "Heel still rising, reef now"
- "Jib opened too far, slot is collapsing"

### Attention points

- avoid chatty AI tone
- feedback must be causal, short, and testable
- never show two equally important messages at once

### Exit criteria

- feedback line remains readable in motion
- messages are consistent with metrics and scene state

## Phase 6 - visual polish on top of correct runtime

### Goal

Polish only after live behavior is correct.

### Tasks

- motion polish
- better transition handling
- stronger wake and force readouts
- mobile spacing refinement
- rear-view clarity refinement

### Attention points

- this phase must not become a hidden substitute for missing runtime work
- every polish item must point to a solved behavior underneath

### Exit criteria

- V3 feels coherent and intentional on both desktop and mobile

## Phase 7 - verification and release

### Goal

Ship V3 with honest QA.

### Tasks

- browser test on mobile and desktop
- verify performance and interaction latency
- verify all scenario resets
- verify language coverage for visible V3 UI
- verify default state health

### Manual QA matrix

- 375x812 mobile
- 430x932 large mobile
- 1024x768 tablet
- 1440x900 desktop

### Required flows

1. open default state
2. overtrim and recover
3. toggle top/rear while underway
4. reef in heavy air
5. run one drill and reset
6. switch language and confirm V3-local UI strings

### Exit criteria

- no broken flows in the matrix above
- no contradiction between scene, metrics, and feedback

---

## 7. Developer attention points

These are the traps most likely to waste time or lower quality.

### 7.1 Do not confuse "live visuals" with "live simulation"

Animating the SVG while still solving with `settle(...)` will look better but remain weak.

### 7.2 Do not bind runtime to React re-render

The runtime loop should own simulation stepping. React should render snapshots.

### 7.3 Do not refactor shared physics just to make V3 easier

First build the V3 wrapper around the current engine. Shared engine changes should only happen if V3 hits a real wall.

### 7.4 Do not start with a big visual redesign

The current V3 art direction is already good enough to support a stronger product.

### 7.5 Do not keep all logic in route files

V3 will continue to slow down if route-level files remain the product boundary.

### 7.6 Keep deterministic reset behavior

If scenario reset is fuzzy, drills become impossible to trust.

### 7.7 Maintain one source of truth for feedback

Metrics, pod states, and commentary must derive from the same diagnostics.

### 7.8 Be careful with mobile overlap

Corner pods are powerful, but easy to overfill. If Helm controls are added, mobile may need a compact bottom sheet or tabbed pod instead of one more corner card.

### 7.9 Respect existing project rules

- no em dash or en dash
- no V3 strings outside the i18n pattern already used by the project
- no accidental spill into unrelated routes

---

## 8. Behavioral contracts for implementation

These are the recommended V3 contracts to use during development.

1. **Healthy default**
   - Opening V3 in default scenario shows both sails working, trim above 80%, and no critical feedback.

2. **Live overtrim**
   - Pulling main trim too hard on beam reach produces a visible drop in drive and speed over a short live transition, not an instant final jump.

3. **Live reef recovery**
   - In heavy air, taking one reef lowers heel over time while preserving forward motion.

4. **Single-state rendering**
   - Top and rear views always represent the same runtime snapshot.

5. **Scenario reset**
   - Reset returns boat, trim, wind, and derived state to the same baseline every time.

6. **Readable primary feedback**
   - Commentary always shows one message that matches scene and metrics.

7. **Mobile survivability**
   - On mobile, users can read the scene and operate primary controls without scroll-driven context loss.

---

## 9. Suggested delivery order for the team

If one developer works alone:

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7

If two developers work in parallel:

- Dev A:
  - Phase 1
  - Phase 2
  - Phase 3

- Dev B:
  - drill/scenario definitions
  - feedback copy and priority table
  - QA checklist and test scenarios

Merge only after Phase 2 runtime contracts are stable.

---

## 10. Final recommendation

For V3, the correct next move is:

- **not** a broader site refactor
- **not** a new 3D asset push
- **not** more cockpit cosmetics first

The correct move is:

- split V3 into a feature module
- build a V3-local live runtime
- add heading intent and repeatable drills
- polish only after the live loop is correct

That path stays inside V3, respects current project constraints, and gives the largest jump in product quality for the least architectural blast radius.
