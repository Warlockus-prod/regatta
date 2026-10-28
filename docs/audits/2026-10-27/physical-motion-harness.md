# P04: explicit physical motion foundation

The owner-approved [completion program](../2026-10-26/completion-program.md)
continues after delivered68 sourcef7/tagtestflight-1.7.0-68. This temporary
`codex/physical-engine-next` checkout is separate from frozen68, SITE and the
protected root. Scope follows ADR-0011. No force-model constant changes.

## Behavioral contract

An explicit known physical context uses the trainer heading laws and real
metres per integrated knot-second, with the same race force/trim/handicap
step. Unknown/missing/legacy context or invalid motion input is rejected
before a boat mutation. Existing no-context client/server races retain their
original numeric trajectories. This is a pure foundation, not live activation.

`stepRaceBoatForces` extracts the existing force/trim block without changing
its operations. `stepBoat` keeps legacy steering, accelerated displacement and
bounds. The new `stepPhysicalBoat` requires a canonical physical context and
explicit course-assist or helm input. It uses previous speed for heading
authority and integrated speed for displacement, like the trainer helper.
Course assist45deg/s and helm22deg/s are declared teaching/control laws;
neither certifies a simulated hydrodynamic rudder. Low-speed assist must be
explicit, never inferred from player/bot identity.

The same13.2m hull envelope plus2m clearance buffer defines the boundary
margin for all three profiles. Boundary recovery occurs before the returned
propelled segment. Frozen endpoint copies exclude that recovery and subsequent
collision pushes. Future progression must consume this segment, not the final
post-collision position. No new gate/progression implementation is claimed.

The current steady race trim and trainer's transient rig are not declared
identical. Hoist/furl/reef and auto/manual sheets reuse existing race behavior;
further common rig/control integration belongs to P06.

## Evidence and required checks

- Twelve golden scenarios were captured from exactf7 before the extraction:
  headings45/90/150, legacy/responsive, auto/manual trim, varying wind,
  a non-compounding0.85handicap and180steps. The fixture names its source.
  New source must match final heading/speed/position/trim/force state. A newly
  generated server mirror alone is not this independent evidence.
- 41physical adapter cases and12golden cases pass initially. Physical tests
  compare actual integrated path length in all profiles, earth-coordinate
  signs/leeway, turn radius against old accelerated travel, explicit low-speed
  assistance, shortest course approach/no overshoot, shared force/trim and
  invalid dt/context/input/options without partial mutation. Nine existing
  source/server drift cases include an entire real legacy bot race.
- Full source gates pass:1621web/159files,587native/78suites plus9release-tool
  cases; root/native types, native lint0warnings, root lint0errors/15existing
  warnings, all3fresh packages/content twins, generated server, real WS,
  production build, map and typography. Static6.48MiB/110files stays below6.5.
  An initial concurrent native run timed out in5cases; an isolated full run
  passes all587 with the same5000ms deadlines and assertions. Contention as
  the sole cause is not established; the first failure log is preserved.

## Gates before physical activation

1. Confirm native PB commands/receipts and every local/global/replay/Coach
   consumer accept the actual physical class without legacy inference.
2. Integrate metric course bounds, hardware/collisions, start/rounding/finish,
   bot steering, displayed guidance and optional judge. All use one descriptor.
3. Exercise each profile in real wind/recovery and delayed heading scenarios;
   collision-only movement never awards a gate. Do not widen gates for QA.
4. Bound long-course recording/payloads, immediate durable player result and
   remaining-fleet completion without blocking or premature DNF.
5. Freeze actual context before countdown; explicitly version Daily/mission
   conditions, resume and offline/native setup. Current live authority remains
   legacy until the engine actually switches.
6. Complete Simple/Pro installed finish, saved replay, PB/global isolation,
   upgrade/cold/offline, exact browser/source and native/Apple delivery gates.

`PHYSICAL_RACE_EMISSION_ENABLED` stays false throughout this foundation.
No new course selector, live race motion, multiplayer change, TestFlight69 or
site publication is claimed. Rollback runtime remains delivered68.

## Additional owner task

The owner requested an Ads tab in Settings with freely inspectable camera
scenes and test placements. No advertising SDK exists in the current codebase.
The owner explicitly deferred SDK/provider setup and requested the place only.
It is a separate work item; simulated
placement events must not be represented as actual SDK signals. Physics and
the release68 source remain isolated from that UI work.

## Numeric observations and source proof

[Three actual synthetic inputs](checks/physical-motion-observations.json)
advance45->67,90->112 and150->172degrees through30steps in one real simulation
second. Physical path lengths are2.10573,2.09853 and2.04280metres, matching
the sum of integrated knots times0.514444. Legacy paths are19.64742,19.58021
and19.06023metres under the same force states. The ratio is9.33046. These are
source measurements, not a judgement of installed handling feel.

[Source proof](checks/physical-motion-source.json) records exact production
input hashes, all gate totals and the failed concurrent native run without
relabeling it green. A fresh cloud browser/native check still follows before
any candidate can be shipped. Frozen68 remains the delivered runtime.

## First cloud portability finding

Run40421105351 on exactd7 stopped in three frozen-trajectory cases before the
browser gate. Linux reports heel/leeway differences from the Mac-captured
fixture of about5e-15 (for example8.552946026875903vs8.552946026875908).
All other shown force fields agree. The fixture is unchanged. Only those two
fields now use12-decimal numerical precision, like the existing trajectory
comparisons; remaining force fields and trim keep exact equality. No engine,
rate, movement, timeout or browser assertion changes. A corrected exact-source
cloud run must pass before declaring this gate green.

## Portable cloud follow-up

Safe non-main run40422279681 on3f29b42 passed all77browser cases with one
attempt each, no flaky/skipped/unexpected outcomes. The downloaded report
artifact12697968440 matches its declared SHA256. Publication and deployment
jobs were skipped. This qualifies the existing browser suite, not live physical
activation or the following Ads case.
