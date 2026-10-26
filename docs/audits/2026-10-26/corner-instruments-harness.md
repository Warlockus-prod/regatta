# Persistent race corner instruments

Owner request,2026-10-26: a small map and wind indication should remain visible
beside the boat, in screen corners. This NEXT source is separate from delivered
TestFlight64, sourceef180df. No new Apple delivery is implied by source checks.

## Behavioral contract

- Solo Simple/Pro and multiplayer use the same corner component. True wind
  stays at upper-left; the live mini-map stays at upper-right through Helm,
  Sails, Map and Settings. Speed/time/position remain in the header.
- The map uses actual canonical course/fleet/wind snapshots, with one uniform
  scale and no second engine, timer or synthetic course. Compact clipping
  leaves room for edge boats. No local/private boat IDs become labels or logs.
- The mini-map is a44px-plus button opening the existing full Map in the dock.
  Its saved on/off setting defaults true for old assists; malformed values are
  never coerced. Native uses the existing allowed key, bridge and storage bound.
- Only the map button owns pointer input. The passive wind card and surrounding
  corner region pass camera gestures through. Showing/hiding the map does not
  resize the canvas; the reserved steering/sail dock retains its layout.
- Existing Compass/Arrows/Both/Off choices remain independent. Numeric true
  wind remains visible in the corner even with visual wind aids off.
- Actual mini-map preference changes have a finite private-content-free boolean
  journal entry. Both current and previous values are strictly validated.
- Both new action/setting resources have all7language adaptations. Existing
  course labels, wind terminology and units remain canonical.

## Source and observed browser gates

Focused source gate51tests/5files passes, including all7actual cockpit action
and setting branches. Shared SVG tests retain actual marks/fleet and full-map
semantics; the compact root is valid button phrasing content. The native host
test preserves miniMap=false through actual AsyncStorage and a complete host
unmount/remount, while retaining the original required boolean guards.

Actual local production UI: Pro clock advanced to23.5seconds before Pause;
390x844 and320x568 show both corners with the boat visible between them. Tap
opens the real full Map, and Settings can hide only the mini-map while wind
stays visible. Screenshots are retained outside Git. Final browser geometry,
cold preference restoration and complete source gate are recorded with the
checkpoint proof; these observations are not installed native G2.

The first71-case gate is preserved as red evidence in the build65harness. Its
new corner case passed but took105.9seconds, and two older diagnostic expected
objects lacked the new field. Corrected full equality checks and independent
geometry/cold-persistence journeys now select72cases in the same eight files.
Every existing assertion, five bounds samples,44px target, actual dock/reload
actions, canonical journal and25s/15s/120s budgets remain. Fresh cloud acceptance
is pending until the exact run is recorded separately.

## Delivery gates still separate

Regenerate and verify the three offline packages, strict web/native types,
native lint/content twins, all unit tests, real sockets, map/typography and the
unchanged build budget. Freeze source before next installed G2 and any Apple
submission. TestFlight64 and its archive stay immutable. Physical emission
remains OFF; the corner instruments do not alter the pending physics/PB gates.

Final local source gates:1546web tests/156files,565native tests/76suites and
9release-tool tests pass. Strict web/native types, scoped web lint, full native
lint, content twins and3fresh packages pass. Production build and the unchanged
6815744-byte limit pass at6815307bytes/111files, with437bytes headroom. Radio
4d6dbd13aa10, sailingf1e7d8edd8cd/222inputs and Sternik06fb7a5862b3 are NEXT
packages, not the frozen64 assets. Exact source/CI/installed proof stays separate.

The following65candidate and exact native delivery sequence live in
`release65-harness.md`.
