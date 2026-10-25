# Release63: rotary SRC input, diagnostics and visible guide corrections

Status: candidate, not delivered. Native62 remains immutable at e3d70a1 and is
available in Self. Build63 was unused in a read-only ASC inventory at
2026-10-25 17:49:10UTC. The first physical API checkpointa01c31a is committed;
physical race movement, profile selection and new results remain disabled.

1. [x] Reproduce the compact native status clip:402px crosses the old400px text
   breakpoint while native Exit adds a fourth toolbar control. Keep the radio
   and scrollable task separate. The new header uses a full status row below
   controls under640px, automatic height and44px actions.
2. [x] Inspect actual production guide copy. Eight headings in JSX attributes
   and three cells containing equals signs were absent from enumeration. Add
   only those15new resources, including4literal equipment labels, in all7
   languages; preserve every old resource/alias/value, protocol phrase and
   saved-progress identifier. Keep the narrow legacy alias compatibility.
3. [x] Label guided Back for its existing previous-screen route; inline guide
   close still stays on the guide. Align Foundation content edges at20pt and
   make default informational Sternik values neutral. Sternik stays Polish.
4. [x] Expanded source gates completed after the owner's DIAL/diagnostics requirements below. The
   first1b92567 source passed the following bounded checks and is preserved;
   freeze the expanded source and rollback commit again. Independent language review passed.
   Complete web/native tests, TS/lint/map/dash/build/budget, current generated
   catalogs and all3offline packages. Match real3D/foundation browser contracts
   already reviewed in the site lane; preserve assertions and explicit budgets.
   Local gate1116web/126files,452native/69suites plus9tools, full native check,
   web/native TS/lint and build pass. StaticJS6.49/6.5MB, max0.94/2MB.
   All105new catalog values received independent semantic review; literal
   inscriptions and PTT/16-C/DIAL meanings remain consistent with the
   [Icom manual](https://icomuk.co.uk/files/icom/PDF/productManual/IC-M330_330G_ENG_IM_10.pdf).
5. [ ] Safe exact-source browser CI: all7languages and320/375/390/400/402/430px
   plus landscape, actual waiting -> held DIAL -> complete -> free/Back.
   Native Exit is only a layout stub in that test. Validate all text bounds,
   action44px and dock90px. This does not replace installed WK acceptance.
6. [ ] Exact Release Simulator: upgrade an existing62 container without clear,
   compare retained rows; actual RU/PL native402status/guide/power/task-scroll/
   Next/Back/Exit. Observe Foundation gutters and neutral Polish Sternik.
   Read actual guide headings/cells in7languages through the public UI.
7. [ ] Freeze increasing build63, generate/sign/archive/export and independently
   verify exact source, local assets/fonts, purpose/privacy strings, speech
   patches and native UUIDs. Validate/upload/import and exact Self/8notes GET.
   Only then report delivered. Owner physical phone/speech/performance remain
   separate until observed. No public App Review submission is implied.

Root owns maps, packages, version, commits and ASC. Source is frozen through
native provenance verification. Each completed stage has a rollback commit.
Website publication is separate:72b4f57 is healthy and immutable-image checked,
but final production E2E has failures under investigation. Keep that result
visible; native delivery cannot close a red website gate.

Evidence before this correction: [guide leakage](checks/34-production62-guide-language-leaks.png),
[working RU lesson1](checks/35-production62-radio-ru-lesson1.png),
[public Orbit/pause](checks/36-production62-race-orbit-paused.png),
[manual Pro35to30](checks/37-production62-pro-manual-trim.png),
[catalog preservation](checks/radio63-catalog-preservation.json).
The next physical metadata stage remains ordered in [the portable plan](physical-courses-next.md).

## Expanded owner requirements and newly exposed Back defect

The owner requested finger rotation of the radio DIAL with a visibly moving
index and retained arrows, mandatory on the website, plus logs that explain
accepted, unchanged, rejected and failed operations. These are implementation
requirements before the next delivered candidate, not completed features here.

- Preserve tap VOL/SQL and1000ms power hold. One pointer owns the gesture;
  rotation cancels tap/hold, cancel/blur/model/Inspect/unmount clears timers.
  Central grabbing supports left/right motion, outer grabbing supports circular
  motion; all models/skins keep keyboard and visible direction alternatives.
- One bounded typed diagnostic core is shared by web/native. Safe finite codes,
  booleans and numeric projections only; no message text, audio/transcript,
  MMSI/names/GPS/positions, raw storage, URL/query/token or exception stack.
  Local48h storage,200entries/64KiB and explicit journal clear/copy. No automatic
  upload or analytics coupling. Append-only validated embedded batches remain
  separate from commands and current persistence allowlists.
- Radio, race/trainer controls, startup/save/retry and actual navigation need
  truthful command/result adapters. Never record a physics tick as a user
  action or a queued save as durable success. The panel lives in reserved
  docks/settings; it does not cover the radio or boat. List actual integration
  coverage and remaining gaps before claiming all functions are logged.
- Safe56 on SITEb31c2b3 exposed7actual course-return failures: free URL restored
  while Obsluga stayed mounted. Language cleanup used replaceState(null),
  discarding framework navigation state. Preserve the current state; repeat
  all7real Back flows. The first run also reached replay select/high/value at
 58.9s of its60s budget. Only that test gets120s; all assertions remain.
- First1b92567 generated18/archive33/Simulator package checks passed. It was
  not exported or uploaded; archive and Simulator app are preserved with the
  source suffix. Actual native26.5 upgrade retained7rows, SRC1% and lesson2;
  new status row was readable. Back/DIAL/new diagnostics still require the
  expanded exact binary. Physical owner phone is not certified.


## Expanded source checkpoint, 2026-10-25

- Actual browser402px and desktop checks confirm held power, rim rotation
  changing VOL16to20, limit no-op and arrow20to19, visible journal and reserved
  instrument/panel geometry. Actual Back restores the free-practice component.
  This is source/browser evidence, not installed63 or physical-phone acceptance.
- DIAL42focused checks and race/trainer76focused checks passed before expanded
  full gates. Independent reviews found and corrected native WK journal revival
  and coalesced a stalled native journal writer. Native adapter/host checks and
  exact installed acceptance are still required.
- A first full web test run during concurrent builds hit3existing timeout
  budgets;1198 assertions passed. Repeat without CPU oversubscription using
  four workers, retaining every timeout and assertion.
- Static chunk inspection found copy/panel duplicated across9/8route chunks.
  A small shared title plus one preloaded panel split point restores6.48/6.5MB
  with the same features; the limit remains unchanged.
- Exact old-source SITEf857 browser control run40229374197 passed56cases:
 55first-pass plus1Pro retry,0failures. All7Back regressions pass; publish, deploy
  and production tests were skipped. It does not certify the expanded source;
  keep PR83 draft until the new exact source passes its own gates.
- Integration details and explicit open coverage: [diagnostics](diagnostics63.md).


## Source freeze gates for expanded63

- Final expanded native check:472tests/71suites plus9release-tool checks,
  three fresh offline packages, content synchronization, lint and TypeScript
  all pass. Two old navigation test mocks were adapted to the actual
  usePathname/diagnostic boundary; return and durable-save assertions remain.
- Production web build, strict TypeScript and full ESLint pass. The current
  static chunk total is6.49/6.5MiB; largest0.94/2MiB. Shared panel/copy remains
  single-delivery rather than9/8duplicate bodies. All7catalogs enumerate3761
  resources and7503aliases with missing0; the new rotary hint replaces only
  its prior arrow-only copy.
- DIAL/diagnostic unit tests also cover native exit flush ordering. Native
  global-clear and coalesced stalled-write regressions pass.
- Generated sailing HTML retains vendor TSL template whitespace already
  present in the prior bundle. Source/docs diff whitespace is clean; do not
  edit generated shader literals solely to change a Git whitespace report.
- Device Hub capture recovered after raising/zooming its window. The actual
  old candidate remains at Polish lesson2; install the expanded exact Release
  Simulator build before claiming its DIAL, Back, journal or upgrade pass.

- Final source-freeze web run:1206tests/138files PASS with four workers. No
  timeout budgets or assertions changed. The four new fixed-route cases and
  pre-exit diagnostic flush order are included. Source map now covers676
  tracked code files. ASC GET2026-10-25 20:31:36UTC still finds no build63;
 61known builds, latest62VALID, writes0.
