# Candidate63: local diagnostics and actual coverage

Status: implemented source before the final expanded63 release gate. The first
1b92567 archive is a preserved earlier candidate, not proof of these additions.
The new installed binary, Apple validation, upload and exact Self delivery have
not been verified for this source. Delivered62 remains a separate immutable
release. Follow [release63-harness.md](release63-harness.md) for final provenance.

This note records the DIAL/diagnostics requirement and its bounded implementation.
It does not close the [65-item baseline](plan-recheck.md), the remaining acceptance
matrix, physical racing courses, geographical island routes or App Review.

## Architecture and ownership of history

- [diagnostics.ts](../../../src/lib/diagnostics.ts) is the shared pure core. It
  has no React, DOM, native storage, network or global clock dependency. Its
  finite discriminated event registry validates every field before recording.
- [diagnostics-controls.ts](../../../src/lib/diagnostics-controls.ts) is the
  small no-throw command boundary. It records normalized control targets and
  accepted/noop outcomes without owning or returning the control state.
- [diagnostics-web.ts](../../../src/lib/diagnostics-web.ts) owns one journal per
  browser window. Ordinary browsers persist only its own localStorage record.
  SSR returns an inert empty store and cannot retain cross-request events.
- Native WebViews use an in-memory web journal. They neither read, write nor
  remove the diagnostic key in WK localStorage. This prevents old per-WebView
  history reappearing after native Clear all data.
- [diagnostics-bridge.ts](../../../src/lib/diagnostics-bridge.ts) forwards each
  original validated input, including noop/rejected/failed outcomes, to native.
  It does not forward restored snapshots or cumulative coalesced rows. The
  bridge starts on the instrument/game/trainer mount, before opening Settings.
- [mobile/src/diagnostics/journal.ts](../../../mobile/src/diagnostics/journal.ts)
  is authoritative for the app-wide native history in AsyncStorage. It checks
  the entire incoming batch, assigns its own sequence/session/relative time and
  replaces the sender's surface with the trusted host surface. The bridge is
  append-only and cannot execute commands or change course/race data.
- Native lifecycle and confirmed navigation are recorded through
  [DiagnosticLifecycle](../../../mobile/src/diagnostics/DiagnosticLifecycle.tsx),
  [AppNavigation](../../../mobile/src/navigation/AppNavigation.tsx) and
  [ActivityBack](../../../mobile/src/navigation/ActivityBack.tsx). Web navigation
  maps paths to fixed destination codes, never storing paths or query strings.

`regatta.diagnostics.v1` is separate from the SRC, Sternik and race progress
collectors. Normal journal clear leaves learning and race data alone. Native
Clear all data suspends diagnostic persistence, invalidates pending reads and
removes delayed writes after their completion, so they cannot recreate the key.

## Bounds, meanings and privacy

| Contract | Actual bound or meaning |
| --- | --- |
| Journal | At most200 entries,64KiB serialized snapshot/envelope and512bytes per entry. Older entries are evicted first. |
| Time | A session ordinal and relative elapsed time appear in entries. No wall-clock, device or random identifiers appear there. The persistence envelope alone has the caller-supplied save time. |
| Expiry | The saved envelope expires48hours after its last write. Invalid, expired or future-dated envelopes are ignored. This is snapshot expiry, not per-entry wall-clock retention. |
| Coalescing | Adjacent continuous control/rotation inputs within250ms can share a row. Count and relative interval remain visible; controls retain the first previous target when supplied and the final target. Rotation steps accumulate; opposite rotation and failed/rejected inputs stay distinct. |
| Omitted count | Counts omitted inputs, including evicted coalesced commands, rather than only removed rows. |
| Embedded batch | Version1, at most16 original inputs and8KiB validated payload. Unknown fields, supplied sequence/time/display text and invalid values reject the whole batch. |
| Browser writes | Debounced400ms; storage exceptions leave recording usable in memory and do not cause retry/error loops. |
| Native writes | Initial read has a2s deadline. Only one flush and one latest-snapshot follow-up are pending while a write is in flight, avoiding a growing promise queue. |
| Accepted | The handler accepted/applied the named target or completed the named operation. It is not automatically a network or durable-storage acknowledgement. |
| Noop | A valid command left the normalized target unchanged, such as a dial at its limit. |
| Rejected | The command was refused by a known guard, such as power off, TX inhibit, Inspect or an already-busy checkpoint. |
| Failed | A classified operation or storage/load attempt failed. Only static reasons and bounded safe codes are recorded. |

The journal excludes transmission/message text, typed answers, speech/audio or
transcripts, MMSI and names, GPS/world positions, raw storage keys/values, URLs,
queries, tokens, exception messages and stacks. Safe fields are finite enums,
booleans and bounded numbers. A venue is only one of five fixed scenery codes,
not a position. Radio editor actions never include the edited digits or text.

There is no automatic network upload or analytics coupling. Copy is an explicit
user action and copies only the validated bounded snapshot. Recording and
subscriber failures cannot interrupt an instrument or a control. Persistence is
best effort: the last buffered events can be lost if the process exits before
its flush; this journal is not a guaranteed crash recorder.

## Implemented integration coverage

| Surface | Recorded now | Source boundary and important limit |
| --- | --- | --- |
| SRC instrument, guided course and live dialogue | Actual reducer commands, safe before/after projection, noops, power/TX guards and reducer failures. | [commandDiagnostics.ts](../../../src/app/radio/symulator/commandDiagnostics.ts) is shared by simulator, InteractiveRadioCourse and LiveDialogue dispatch paths. Unchanged automatic scan/watch ticks are omitted. |
| DIAL input | Start, rotation, tap, hold, cancellation and ignored competing input, with pointer/keyboard/arrow/assistive source. | [dialGesture.ts](../../../src/app/radio/symulator/dialGesture.ts) and [useRotaryDial.ts](../../../src/app/radio/symulator/useRotaryDial.ts). One input owner/timer; movement cancels hold; cancel/blur/hidden/model/Inspect/unmount clean up. This is input evidence, separate from reducer outcome. |
| Native SRC startup | Storage/bootstrap/load/ready/retry, classified startup/WK/process failures and course persistence results. | [OfflineRadioCourse.tsx](../../../mobile/src/course/OfflineRadioCourse.tsx). Attempt guards and existing startup watchdog remain; no extra permissions or storage clearing. |
| Native local course and sailing hosts | Begin/ready/error/retry/process events, checkpoint/course read/write completion or rejection. | [LocalCourseWebView.tsx](../../../mobile/src/course/LocalCourseWebView.tsx), [SimWebView.tsx](../../../mobile/src/simulator/SimWebView.tsx), native checkpoint adapter. These are host outcomes, not every lesson answer. |
| Solo game | Normalized sheet/twist/reef/deployment, rudder/course/assist and keyboard changes; init, render-ready, briefing/countdown/start, pause/resume/hidden, finish/timeout/exit. | [GameClient.tsx](../../../src/app/game/GameClient.tsx). No per-physics-tick logging or changes to VPP, steering, course geometry or race state flow. |
| Solo saving | Native request/retry and actual durable acknowledgement/error; leaderboard/share request and actual response outcome. | An enqueued native message is recorded as a request, never as a saved result. Unknown/stale save acknowledgements do not become a new race's acknowledgement. No names, race IDs or payload contents enter these events. |
| Shared replay | Open/play/pause/seek/rate/close and camera presets/reset. | [RaceReplay.tsx](../../../src/app/game/RaceReplay.tsx). Playback frames and recorded positions are not journal events. |
| Shared preferences | Mode, helm mapping, return-to-center, sensitivity, jib side, sound, safe favorites counts/reorder and preference storage failures. | [prefs.ts](../../../src/features/trainer-controls/prefs.ts). A same-count reorder is a real change; card IDs are excluded. |
| Basics | User heading and wind targets from sliders, keys, wheel and drag, plus reset. | [simulator/page.tsx](../../../src/app/simulator/page.tsx). Rendering/animation frames are excluded. |
| 3D boat and pose inspection | Manual sheet/rudder/reef/wind targets, pose angles/shape, reset/preset/mode, camera, airflow, light renderer, shore and fixed venue choice. | [Simulator3D.tsx](../../../src/features/simulator-3d/Simulator3D.tsx) and [useSailingSim.ts](../../../src/features/simulator-3d/physics/useSailingSim.ts). Automatic course-hold rudder corrections are explicitly silent. |
| Trainer | User trim, canonical reef/furl mapping, real working length/traveler/vang/outhaul, wind/view/deployment, pause/reset/restore. | [SimulatorV3Page.tsx](../../../src/features/simulator-v3/SimulatorV3Page.tsx). Its periodic helm-to-UI synchronization is silent; diagnostic projection runs outside React functional updaters. |
| Trainer checkpoint | Busy rejection, missing/invalid record, actual storage completion/failure and validated restore. | [use-trainer-checkpoint.ts](../../../src/features/simulator-v3/hooks/use-trainer-checkpoint.ts). Pending storage is not labelled saved. |
| Multiplayer presentation | Client rudder/course targets, camera and guidance choices. | [MultiplayerClient.tsx](../../../src/app/multiplayer/MultiplayerClient.tsx). Accepted means local input intent; no invented server acknowledgement, position prediction or protocol change. |
| App navigation and scene failures | Fixed destinations, native background/foreground, classified React/scene errors and scene retry. | Shared Navigation, native AppNavigation/ActivityBack, app ErrorBoundary and shared SceneBoundary. Raw error/route contents are excluded. |

## Access and offline loading

The app-wide journal is under native Settings -> Diagnostics. Radio has a dock
tab; race and trainers expose it inside their reserved control/settings area.
The embedded panel clearly describes its current-screen scope and points to
Settings for app-wide history. It does not overlay the boat or radio. Labels,
outcome names and recovery/copy controls have all7 UI languages; event codes
remain stable technical identifiers.

[DiagnosticPanelLoader](../../../src/components/diagnostics/DiagnosticPanelLoader.tsx)
provides one web split point and the small title stays outside the full catalog.
DiagnosticAccess preloads the panel on mount; the radio workspace mounts its
panel through the same loader. The measured source build returned6.48/6.5MB
after this sharing, with the same features. This measurement is not archive proof.

The radio/sailing builders bundle imports as a single local IIFE with no splitting;
their local `next/dynamic` adapters resolve the compiled module. The loader does
not introduce a native HTTP/chunk dependency. Final generated-package freshness
and installed offline loading still belong to the exact-source release gate.

## Evidence and remaining acceptance

- Source/unit evidence: phase B passed76 tests in14files, root TypeScript,
  scoped lint and diff checks. Tests exercise actual GameClient and Trainer
  handlers, rapid targets, real9 ->11m working length/traveler, canonical reef
  and jib-open mapping, logging failure isolation and checkpoint pending/ack.
  Core/adapter tests cover strict private-field rejection, caps, restore,
  coalescing, injected clocks, SSR, storage failures and native memory-only mode.
  The final combined web/native gate must be recorded separately.
- Root observed the current browser DIAL increase volume16 ->20, report the
  upper-limit command as noop and use the retained arrow to return20 ->19.
  This supports real instrument input/outcome integration, not installed WK
  finger/hold acceptance on every device or model.
- Root observed Back restoring the actual free-radio component on a402px phone
  layout, with reserved panels. This is stronger than checking only the URL.
  It does not establish all widths, all7language journeys or native Back branches.
- The old radio upgrade issue and retained62 evidence remain in
  [acceptance62.md](acceptance62.md). They must not be presented as new63 runtime
  proof. No new installed63 binary or ASC delivery is accepted by this note.

Explicitly not yet covered or not implied:

- Specialized study/assessment answer correctness and every learning task result
  do not have complete outcome adapters. Opening a lesson is not completion.
- Native recovery/fallback trainers, all Library/theory pages and optional cloud
  features do not have complete command-by-command instrumentation.
- Orbit drag/pinch gestures are not logged as camera position samples. Camera
  preset/reset commands are covered; physical touch/FPS acceptance remains open.
- Multiplayer server receipt, applied helm and a full human finish are unproven
  by client intent events. Network frames are intentionally not logged.
- The web PB helper exposes no durable-write result; no PB durable success is
  invented. Bulk unchanged UiState updates do not invent a field-specific noop.
- Delivery before a flush, process death, physical microphone/ASR/TTS, all device
  upgrades and the full65-row product acceptance remain separate checks.


The radio app-exit control flushes its pending validated batch before posting the
existing exit command. A transport-order test verifies this without changing the
command protocol. Final native check:472tests/71suites plus9release-tool checks;
production web build, strict types and lint pass, with6.49/6.5MiB static chunks.
These checks still do not establish installed-binary or Apple delivery acceptance.
