# P04: explicit physical fleet checkpoint

This is primary completion-program work. Radio source916/native acceptance
remains separate. Ads/eSail are background extras.

## Contract

- `src/lib/race-physical-fleet.ts` is an unwired transaction for one to five
  physical-context boats. Every driver, canonical course, progress state and
  versioned memory is validated before work on copies. A bad second entry
  cannot partially change the caller.
- One frame is exactly one 30 Hz simulation tick. Integer bot ticks advance
  during countdown independently of the official race clock. Countdown cannot
  award start/gates. Pause does not call the frame API.
- `src/lib/race-physical-bot.ts` owns metric path/recovery and bounded traffic
  advice. It does not change legacy `boat.autopilot`, the legacy planner,
  shared forces/helm rates or generated server behavior.
- All boats are perceived before any moves. At most 14 candidate headings use
  24 half-second reachable-turn samples over 12 seconds, at a half-second planning
  cadence. Prediction uses present speed and explicit steering. It does not
  guarantee future human input/acceleration or decide RRS responsibility.
- Bot prediction and actual input use the same physical helm. Human helm,
  course assist and sheets retain their supplied input. Traffic advice changes
  bot steering only, never speed, position or course credit.
- Progress uses immutable propelled endpoints before hull separation.
  Finished boats retain their first finish and do not block others. No result,
  PB, replay, network event or diagnostic physics stream is emitted.

## Corrected observations

The private predictive prototype completed 18 seed 3 journeys: three profiles,
0.65/1/1.3 shifting wind, ordinary/early starts, five boats, actual 30 Hz forces
and unchanged480/1200/2400 second limits. This is experimental evidence, not
automatic acceptance of a later port.

An earlier overlap counter sampled positions after collision separation. It
cannot establish zero contacts; that inference is withdrawn. The following
observer compares actual post-separation positions with immutable propelled
endpoints and counts separation-response frames. It does not invent a grazing
contact or judgment.

The first public port passed 17/18 fleets and failed weak short early, with four
finishes by 480 seconds. Its accumulated floating clock differed from the
fixed-step prototype. That failure is retained. The reviewed boundary now
requires 30 Hz and uses integer ticks, including during countdown, independently
of the official race clock. The following complete 18 case run passes; no case
deadline, fleet size, gate, force constant or assertion was relaxed.

## Current gates

- 39 contract/integration cases pass: 18 fleets, invalid/foreign state, bad second
  driver, ownership, step sizes, human force/steering parity, countdown
  planning, real separation without false gate credit, and reachable-turn/metre
  predictions.
- The preceding combined force/progression/legacy/server drift run passed 112
  cases. Full current source/build/packages/browser gates follow separately.
- All original eight private research files and their manifest remain exact.
  Rejected start-lane proposals and the first public-port failure are preserved.

## Not closed

Physical emission is OFF. Hardware/buoy response, coupled contact observations,
judging/guidance, recording, course/mode selection and installed acceptance
remain mandatory before activation. No new turning model in TestFlight or
completion of the whole P04-P12 program is claimed.

## Completed source gate

[Input-bound source proof](checks/physical-fleet-source.json): all 1760 web
tests in 171 files and 589 native tests in 79 suites pass. Root/native types,
lint, unchanged three installed packages/content twins, generated server,
physics/real sockets, production build and unchanged size limit pass.
The current final matrix passes all 18 seed 3 journeys and measures zero actual
separation-response frames by comparing immutable propelled endpoints with
returned positions. This qualified measurement does not assert absence of
grazing contact or certify judging.

The live legacy force/server source and all installed-package bytes remain
exactly unchanged from916. Its82case browser proof remains evidence for those
assets, not a claimed new current-source browser run or activation of this API.
Hardware, recording and installed physical racing still follow in order.

## Following hardware observations remain red

A following uncommitted swept-circle observer tests actual immutable propelled
segments before response. It observes hull pairs and all three canonical mark
envelopes, including the larger committee envelope. It neither invents RRS
responsibility nor changes motion or emits a diagnostic stream.

The first strengthened18journey matrix detects mark-envelope intersections in
17journeys. The preceding completed source gate did not measure mark contact
and cannot claim those courses are ready for hardware. A separate observer
fixture initially crossed a real buoy unintentionally; moving that pure
cross-at-different-times fixture away from hardware preserves its intended
contract.

The subsequent draft adds static hardware to bot prediction, shared actual
water bounds and fine heading candidates, preserving intended turns through
the wind. Three private weak-wind probes then show5/5short ordinary,4/5short
early by480seconds and5/5long ordinary, with no observed envelope/contact
response in those probes. The short early failure remains red. No deadline,
hull, capture gate or zero-contact assertion is relaxed.

The recoverable local draft is stash80a67308f9882054b3b43de44a961eb4b3207192;
original failed logs and distinct private observer/proposal files are preserved
outside Git. It is separated temporarily to record the radio test-only
readiness checkpoint. Restore and finish it before claiming a following
physical source gate. Nothing in this draft reaches the live game or69binary.
