# Native learning release 47

Date: 2026-10-15. Scope: mobile first, TestFlight 1.7.0 (47).
Source branch: `codex/learning-modules`, continuing `a4d9459`.
Distribution outcome and exact source commit are recorded in `BUILDS.md`.

## What the learner gets

- Eight foundation lessons in three modules: wind and motion, turns and progress,
  first regatta. Each has a goal and understand / check / practice steps.
- Seven added native SVG diagrams with three selectable states, explanations,
  a key and a stated limitation. The first wind lesson keeps its existing pilot.
- The lesson remembers its step and diagram after leaving or restarting.
- Practice returns to the lesson. Tacking opens no-go recovery; gybing opens the
  offline Trainer with a specific observation task. Neither pretends that
  merely visiting practice proves maneuver competence.
- A quiz counts only after its result is saved. Failed writes expose retry;
  failed reads cannot overwrite the other saved results.
- The earlier 13-lesson sail course improvements are included: four modules,
  goals, saved place, distinct theory and exercise results, offline practice.

## Graphics and educational boundaries

The native vector renderer ports the owner's local Codex kit drawings. The
points-of-sail boom stays to leeward and opens as the heading bears away.
Tack and gybe diagrams show the appropriate bow/stern crossing and boom side.
The VMG example explicitly holds speed at 6 knots while projecting toward the
wind; it is not a yacht polar. Rules diagrams label wind and tack, and do not
teach that right of way removes the obligation to avoid collision.
No Blender, AI photos, physics constants or 3D assets were changed here.

Reference checks used the [RYA points of sail explanation](https://www.rya.org.uk/training/do-you-know-your-points-of-sail/)
and [World Sailing Racing Rules](https://www.sailing.org/racingrules/), including
rules 10, 13, 14 and 16 in the [2025-2028 rules](https://media.sailing.org/sailing/wp-content/uploads/2024/07/05091216/RRS-2025-2028-Final.pdf).

## Data and navigation

`regatta.bootcamp.position.v1` stores only step and diagram. Existing quiz,
bookmark, sail theory, sail practice and simulator snapshot keys keep their
separate responsibilities. Unknown lesson IDs cannot create a return action.
The return button inherits the current header tint, including dark instruments.
The Trainer's tier switcher is hidden for guided foundation practice.

## Verification

- Native suite: 230 tests in 37 suites, including persistent step/diagram,
  rapid writes, all eight lessons, all seven languages and save-failure retry.
- Native TypeScript and lint; synced content and offline bundle checks.
- Offline sailing bundle: 3.70 MiB, source hash `060a99b9827f`.
- Metadata: Fastlane precheck passed; this is not a full App Store submission gate.
- Locale audit: three existing heuristic findings were inspected: the proper
  name Hyeres with its French accent in spots and weather, and a regex capture
  across a JavaScript handler in SimWebView. No missing new locale values in
  the foundation guide; coverage is also checked by tests.
- Release Simulator build with Xcode 27.0 (27A266a). Device-level observations
  and screenshots are added to the release journal before distribution.

## Remaining scope

Website adaptation is deferred by the owner. This release does not claim a
fresh audit of all radio/motor content, multiplayer, 3D physics or every app
screen. Full App Store review, updated store screenshots and a new upgrade
rehearsal from public 1.6.3 remain separate from this internal TestFlight release.
