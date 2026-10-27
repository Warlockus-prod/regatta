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
- All boats are perceived before any moves. At most17candidate headings use
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

Physical emission is OFF. Hardware/buoy response, model-aware judging/guidance,
recording, course/mode selection and installed acceptance
remain mandatory before activation. No new turning model in TestFlight or
completion of the whole P04-P12 program is claimed.

## Preceding fleet source gate (b22312a)

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

## Following contact checkpoint

The following source swept-circle observer tests actual immutable propelled
segments before response. It observes hull pairs and all three canonical mark
envelopes, including the larger committee envelope. It neither invents RRS
responsibility nor changes motion or emits a diagnostic stream.

The first strengthened18journey matrix detects mark-envelope intersections in
17journeys. The preceding completed source gate did not measure mark contact
and cannot claim those courses are ready for hardware. A separate observer
fixture initially crossed a real buoy unintentionally; moving that pure
cross-at-different-times fixture away from hardware preserves its intended
contract.

An intermediate draft added static hardware, shared water bounds and fine
headings, preserving intended turns through the wind. It still failed short
early at4/5by480seconds. A full nominal future-route forecast then worsened
actual contacts and deadlines; it is rejected and preserved in a distinct
private eight-file manifest. A shorter hardware horizon also failed and was
not retained. No deadline, hull, capture gate or contact assertion is relaxed.

The corrected source keeps the12second reachable-turn horizon. It reads the
last actual avoidance heading of another bot instead of the nominal route
heading that boat is steering away from. Hypothetical future reactions remain
uncertain. Human input prediction remains explicit and unchanged.

Start recovery derives its minimum24.6m radius from the18m rounding radius
plus6.6m hull radius, caps existing memory to36m and constrains the whole circle
to clear both line endpoints. The prior42m minimum at18m drop could not fit
both canonical hardware envelopes between the100m endpoints. An independent
circle-distance test covers all profiles, spawns,0/4/8kn and both turn sides.
Actual movement/force/helm laws and hull sizes stay unchanged.

All89targeted cases pass, including41motion checks, seven contact observations,
five prediction/recovery checks and36fleet cases. All18journeys finish every
ordered gate with five boats within the original480/1200/2400second limits;
their actual swept-envelope observation sets are empty. This measures the
specified circle model and seed3conditions, not arbitrary future steering or
full RRS liability. The old post-separation overlap claim stays withdrawn.

The preceding draft remains recoverable as stash80a67308f9882054b3b43de44a961eb4b3207192;
failed logs and distinct private proposals remain outside Git.

Exact09537f7 [following source proof](checks/physical-contact-source.json)
passes1769web cases in172files and589native cases
in79suites, root/native types/lint,9release tools, generated server/real sockets,
all three package freshness/content checks, catalog, production budget and
map/dash. The first full web run passed all1769cases but had a worker RPC error
at the fleet file's60076ms. It is retained and not accepted. Installed Vitest
uses a60000ms RPC default; the long CPU-bound case sequence could starve reply
handling. Cases now yield to the Node event loop between whole journeys,
without changing engine ticks, assertions or60second case deadlines. The next
full run passes without errors, even with a longer108second total duration.
This supports the cooperative reporting correction; it does not claim every
prior local timeout had this cause.

The three HTML package bytes stay identical to89; only the sailing manifest's
source hashes change. The API has no live caller. Exact095 [cloud proof](checks/physical-contact-browser95.json), run40453750860,
passes82first-attempt journeys from a downloaded/digest-checked artifact. Those
journeys verify the preserved existing UI and do not play the unwired physical
API. Expanded54case research and physical installed acceptance remain separate. Nothing reaches the live
game or69binary; physical emission remains OFF.

## Ordered activation gates after this checkpoint

1. Run canonical spawns with the actual player/ai identities, inward initial
   headings,2/3/4opponents and all three current game handicaps. Keep fleet
   deadline/contact results separate from the autonomous all-speed-one matrix.
   This is not human Pro or advisory-driver acceptance.
2. Integrate fixed hardware response and coupled hull/water constraints.
   Progress/recording must use actual travelled segments truncated by impacts;
   recovery or separation pushes must never award gates. A free intended path
   through an obstacle is not evidence of completed travel. Verify initial
   overlap, grazing/escape, tunnelling, coupled contact and finished exclusion.
   Preserve shared force constants; any force-law change requires its ADR.
3. Feed model-aware actual motion/contact observations to optional educational
   judging. Physical CPA uses metres/real seconds, with no legacy8unit velocity
   fallback. Verify legal start versus recall, wrong-side/ordered rounding,
   conservative responsibility, deduplication and optional time penalties.
4. Add independent read-only physical guidance and its shared water ribbon.
   Verify actual human helm/course assist,30Hz/10Hz advice and1s/3s held entry,
   all profiles/winds and missed-gate/stopped/opposite-heading recoveries.
   Advice must not steer, trim or award progress silently.
5. Wire physical pose/speed, start/finish timeout, recording and finish-window
   lifecycle into one explicit solo mode/course setup. Keep all historical
   records readable and score classes separate. Enable new emission only after
   every consumer/engine gate, not merely after source schemas exist.
6. Freeze refreshed packages and repeat actual offline installed ordinary/Pro,
   wheels/sheets, orbit, map/wind, pause/Back/reentry, durable saves and retained/
   clean data on the exact native candidate before archive and Apple delivery.

These are the existing owner-approved P04-P06/P12 gates made concrete, not a
second master plan. The completion program remains the entry point. Partial gate results do not establish69delivery or physical activation.

## Actual game identities and difficulty research

A following [54case research proof](checks/physical-game-fleet95.json) retains
source095 and canonical spawns, with current player/ai IDs, legacy inward
initial headings,2/3/4opponents and the actual easy/medium/hard speed shares.
Each fleet uses a deterministic0.97/1/1.03spread, wind seed3 and the same three
profiles/wind strengths and ordinary/early starts. All entries, including the
player ID, are autonomous. This does not test human Pro, advice or native UI.

53cases finish the whole fleet. Short/weak/ordinary/hard leaves ai3 at lap1
by480seconds.39cases meet the separate strict clean research criterion;
15observe contacts. All three profiles share some start-area contact patterns.
The bounded detailed sample retains the first20contact frames, so it cannot
exclude later kinds or count every contact; the separation-response counter
covers the whole run. Input hashes remain exact after the sweep.

The initial18same-speed baseline assertions remain unchanged. These expanded
observations are not suppressed, reclassified as a full pass or used to claim
that every possible game encounter must be collision-free. Resolve actual
start/recovery/difficulty behavior and implement response/judging before
activation. The older same-speed source gate remains only its stated scope.


## Stable close-hauled avoidance boundary

A computed wind+/-45degree target may normalize to44.99999999999994. Source095
used that rounded value to allow or forbid luffing avoidance candidates. The
same obstruction at exactly45selected85degrees; a1e-11degree change selected
40degrees. This numerical branch is not a stable steering policy.

The first tolerance-only proposal forbade those temporary luffs. Its new
focused hard case finished, but the unchanged18baseline lost weak short early
and the expanded54matrix still finished only53, with35strict clean and actual
mark contacts. That proposal and its failed evidence are preserved privately,
not accepted. A temporary luff is a valid avoidance action; treating every
head-to-wind target as a route failure was an incorrect initial interpretation.

The corrected bounded candidate set permits the same temporary avoidance
luffs on both sides of45degrees. Route intent still has highest preference
among candidates whose predicted paths clear the envelopes. Prediction remains
present-speed advice, not a new force/turn model or a guarantee of future input.

The [input-bound local source gate](checks/physical-luff-source.json) passes
92targeted cases,1772web cases in172files and589native cases in79suites.
A regression checks consistent actual obstruction clearance at45+/-1e-11;
two integrated short/weak cases retain actual easy early and hard ordinary
identities/headings/handicaps. The original18zero-contact full journeys remain
unchanged and pass. Force laws, generated server and all three installed HTML
package bytes remain unchanged.

The [final54case sweep](checks/physical-game-luff.json) finishes every fleet
within the original480/1200/2400second limits;45cases meet the separate strict
clean criterion. Full counters find zero mark-contact frames. Nine hard,
already-moving early starts still have hull contacts,429/435/415frames per
wind strength, with the same start-area pattern across profiles. Those cases
are not called collision-free or accepted as judging/response proof. Detailed
pose samples cap at20; numeric counters cover the whole journey.

This closes the stated autonomous ID/difficulty deadline check for seed3.
Coupled hardware/hull response and conservative optional judging follow next.
Human Pro/advice, other seeds and installed physical racing remain unaccepted.
Exact-commit cloud acceptance follows the source commit. Physical emission
stays OFF and TestFlight68 remains the delivered binary.
