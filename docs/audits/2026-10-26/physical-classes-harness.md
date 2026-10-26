# Physical result classes before emission

2026-10-26. Reader compatibility and radio cancellation are source checkpoints
723b17d/da3a5b2, with main synchronization6dfc24f and the following replay bundle
boundary9f9afb5. The new physical engine and course UI are not enabled.

## Ordered gates

1. [x] Pure shared identity API and independent review. All18 historical local
   keys stay exact;54 physical buckets are isolated by profile/mode/conditions.
   The actual72-key store fits the unchanged16,000-character bridge bound.
2. [ ] Local PB and setup intent integration. Failed read blocks write; failed
   write cannot claim a saved new record. Preserve unknown entries and enforce
   the actual complete store bound. Physical mode must be validated before any
   legacy default. Unsupported setup metadata is inspected before TTL cleanup;
   only explicit new Start/discard may replace/remove an unsupported blob.
3. [x] Source checked: additive server columns and class queries. Old rows stay unclassified,
   without backfill or invented mode. Default/Daily/mission queries preserve
   that pool and actual winning rows; explicit class queries isolate all axes.
4. [x] Source checked: actual result/leaderboard routes retain cookie/rate/privacy/scalar limits.
   Class is derived from validated context plus raw registered geometry;
   adjusted time is derived from raw finish and penalty. Physical writes stay
   closed while disabled, and legacy Daily/mission cannot acquire a new class.
5. [ ] Native history/PB/presentation and query integration preserve old rows.
   Classified native world records require explicit context, mode and registered
   geometry. Missing metadata or compatible custom legacy geometry stays
   historical-world-unclassified with its existing score-first projection.
   Explicit unknown/corrupt world records remain visible through the safe notice
   and are excluded from PBs. They never become a Short pixel race.
6. [ ] Full source/package/socket/real SQLite/build/CI gate and rollback point.
   Only then proceed to the physical engine/gates/bots/advice/recording/UI phase.

## Frozen pure API

race-record-class.ts imports only race-context. readRaceComparison and
raceComparisonKey serve the historical local PB signature; its absent legacy
mode may default to Simple. Physical mode is always explicit. Keys use the old
difficulty-wind/pro:difficulty-wind convention for legacy and
ctx:physical-cruiser-v1:short:r1:pro:easy:light for physical classes.

readRaceResultSelection serves provenance: absent/null global context stays
legacy-unclassified even when a valid mode is supplied. Explicit known context
requires explicit mode and derives classId. A mismatching client classId or one
without context is rejected. raceContextForClassId accepts only the four exact
registered IDs. These APIs are unconsumed at the initial source checkpoint.

Native eligibility must not use the local-PB Simple default to infer a missing
saved mode. Registered class/geometry checks are separate from the permissive
historical replay reader. Physical adjusted-time comparisons use the snapshot's
raw finish plus snapshot penalty, not a rounded/already-adjusted wrapper time.
No overall fastest ranking is invented across classes.

Native AsyncStorage acknowledgement remains distinct from a synchronous web
localStorage return. The later durable-finish phase must freeze identity with
race ID and protect against stale callbacks; an accurate race-history ACK does
not acknowledge a separate optimistic PB write.

## Initial source evidence

The pure API has25tests and independent source review. Together with context
and phase2 record readers,74tests/3files pass; strict web types pass. Explicit
future contexts, every key axis, unknown fields, input bytes and exact canonical
lookup are covered. This initial point does not implement a DB migration, native
projection, server eligibility, playable courses or Apple delivery.

The initial combined working-tree source gate passes1363web tests/151files and
525native tests/73suites, including the separate Sternik guarded-exit diagnostic
follow-up. Production build and the unchanged6.5MiB budget pass; the unconsumed
pure API introduces no client route dependency. Types and scoped lint pass.

Current release64 remains frozen at ef180df with its separate native G2 and
Apple gates. No file in this phase enables PHYSICAL_RACE_EMISSION_ENABLED.

Consumer foundation, aggregate local evidence and still-required UI/native durability gates: `docs/audits/2026-10-26/physical-consumers-harness.md`. Steps2,5and6 remain incomplete; source/schema coverage never enables physical emission.
