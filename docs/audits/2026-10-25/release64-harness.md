# Checkpoint64: map, wind and settings

Owner request2026-10-25: a live course map, visible wind direction, optional
compass or incoming-air arrows like the trainer, and a proper Settings gear.
The preceding63 is immutable source88fdaac and already available in Self.
This is a separate presentation checkpoint. Physical course emission stays off.

## Current SITE browser gate after the blocked MAIN run

MAIN mergeb459ecc did not publish images: run40245210698 stopped at
prepublication,67passed and1failed. The combined Map/wind case met its120s
global deadline in all attempts. All five complete-SVG/caption samples passed;
retry1 read an actual advancing clock1:39.9->1:41.3 at118.439..120.689s.
Retry0 began its final Compass click at118.591s; retry2 reached Helm at119.744s.
The retained trace records WebGL2 fallback and ReadPixels stalls, not a proven
clock freeze. Exact proof: checks/website64-prepublication-main.json.

SITE separates Map/Fleet/running-clock and wind styles/Helm/preferences into
independent real3D journeys. Each retains25s startup,15s clock and120s total,
with all original assertions and all five geometry samples. Attachments reuse
the successful sampled geometry instead of a second browser read. The same
eight spec files select69cases. No global budget, retry, trace, runtime,
native package, privileged policy or NEXT physical source changes. Scoped
checks and a fresh normal CI/browser gate are required before a new merge.

## Website integration after the63 production gate

SITE initially merged APP1543d825, then adds frozen Map-fit source
ef180dfc520df389353bc6e208e7187894b9f976 while retaining0198d63 and7d87bf3
trainer browser contracts and portable website63-production.json.
Published63/b75c1e4 was healthy, but its74-case production report has70 first-pass,
1flaky,2failed and1skipped. The multiplayer range had no accessible name because
its implicit label selected the earlier output element;64 explicitly supplies
aria-label. Keep the guest's existing strict localized rudder-name expectation, all input,
WebSocket, camera and fleet checks. This source repair is not yet proof of a
successful future production run.

The other failed contract counted the real Diagnostics utility as empty space.
The retained test now checks its localized44px summary, occupied bounds and
actual blank gaps below24px without boat overlap. The flaky simulator2 case
sampled a150px canvas while Loading yacht was still visible; actual first-frame
readiness now shares the existing startup deadline before geometry. The former
>150px, viewport and scroll assertions remain, with no increased timeout.

The normal loopback gate now includes e2e/trainer-controls.spec.ts. With the new
map/wind case,68cases are expected before publication. The9finite boundary
tests still require loopback, no deployment secrets in checks and main-only
publication/deployment. A fresh combined cloud run remains required; no64
runtime or installed package differs from the frozen APP source.

The first combined68-case non-main run40242561385 on3fefb602 succeeded with
67first-pass and1flaky, no failures/skips, and all publication/deployment jobs
skipped. The corrected scroll and occupied-Diagnostics cases passed first
attempt. The unchanged V3 drawer case sampled boxes after597ms while its
retained screenshot still displayed Loading yacht; readoutsY330.5 missed the
scene-bottom-minus1 threshold330.747833. Retry1 passed in12.646s. Both3D
drawer cases now require the actual first rendered frame inside their same25s
startup allowance before reading boxes. All1px bounds, drawer actions and60s
total budgets remain unchanged; execution of this correction is pending.

The source1543 installed native Map still needed scrolling to expose its start
line/player under the reduced safe-area height. That separate shared Map-fit
repair and fresh combined/native verification are required before publication;
the successful68-case run does not close this installed UI defect.

1. [x] Confirm source causes: missing live overview/TWD/TWS, literal sun-shaped
   shared settings SVG and inherited arrow stroke on the briefing wind label.
2. [x] Shared toothed gear and clean briefing label, actual browser inspection,
   scoped existing tests, types and a rollback commit.
3. [x] Pure wind/map contracts and meaningful sign/projection tests. Read actual
   wind/course/fleet data; preserve north reference, every mark, legacy course
   dimensions and unknown speed. No new wind model, physics or network.
4. [x] Reserved Map dock with fleet access; compact wind readout and optional
   compass/arrows/both/off visual aid. Preserve Helm return,3D Orbit, Simple/Pro,
   all controls and settings. Known enum preferences must survive the native
   bridge/relaunch. Log setting/map actions, never positions or every frame.
5. [ ] Seven-language adaptation and visual checks at320x568,390/402px,
   landscape and desktop; keyboard/44px/focus/contrast, no covered yacht.
   Actual arrows must show the existing wind on WebGPU and WebGL2.
6. [ ] Full source/native/site gates, unchanged6.5MiB budget, fresh local
   packages and installed Release on upgrade26.5/clean27. Root freezes an
   unused build64 only after implementation. Apple/Self availability and8
   notes require independent GET before delivery, separately from website.

Default aid: compass. Numeric actual true-wind direction/speed remains available
when visual aids are off. The map is a course overview, not a geographical
navigation chart. Replay records without wind speed must not invent12kn.

All65product acceptance, physical owner phone/ASR/FPS, manual Pro/MP finish,
physical120/300/600m race activation and real island routes remain separate.

## Source evidence before native freeze

Shared pure model/map tests34 pass. Web full suite1269tests/146files passes.
Native-host enum/restore tests8 pass; all four values preserve old assist fields.
Types and scoped lint pass. Actual browser production preview at390px shows
live course/player/rivals in a reserved lower panel, clock advancing while Map
is open, real air arrows for both/arrows and numeric wind while off. Pause held
at1:59.4 while inspecting styles.320px found a broken Settings word wrap; the
shared tab now shows only the gear and preserves its accessible full name.

Shared footer loader retains default SSR, and metadata deduplication preserves
all24links and seven language labels/order exactly. Production HTTP checks
cover14content pages across7languages after removing script payloads; actual
headings, Back and three anchors remain server rendered. Final budget after the gear responsive fix is6,814,285bytes, within6.5MiB
with1,459bytes headroom; largest chunk0.94MiB. Server bundle guard passes.
No budget was relaxed.320px no longer splits Settings into broken words;
402px and844x390 landscape keep the yacht and actual map separate.
Screenshots are retained externally; final native pictures follow its gate.

The new E2E source keeps25s actual-frame startup,15s clock and120s total. It
selects the real First Race/Easy preset, validates complete standard course and
fleet, running Map, four exclusive styles, Helm keyboard input and only a
canonical finite journal summary. Execution is still pending CI.

## Language locations and terminology

New map/instrument/style labels: src/features/race-hud/navigation-copy.ts.
Existing mode/menu/Helm/fleet labels: src/app/game/race-copy.ts and shared
trainer-controls/labels.ts. TWD is the direction true wind comes from, referenced
to north; TWS is its measured speed. AWA/AWS describe apparent wind relative to
the moving boat. The compass uses true wind; 3D flow uses apparent wind.
PL uses wiatr prawdziwy, never a literal generic compass label for apparent wind.
An absent old replay wind speed remains unknown instead of inventing12kn.

## Exact source gates and release preparation

The feature rollback commit is4c6ad5a; fdec8a2 integrates verified website
browser contracts without changing its64 runtime. Apple GET22:29:41UTC finds
build64 unused, writes0. Native config now selects64 and all3offline packages
were regenerated; sailing source stampf00f8cff9f49 (6.24MiB). Expo prebuild
completed after the version bump. Source63 simulator app/archive/export stay
preserved independently before the64 build overwrites warm build output.

The final full web suite1269/146 passes. Native npm check's package/content,
lint, types and9tool gates pass; its first Jest run with automatic14workers
exceeded two unchanged5s test deadlines (Menu/legacy simulator) while local
3D review was rendering. This is recorded as a failed run, not a product
cause conclusion. Full Jest rerun with2workers and unchanged timeouts passes475tests/71suites.
The failed automatic-worker run remains retained separately.
Native audit still has12classified baseline findings/91files; tp-arity and
missing extras are zero. New wind copy has21resources/147explicit seven-language
values and a semantic true/apparent/north/from-direction review.

External helper64 copies pass36mock tests and independent review; they reject
build63, require exact full40hex source, retain local resources/signing/freshness
checks and isolate all64reports. No Apple write or native build occurred during
helper preparation. Generated/Simulator/archive/IPA verification still follows.

Independent source review cross-checks324wind/heading/speed/leeway combinations
against direct world air-minus-boat vectors, maximum speed error1.07e-14kn;
all direction vectors agree. After merge, strict types and scoped browser lint
pass; AST review retains all113old Pro calls in order plus actual-frame wait and
bounded observations. Shared map/gear/Helm tests15/3 pass after final CSS.

## Installed G2 finding and superseded candidate1543

Source1543d825 produced verified generated18, Simulator27, archive33 and IPA35,
with independent real binary/IPA/UUID hashes. Cloud61 first-pass,1269web/475native
and3Foundation checks pass. It was never uploaded. After the host restart,
all8saved values and129journal entries survived its installation on26.5.
Native Home, retained Pro/sliders/course preference, actual bundled3D, live
Map, clock0:12.0 and pause1:24.7 were observed. This is not a Pro finish.

G2 found that the initial SVG used width-driven auto height: the native safe
area leaves less dock space and the start line was clipped below its initial
view. Candidate1543 archive/export/logs/reports are preserved externally as
native-archive64-1543d825, with original-path relocation documented. Its expanded
Simulator app is preserved separately. No existing progress was cleared.

The correction sizes only the Map SVG against its own panel's query-container
height and reserves room for the caption. No new React state/timer/observer,
physics, data or control change. Existing standalone Map height is the fallback.
Actual production browser geometry shows full SVG and caption within every
panel/viewport edge at390x844,320x568,390x720 and844x390. The strengthened single
E2E repeats these four sizes before any Fleet scroll, restoring390x844 and all
old controls/assertions.25s/15s/120s budgets remain unchanged.

Corrected sourceef180df is frozen with fresh sailing asseta129165d4b2b. Exact
new native proof, installed26.5/clean27, Apple validation/VALID/8notes/Self remain
required. Prior1543 checks do not stand in for the corrected package. Website
PR84 now synchronizesef180df with the retained drawer-readiness correction;
normal CI and the full68-case non-main gate must repeat before publication.
