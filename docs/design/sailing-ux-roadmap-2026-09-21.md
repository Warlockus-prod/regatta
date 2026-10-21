# Sailing course: learning-first UX

Status: implementation in progress, local only. The published iOS 1.6.2 is not this redesign.

## Diagnosis

Reviewed the shipped course and Trainer at 390 x 844, and their shared/native source.

- The course mixes reading, interactive figures, a quiz, simulator navigation and sources in one long scroll.
- The Trainer makes session management, simulator destinations, exercise modes, camera views and sail controls compete for attention.
- A phone shows camera/settings before the lines the learner is meant to adjust.
- "View" contains sail selection, course presets, assistance, reset and saved sessions. These are different tasks.
- Theory completion is meaningful but is not practical skill completion. Preserve this distinction.
- A new simulator destination would multiply this confusion. Keep the existing routes and one runtime.

## Direction

Calm instructor, not a promotional dashboard. Retain dark-ocean tokens, the existing light reading theme, fonts and seven languages. Prefer flat sections, clear labels, 44px targets and one primary next action.

Global destinations are Home / Learn / Practice / Race / Menu. Menu replaces Library as the complete shortcut map, not another competing learning path. Reference material is a group inside Menu. The old Library route redirects to Menu.

Learning flow:

1. Course: current next lesson, then grouped modules.
2. Understand: interactive diagram, explanation, contextual terms.
3. Check: question, reasoned feedback, explicit save of theory result.
4. Try: objective, limits of the simulation, launch practice, return to this lesson.

All steps remain directly accessible for revision. Do not lock knowledge behind a quiz. Selecting a step or visiting practice never fabricates completion.

Trainer hierarchy:

- Scene and view selection describe the same boat state.
- Sail controls are the primary task.
- Conditions and session tools are secondary, separately labelled.
- Guided exercises stay next to the relevant controls.
- Detailed rigging is a control level, not a fourth simulator.

## Requested work, in order

### 1. First six lessons

- [x] Shared step navigation on web and native, with state reset on lesson changes.
- [x] Grouped course outline and contextual terms in seven languages.
- [x] Separate Trainer camera, conditions, controls and session functions.
- [x] Independent transfer assessment at a different wind condition, separate from theory checks.

Two transfer tasks check actual settled shape: change twist while retaining boom angle,
or reduce lower-sail depth without changing twist. Both require a causal explanation.
The assigned initial course, tack, wind and jib trim are checked before recording a
baseline. Paused time, view changes, environment changes and early clicks cannot
manufacture a result. Results remain session-local, not practical certification.

### 3. Equipment and lessons 7-9

Validate the rig passport and equipment manuals before procedural content. Model load ownership, not just button animation: winch, clutch, halyard, topping lift, controlled hoist/lower. No claimed real load ratings in an uncalibrated educational model.

- [x] Lesson 7, winch and clutch, with shared native/web diagrams and seven languages.
- [x] Offline inline equipment bench, not a fourth simulator destination.
- [x] Qualitative load ownership, two-stage clutch lever, wraps, handle, tail and self-tailer.
- [x] Explicit transfer/holding check before removing wraps, with explanations for rejected actions.
- [ ] Lesson 8: halyard and topping lift linked to actual boom support and sail hoist state.
- [ ] Lesson 9: controlled hoist/lower with obstruction and support checks.

The bench models an already-loaded line, not the entire sail/boom system. Its protective
interlocks are intentionally stricter than the real hardware. The UI explicitly warns
that a real XTS can release under load. Three/four wraps are illustrative training
thresholds, not a rated capacity or a universal instruction. No force values are shown.
The bench is ungraded and resets when its practice step is left. Theory progress remains
separate. It has not yet been connected to 3D hardware or the sailing-session checkpoint.

### 4. Targeted 3D pass

Only after equipment states are stable: operable clutch lever, winch drum/handle, identifiable blocks and line paths, close camera targets, collision and mobile budget checks. Blender is for authored hardware and attachment geometry, not a second physics engine. Keep existing hull/ocean.

### 5. Lessons 10-16

Slab reefing, jib furling, jib sheets/car, tack, controlled gybe, gusts, final independent preparation/stow exercise. Each needs validated mechanics, diagrams, explanations, assessment and seven-language/offline parity. No links to nonexistent practice and no "complete course" claim before these gates pass.

## Verification and publication gates

- Unit tests: progress, glossary coverage, state transitions, equipment invariants.
- Native tests: lesson steps, correct/incorrect answer, storage failure/retry, route changes, offline content.
- Browser: phone and desktop, keyboard focus, no horizontal overflow, same-state view changes, usable embedded scrolling, no hydration errors.
- Regenerate and verify the bundled offline Trainer after changes to its dependency graph.
- Root/native typecheck, lint, tests, no-dash check, production build and smoke tests.
- Physical iPhone remains a separate unperformed gate when no device is connected.
- User review of design direction before publishing a broad redesign. VPS2 deployment and App Store binary are distinct release operations.

## Reference starting points

- [North Sails J/22 controls](https://www.northsails.com/blogs/north-sails-blog/j22-tuning-guide): control effects, not universal trim numbers.
- [Seldén rigging documentation](https://support.seldenmast.com/en/technical_info/rigging_instructions.html): identify the exact rig/equipment before hoisting and reefing instruction.

These references do not constitute instructor validation of our future simulator.

- [Spinlock XTS](https://www.spinlockusa.com/en-GB/eur/products/xts): current linked
  instructions, 2026 3R1080A. The earlier unavailable PDF was replaced by the current
  official asset and visually inspected. Two-stage release, load control and lever
  opening towards the load inform the bench, not a generic one-click clutch.
- [Harken Radial user manual](https://gallery.harken.com/gallery/71c34f20-4104-43e8-a682-2090a20c1be3.pdf):
  inspected text and diagrams; drum wraps, tail control, self-tailer, handle and pinch hazards.
  Manual diagrams are not redistributed; the course uses its own schematic.

## Local verification, 2026-09-21

Evidence is recorded for this local iteration, not for the published site or App Store binary.

- Root suite: 425 unit tests across 47 files, including equipment invariants and assessment outcomes.
- Native: 135 tests across 28 suites, lint, TypeScript, radio/sailing offline freshness and content sync.
- Browser learning suite: 8 scenarios, widths 320/390/1280, all seven locales, storage failure/retry,
  keyboard focus, no horizontal overflow, independent depth task, full bench procedure with the
  browser network disabled, unsafe release rejection, camera/panel state continuity.
- Final production-build browser run: 15/15 selected learning/navigation/3D/embed checks passed.
- Equipment tests include 20,000 arbitrary actions and recovery of guidance from 200 explored states.
- Production Next.js build and iOS Simulator Release build. The latter requires the existing
  15.1 deployment target to be applied to Pods on the installed Xcode 27 toolchain; existing
  Skia minimum-version and build-script warnings remain. This is not a signed device archive.
- Installed the final Release build into iPhone 16 Simulator and opened lesson 7 by deep link.
  Completed all 11 bench actions through the actual native UI; the final state showed 10 cm
  eased, load returned to the clutch and the winch free. No Metro server was used.
- Sailing offline HTML: 3.32 MiB, source fingerprint `d390a32de054`. The native course and equipment
  bench live in the bundled React Native code, separate from this Trainer WebView asset.
- Earlier full cross-product browser sweep: 21/23 passed. Two integration checks failed locally:
  multiplayer has no WebSocket proxy on the local Next port; AI chat received provider 401 with
  the local credential and returned 502. These are unresolved environment checks, not a green
  full-system result. No credentials were changed and no unrelated API edits were overwritten.
- No physical iPhone or Android device test in this iteration. No VPS2 deployment or App Store upload.

Visual captures: `output/playwright/ux-winch-mobile-ru.png`,
`output/playwright/ux-winch-desktop-ru.png`, `output/playwright/ux-native-lesson.png`.
The final native equipment screen is in `output/playwright/ux-native-winch.png`.

## Remaining release work

Review this calmer UI direction before publishing the broad redesign. Lessons 8-16 and the
targeted 3D equipment pass are still open, not silently marked complete. In particular, do not
teach a loaded hoist/lower or slab-reef sequence against the current boolean hoist and fixed
boom support. These require the next mechanical state-model pass and source validation.
VPS2 publication and a new signed mobile binary must be tracked separately from local builds.
