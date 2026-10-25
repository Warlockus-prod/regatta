# Checkpoint64: map, wind and settings

Owner request2026-10-25: a live course map, visible wind direction, optional
compass or incoming-air arrows like the trainer, and a proper Settings gear.
The preceding63 is immutable source88fdaac and already available in Self.
This is a separate presentation checkpoint. Physical course emission stays off.

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
