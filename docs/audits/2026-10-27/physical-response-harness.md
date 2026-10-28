# P04: coupled physical travel response

This is an unwired development checkpoint under ADR-0013. The current local
source gate is the following stable-navigation section below. It does not close
P04 or permit physical emission, PR merge or TestFlight69delivery.

## Implemented boundary

`src/lib/race-physical-response.ts` validates the canonical context/course and
all one-to-five identities/motions before allocating owned bodies. Finished
boats remain excluded. The caller and every supplied endpoint stay untouched.

Initial hull/mark overlap is resolved with sorted IDs under coupled water and
hardware constraints. Projection has a256pass cap and unchanged1e-7world-unit
tolerance. An initial128pass draft failed the five-hull corner fixture; the
following finite projection converges without relaxing the bounds/clearance
assertions. Unresolved constraints reject the frame atomically.

All boats then share one normalized tick clock. Each actual circular impact
truncates the involved boats' remaining travel; other boats continue, including
possible later contact with a stopped hull. A planned encounter cancelled by
an earlier collision never becomes a contact. Tangent/escape travel and
unrelated boats stay unchanged. A near-resting1e-8step fixture protects the
normalized closing tolerance against a zero-time iteration loop.

Closing contacts keep ADR-0004's existing time-based bump coefficient/share;
resting, separating and wall-only constraints have no extra speed loss. The
fleet applies the same multiplier to its public and force-state speed. Shared
force laws, helm rates and generated legacy/server source stay unchanged.

`src/lib/race-physical-fleet.ts` consumes the response before progress. Its
returned motions start after any overlap recovery and end at actual travel.
Recovery pushes and an intended route through committee hardware cannot award
gates. This is a conservative circular stop for the remainder of one30Hz tick,
not a claim of detailed hull impulses, sliding, yaw or damage.

## Preceding8ccd verification and RED gate (preserved)

The [input-bound proof](checks/physical-response-source.json) keeps all source
hashes and full54research rows. Eleven response contracts and38fleet tests
pass, including the unchanged18full five-boat zero-contact journeys and the
two actual short weak easy-early/hard-ordinary cases. Full source passes1783web
cases in173files and589native cases in79suites. Its exact [cloud UI proof](checks/physical-response-browser8ccd.json)
has82first-attempt cases; that does not make the following fleet RED result
green or establish installed physical acceptance.

The final54current-ID/difficulty sweep finishes53whole fleets, with45strict
clean cases and zero mark-contact cases. Nine moving hard early starts have
actual hull encounters. Short/weak/early/hard leaves ai1 unfinished by the
unchanged480second limit. Real trace shows start249.667, east349.833,
north362.8, first downward west-line crossing382.5atx343.25outside its gate,
and eventual valid west/mark467.567. That late gate is not silently credited or
converted to a green finish. This case must be addressed in bot start/traffic/
missed-gate recovery before physical activation. The prior d580candidate's54/54
result remains its own pre-response behavior, not proof for this checkpoint.

The old observer's pose-versus-motion endpoint counter now measures a different
contract: returned poses equal constrained travelled endpoints. Its zero value
does not establish absence of contact or recovery. Actual contact counters and
initial-overlap events remain authoritative; detailed samples cap at20frames.

## Next ordered work after8ccd (historical)

Keep emission OFF. Resolve the expanded early-hard bot recovery case with the
same deadlines, then feed actual motion/contact truth into conservative
optional educational judging, independent guidance and recording/lifecycle.
Live control/course wiring and installed offline ordinary/Pro acceptance still
follow. Source development is not delivery. Rollback is exactd580c2f.


## Current local source: stable gate entry and weak-steerage turns

The [final input-bound source proof](checks/physical-bot-stability-source.json)
passes109targeted contracts,1789web cases in173files,589native cases in79suites
and9release-tool cases. Types/lint, three offline packages/content twins,
legacy generated server/real sockets, build/unchanged budget and map/dash are
checked separately from cloud and installed acceptance. All installed HTML,
shared force/helm source and legacy/server code stay unchanged.

Among predicted clear headings, bots now prefer a turn that does not cross the
next rounding line outside its canonical finite gate. The gates come from the
same descriptor as actual progression. Prediction never awards a gate or
changes human input; uncertain future traffic/acceleration remains uncertain.
The first rounding-aware draft finishes the54seed3fleets, including the former
8ccdshort/weak/early/hard miss. Additional short seeds1/7then expose a separate
weak-steerage recovery failure: two of five do not finish seed1early-hard.
Applying the gate preference to start/finish too did not change that failure
and was not retained.

A real trace shows player heading hovering near5degrees for about60seconds
while safe rearward targets alternate across180degrees. Half-second shortest
turn decisions kept reversing the rudder; actual hull contacts occurred only
in the first20seconds. A chosen turn side is now retained while the route target
is behind the boat and the existing shared helm has reduced speed authority.
Safety and proper gate entry retain priority. Full shared authority or a
frontward route target releases this ephemeral memory. No extra turn rate,
speed clamp, position move, trim help or countdown change is introduced.
Memory is closed/validated, copied by the fleet and never persisted as legacy
boat.autopilot or user steering.

An initial all-speed hysteresis draft finishes90fleets but adds398mark-contact
frames in short/strong/early/hard. That rejected draft and its manifest are
preserved privately. The corrected scope derives reduced authority directly
from the unchanged shared helm helper, without another speed threshold.
Regression tests verify actual turn direction at weak/full authority, owned
valid state, rejected invalid direction and the full former seed1deadline case.

Final fixed-source research finishes90/90fleets:54all-profile seed3cases plus
36short cases at seeds1/7. All stay within the original480/1200/2400second
limits. There are zero mark-contact cases. Fifteen moving hard early-start
cases retain hull encounters;75cases meet the separate strict clean criterion.
The original18five-boat zero-contact journeys also pass unchanged. These are
specified autonomous conditions, not all seeds, arbitrary opposite/stopped/
missed-gate starts, human Pro, guidance or actual installed physical racing.

Exacte414 now passes both push/PR CI and its downloaded, digest-verified
[82first-attempt browser gate](checks/physical-bot-stability-browser-e414.json).
There are no flaky, skipped, unexpected or report-error cases. Image
publication, VPS deployment and production E2E stay skipped on this non-main
ref. These are preserved-UI journeys; they do not call the unwired physical
fleet or replace its remaining control/judging/recording/installed gates.

## Current next gates

Keep emission OFF. Actual circular response and these bounded autonomous
navigation gates are locally checked. Conservative optional educational
judging must consume real encountered contact/closing truth, not hypothetical
cancelled paths or a legacy8unit CPA. Then independent human guidance/ribbon,
recording/finish-window lifecycle, remaining consumer/mode/course gates and
exact installed offline ordinary/Pro acceptance follow. The full completion
program and69delivery remain open. Rollback remains exactfa42626/8ccd9b0.

## Following source: actual impact evidence for the judge

The response and public fleet result now expose separate initialContacts and
impacts. Initial touching/overlap can be observed without an established
impact speed. Actual hull/mark encounters retain their common tick fraction,
owned immutable metric centres/linear velocities and normal closing speed.
Axes retain race-world-v1's origin, east x and south y; they are not geographic
coordinates. No transcript, telemetry, recording or rule event is added.

Every simultaneous encounter reads velocities before any body is stopped.
A later hull encounter sees the earlier stopped body's zero velocity. A
cancelled proposed encounter is absent. Wall-only constraints are excluded;
an actual grazing hull encounter retains zero closing speed. An initial overlap
followed by real closing remains two separate facts. Averaging the truncated
travel endpoints would understate impact speed and is explicitly tested.

Fourteen response contracts and a shared-force fleet collision exercise these
facts alongside the preserved full-journey gates. This does not yet assign
fault, implement RRS history/mark-room, enable penalties or establish human
Pro/advice/native acceptance. Those remain the next required product gates.

The [input-bound source proof](checks/physical-impact-evidence-source.json)
records113targeted/1793web cases,589native cases and9release-tool cases, with
types/lint, offline packages/content twins, real sockets, production build,
unchanged budget and map/dash. All112budgeted chunks total6814872bytes under
the unchanged6815744cap; the104JavaScript subset is6675906bytes. All three
installed HTML files and force/navigation inputs remain identical. The prior
90fleet research remains bound to exacte414; it was not repeated here.

### Following judge contract, not implemented

Primary reference checked2026-10-27: World Sailing's [corrected RRS2025-2028](https://www.sailing.org/wp-content/uploads/2026/04/2025-2028-RRS-with-Changes-and-Corrections.pdf),
including20April2026corrections, and its [Version2change document](https://www.sailing.org/wp-content/uploads/2024/12/Changes-and-Corrections-Version-2.pdf).
The original2025PDF remains historical. No physical rule evaluator is certified
by this source-data checkpoint.

Implementation implications from Definitions Racing/Start/Finish and rules
13-16,18,31,43: the judge needs preparatory/start/finish-clear phases and turn/
room history. The current fleet `racing` flag controls progression; false in
countdown cannot mean that all educational obligations are absent. Finished
lap2boats currently leave physical simulation immediately, so post-finish
clearance/mark events require the separate finish-window lifecycle.

Metric CPA must use real seconds, never the legacy8unit velocity. Impact
closing does not establish fault. An unknown initial overlap, forced mark
touch or uncertain room needs an explicit uncertain/exonerated outcome.
Actual tangent mark touch must remain distinct from a severity threshold for
closing hull collisions. Any training seconds must stay identified as game
scoring, not the official turns procedure. These are design gates inferred
from the cited rules and current code, not implemented judging behavior.
