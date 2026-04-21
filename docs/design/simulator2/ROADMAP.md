# Simulator2 roadmap

**Status:** proposed
**Scope:** `/simulator2` only
**Goal:** evolve V2 from a basic 3D preview into a browser-first premium 3D sailing and race surface

---

## 1. Executive summary

The reference style is feasible in the browser. It does not require a native mobile app first.

The right product split is:

- `V3` = teaching trainer, trim, heel, slot, diagnostics
- `V2` = premium 3D chase-camera sailing and race view
- `/game` = donor of race shell ideas, marks, minimap, AI, countdowns

The key recommendation is:

- do **not** push this visual direction into V3
- do **not** start with a large shared-runtime refactor
- build a strong V2 first, then extract shared runtime only if the duplication becomes painful

---

## 2. Where I agree and where I disagree

### Agree

- The visual target belongs to V2, not V3.
- Browser delivery is realistic.
- Current V3 runtime already proves that live maneuver timing is possible.
- Current `/game` already contains useful race mechanics and HUD ideas.

### Disagree

- A large `sim-runtime` extraction should not be the first move.
- "2-3 days to VR-class" is too optimistic if that includes water, camera, HUD, marks, other boats, and acceptable mobile performance.
- Mobile 60 fps should not be promised before profiling. It is possible on good devices, but not something to lock in up front.

### Bottom line

The strategic direction is right. The execution order needs to be stricter.

---

## 3. Current project state

### Existing V2

Files:

- `src/app/simulator2/page.tsx`
- `src/app/simulator2/SailingScene.tsx`

Current role:

- procedural yacht
- basic water shader
- sky
- orbit camera
- simple HUD
- solved state, not strong race feel

Current weakness:

- the page still computes a static settled result via `settle(...)`
- camera language is demo-like, not game-like
- there is no race shell
- there are no visible opponents or marks

### Existing V3 runtime

Files:

- `src/features/simulator-v3/hooks/use-simulator-v3.ts`
- `src/features/simulator-v3/runtime/create-runtime-state.ts`
- `src/features/simulator-v3/runtime/step-runtime.ts`
- `src/features/simulator-v3/runtime/runtime-types.ts`

What matters:

- persistent runtime
- fixed-step loop
- live control interpolation
- target heading and turn rate
- trim changes over time

### Existing game donor logic

File:

- `src/app/game/GameClient.tsx`

Useful systems already present there:

- start and finish lines
- mark logic
- minimap
- arrow to next objective
- leaderboard ideas
- AI boat movement
- replay and race progression patterns

---

## 4. Product definition for V2

V2 should become:

- a 3D sailing surface first
- a race surface second
- a premium visual counterpart to V3

V2 should answer:

- what does the boat feel like in motion
- what does a tack or gybe look like
- how fast am I going
- where am I relative to the course and competitors

V2 should **not** become:

- the deep trim explanation surface
- the glossary-heavy trainer
- the place where slot and AoA are the main story

That remains V3.

---

## 5. Architecture recommendation

## 5.1 Do not start with a big refactor

Do this first:

- build a V2 visual spike using the existing file boundary

Do this later if needed:

- extract a shared runtime between V2 and V3

Reason:

- V2 still needs visual and camera language validation
- early refactor increases scope before the shape of the 3D experience is proven

## 5.2 Runtime strategy

Phase 1 and 2:

- V2 can temporarily own a local live-runtime hook derived from the V3 runtime pattern

Phase 3 or 4:

- once V2 is visually and behaviorally correct, move the shared pieces into a neutral module

Candidate future location:

- `src/lib/sim-runtime/`

But that should be earned, not assumed.

## 5.3 Rendering strategy

Keep Three.js / React Three Fiber. It is already in place and is enough for this target.

What to improve:

- camera rig
- better stylized water
- wake and foam
- environment silhouettes
- more intentional boat model and sail shape
- race overlays

What to avoid at first:

- ultra-heavy ocean shaders
- complex post-processing chain
- expensive reflections
- too many dynamic lights

---

## 6. Delivery plan

## PR-1 - V2 visual spike

### Goal

Turn V2 from a 3D demo into a convincing 3D sailing view.

### Files

- `src/app/simulator2/page.tsx`
- `src/app/simulator2/SailingScene.tsx`

### Work

1. Replace orbit-demo feeling with a real chase camera.
2. Improve water readability.
3. Strengthen wake and stern foam.
4. Add a horizon environment:
   - low coast
   - harbor silhouette
   - small islands or shoreline meshes
5. Improve the yacht visual:
   - cleaner hull shape
   - fuller sails
   - more legible heel

### Acceptance criteria

- one boat already feels good to watch in motion
- camera feels like a sailing game, not a showroom
- water and wake read clearly from medium distance

### Do not do in this PR

- race shell
- other boats
- minimap
- AI

## PR-2 - Live runtime for V2

### Goal

Stop using static solved output in V2 and move to live runtime behavior.

### Files

- `src/app/simulator2/page.tsx`
- optionally new local V2 hook files under `src/app/simulator2/` or `src/features/simulator2/`

### Work

1. Replace `useMemo(settle(...))` with a persistent runtime loop.
2. Reuse the V3 runtime pattern:
   - fixed-step stepping
   - live controls
   - target controls
   - target heading
3. Keep the page output shape similar so scene props stay stable.
4. Add heading intent and visible turning over time.

### Acceptance criteria

- tacks and gybes are temporal, not teleports
- trim changes visibly build or kill speed over time
- V2 now feels alive, not pre-solved

### Do not do in this PR

- marks
- leaderboard
- AI boats

## PR-3 - Premium HUD and sailing UI

### Goal

Bring the visual language closer to the references.

### Files

- `src/app/simulator2/page.tsx`
- optionally new V2 HUD components

### Work

1. Replace the current top-left stats card with a race-style HUD.
2. Add a compact wind and heading instrument.
3. Add a minimap placeholder or simple tactical inset.
4. Add on-water labels only if performance stays healthy.
5. Rework bottom controls:
   - fewer generic toggles
   - more sailing-game language

### Acceptance criteria

- HUD feels like race UI, not developer instrumentation
- primary numbers are readable on desktop and mobile
- scene remains the visual focus

### Do not do in this PR

- full race flow
- AI fleet

## PR-4 - Race shell

### Goal

Make V2 playable as a course run.

### Files

- `src/app/simulator2/page.tsx`
- new V2 race helpers if needed
- read patterns from `src/app/game/GameClient.tsx`

### Work

1. Add start line.
2. Add 2 to 3 marks.
3. Add target arrow.
4. Add countdown and session timer.
5. Add minimap with course geometry.

### Acceptance criteria

- user can start, sail toward marks, and finish
- course state is clear without opening other pages

### Do not do in this PR

- complex AI fleet
- multiplayer

## PR-5 - Opponents and race feel

### Goal

Add enough traffic to make the race surface believable.

### Files

- V2 files
- reusing logic patterns from `src/app/game/GameClient.tsx`

### Work

1. Add 2 to 6 opponent boats.
2. Start with deterministic simple behavior.
3. Add relative position display.
4. Add race HUD ranking line or compact leaderboard.

### Acceptance criteria

- the player is not sailing alone
- overtakes and relative position are visible
- performance stays acceptable

### Do not do in this PR

- advanced tactical AI
- networked racing

## PR-6 - Timed maneuvers

### Goal

Bring in the tactile race-game layer seen in the references.

### Work

1. Add action buttons:
   - Tack
   - Gybe
   - Ease
   - Trim
2. Add timed action execution.
3. Add a visible countdown ring or numeric timer.
4. Temporarily lock conflicting actions during a maneuver.

### Acceptance criteria

- a tack feels like an action, not just a slider result
- the timer is legible and understandable
- misuse has visible cost

### Note

This belongs after live runtime. Without live runtime, timed maneuvers are fake UI.

## PR-7 - Shared runtime extraction

### Goal

Only after V2 and V3 both prove they need it, extract the shared stepping logic.

### Candidate files

- new `src/lib/sim-runtime/`

### Move candidates

- runtime state type
- control interpolation
- heading approach
- create-initial-runtime factory
- fixed-step helper

### Keep separate

- V3-specific pedagogy and feedback
- V2-specific race shell and camera behavior

### Acceptance criteria

- less duplication
- no product regression
- shared module has real two-sided value

---

## 7. Concrete file plan

## `src/app/simulator2/SailingScene.tsx`

Will own:

- chase camera rig
- stylized water
- wake system
- environment silhouettes
- opponent boat rendering
- marks and world-space race visuals

Should not own:

- race state logic
- scoring
- session timer state

## `src/app/simulator2/page.tsx`

Will own:

- route composition
- V2 HUD
- control buttons
- local race session state
- runtime hook wiring

Should not own long term:

- low-level camera math
- large helper functions for course geometry

## `src/app/game/GameClient.tsx`

Use as donor for:

- start and finish handling
- mark progression
- minimap logic patterns
- simple AI patterns
- race progress UI ideas

Do not directly merge this file into V2. It is too large and carries 2D game assumptions.

## `src/features/simulator-v3/runtime/*`

Use as donor for:

- live runtime model
- fixed-step stepping
- target heading
- trim changes over time

Do not directly pull V3 pedagogy into V2.

---

## 8. Risks

### Risk 1 - V2 becomes a second V3

Bad outcome:

- too many controls
- too much diagnostic text
- scene stops being primary

Counter:

- keep V2 visually led
- keep V3 explanation-led

### Risk 2 - early architecture refactor eats momentum

Bad outcome:

- weeks spent on clean module names
- still no better 3D experience

Counter:

- prove the V2 visual and runtime surface first

### Risk 3 - performance collapse on mobile

Bad outcome:

- too many opponents
- too expensive water
- too much translucent HUD

Counter:

- profile after PR-1 and PR-2
- add quality tiers if needed

### Risk 4 - `/game` contamination

Bad outcome:

- V2 inherits too much old 2D logic shape

Counter:

- borrow ideas, not the whole file

---

## 9. Recommended order

If only one stream is in flight, do:

1. PR-1 visual spike
2. PR-2 live runtime
3. PR-3 premium HUD
4. PR-4 race shell
5. PR-5 opponents
6. PR-6 timed maneuvers
7. PR-7 shared runtime extraction

This order is intentionally strict.

If PR-1 does not already feel substantially better than current V2, stop and retune before moving on.

---

## 10. Final recommendation

The correct product decision is:

- keep V3 as the teaching simulator
- upgrade V2 into the premium 3D sailing and race surface
- use the V3 runtime pattern and `/game` race ideas
- postpone any shared-runtime extraction until V2 has proven shape

That path gets the requested look and feel with the smallest risk and the least architectural churn.
