# Radio16/C cancellation follow-up

2026-10-26 source checkpoint after reader rollback723b17d. The frozen APP64
sourceef180df and its archive are unchanged. This follow-up is not a delivered
TestFlight binary or physical-device gesture acceptance.

## Actual defect and correction

The generic Key bound pointercancel to pointerup. On16/C that called callUp,
which dispatched a short CH16 command unless its one-second hold had fired.
The actual old source reproduces the canceled-touch command in the regression.

Key now accepts an optional distinct cancel callback.16/C uses callCancel first,
then records one safe local radio.gesture event: control16c, actioncancel,
outcomenoop, sourcepointer, reasonpointer-cancel. A failed recorder cannot prevent
timer cancellation. No transmission text, voice, MMSI, GPS or raw storage enters
this event; existing journal retention and privacy limits are unchanged.

Pointerleave and cleanup still call the ordinary cancel function without claiming
a pointer-cancel event. Real tap and1000ms hold remain distinct. AQUA and PTT
retain cancel-as-release, so a canceled hold cannot leave them active.

The catalog scanner's human-copy heuristic initially treated the internal16c ID
as an untranslated resource. It now excludes that exact diagnostic ID; visible
[16/C] labels and all guide content remain in the actual generator regression.
Catalog3761resources/7503aliases has missing0 in every language, without new
translation values or changed protocol phrases.

## Verification and remaining gate

- 29 targeted tests/3files pass: RadioFront7, rotary gesture17, hook5. They cover
  both radio models and layouts, cancel followed by release, no delayed command,
  real tap/hold, AQUA/PTT release, exactly one valid diagnostic row and recorder
  failure. The old source fails the canceled-touch contract.
- Combined frozen source passes1330web tests/149files,524native tests/73suites
  and9release-tool tests. Strict types, scoped lint, map and typography pass.
  Full web lint has0errors and15 existing unrelated warnings.
- Radio offlinef926b850b1df is6,264,848bytes, SHA256
  2a6267e777383876a3aa3dd535d7124e08d22bd27bd7281207c12554d7d0dcdc.
  The actual catalog check and offline package freshness pass after regeneration.
- The production budget remains6,815,577/6,815,744bytes, with167bytes headroom;
  neither the generator-only exclusion nor this document is client runtime code.

Installed exact-source cancellation and full radio/device acceptance follow the
native release gate. The source tests do not claim owner iPhone touch behavior,
new Apple delivery or complete diagnostics coverage across the whole product.
