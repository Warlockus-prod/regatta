# P04: coupled physical travel response

This is an unwired development checkpoint under ADR-0013. It does not close
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

## Verification and remaining RED gate

The [input-bound proof](checks/physical-response-source.json) keeps all source
hashes and full54research rows. Eleven response contracts and38fleet tests
pass, including the unchanged18full five-boat zero-contact journeys and the
two actual short weak easy-early/hard-ordinary cases. Full source passes1783web
cases in173files and589native cases in79suites. Exact-commit cloud acceptance
and future installed physical acceptance remain separate.

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

## Next ordered work

Keep emission OFF. Resolve the expanded early-hard bot recovery case with the
same deadlines, then feed actual motion/contact truth into conservative
optional educational judging, independent guidance and recording/lifecycle.
Live control/course wiring and installed offline ordinary/Pro acceptance still
follow. Source development is not delivery. Rollback is exactd580c2f.
