# Automatic sail transfer and visible wind, 2026-09-08

Scope: `/simulator2` on the website and the same online scene in the iOS app.
The user steers and adjusts sheet easing. The simulated crew changes working
sheets automatically; there is no extra tack or gybe button.

## Findings and changes

- The 3D adapter inverted sail-side signs. In the GLB frame +X is the bow,
  +Y is up and +Z is starboard. A positive Y rotation sends the aft clew to
  starboard. The old adapter sent it to windward. Both sails now use the
  physical lee side, with numerical checks on the actual clew geometry.
- The old adapter discarded the signed engine heel, reapplied tack instantly,
  then inverted it in the renderer. The renderer now preserves signed engine
  heel and its existing relaxation through a turn.
- Sail side was an instantaneous sign change with only a short render lerp.
  A stateful rig now remembers the previous side near head-to-wind and dead
  downwind. Three-degree hysteresis prevents repeated flipping at either axis.
- Slack sheets limit opening; they cannot hold an unloaded sail against the
  air. Approaching head-to-wind, both sails trail toward the centreline and
  lose fill. Their heads and luffs remain attached. They are not lowered or
  reefed during a normal turn.
- Tack and gybe have separate states. Main and jib travel at bounded, different
  rates. Jib loading recovers later as the assisted crew takes up its new sheet.
  User sheet levels remain unchanged. Hard-sheeted central booms retain the
  new tack instead of choosing an arbitrary cloth side at angle zero.
- An optional resolved rig input to the shared engine supplies the same actual
  angles, sides and loading used for the scene. An unloaded sail no longer
  produces full drive while its drawing shows luffing. Other callers retain
  their previous steady-trim behavior. The race-server mirror was regenerated.
- Apparent wind keeps the engine's actual signed angle, including residual
  leeway; its sign is no longer reconstructed from true-wind tack.
- One-pixel pale wind lines became two instanced meshes with dark shafts and
  cyan arrowheads. A permanent bow-relative instrument shows apparent wind,
  angle and true wind. Turning off the scene arrows leaves the instrument up.
- The default camera now looks across the correctly positioned sails. The old
  camera was nearly edge-on after correcting the sail-side bug.
- Mobile keeps the wind instrument and both primary sheets accessible while
  giving more height to the yacht. Fine settings scroll inside their panel.
  All new UI copy is supplied in RU, EN, PL, ES, FR, DE and IT.

## Sailing references and model boundary

[RYA, points of sail](https://www.rya.org.uk/training/do-you-know-your-points-of-sail/)
explains sail unloading in the no-go zone, easing/bearing away and tacking
through the wind. [North Sails, improving tacks](https://www.northsails.com/en-us/blogs/north-sails-blog/how-to-improve-your-tacks-north-sails)
describes preserving momentum and the crew's roles in releasing and taking up
sheets. These guide behavior, not numerical coefficients for this synthetic boat.

Automatic jib-sheet transfer is a game assistance feature. A conventional
crewed yacht needs sheet handling. The gybe assistance bounds the crossing;
it does not implement mainsheet friction, rig loads or an injury simulation.
The existing educational no-go threshold remains 42 degrees. There is no new
CFD or calibrated cloth inertia claim: transfer rates, recovery time and the
pressure/fill curve are bounded simulation choices.

The Blender source and GLB did not need another export: sail cut and attachment
geometry are unchanged. This correction belongs to the live rig/force adapter.

## Verification

- 123 physics, 3D, Trainer and race-mirror tests pass (including 10 new rig
  integration cases). Opposite tacks, gybes in both directions, zero drive in
  irons, held sheet levels, angular-rate bounds, central booms, axis jitter,
  calm air and 20/60 FPS convergence are covered.
- TypeScript, lint for all changed TS/TSX files, whitespace and typography pass.
- A root-wide lint invocation also traverses ignored local `.claude/worktrees`
  and reports pre-existing errors across those copies and other modules. It
  is not a clean project-wide lint baseline; no blanket lint-pass claim is made.
- Local browser: steering advances heading, a head-to-wind pose unloads both
  sails, crossing the wind displays the tack state, the opposite side fills.
- Local iOS embed size 390x680: no horizontal overflow, canvas 368x236 px,
  permanent wind instrument and both sheet sliders visible.
- The existing browser smoke test now guards default airflow visibility and
  keeps the wind instrument visible when arrows are disabled.
- Native checks also pass: 114 tests, content/offline-bundle validation,
  TypeScript and mobile lint.

## Release verification

- Runtime changes: `2f0fb61`. Deployed source: `cb187ba`, which also separates
  the airflow toggle check from the existing camera/keyboard smoke test.
- [Deployment 34231339102](https://github.com/Warlockus-prod/regatta/actions/runs/34231339102)
  passed build/pre-deploy checks, VPS deployment and production browser E2E.
  The existing camera smoke test used the configured retry policy on software
  WebGL. This is a functional verification, not a measured device FPS result.
- The live `/simulator2` route and health endpoint were checked after deployment.
  The production browser displays the new wind instrument and scene arrows.
- iOS 26.5, iPhone 17 Pro Max Simulator, app 1.6.1 (42): opened the native 3D
  entry and visually verified the updated production scene, wind instrument,
  airflow arrows and both sheet sliders. See the saved
  [native screenshot](mobile/audits/sail-transfer-2026-09-08/sailing-iphone.png).
- Native gesture verification is limited: WKWebView controls were not exposed
  through the available accessibility tree, and coordinate input returned
  `noWindowsAvailable`. Native held-steering input was therefore not separately
  verified. Actual steering and wind crossing were exercised in the browser;
  both tack and gybe directions are covered by the rig integration tests.
- The app embeds the deployed `/simulator2` route. This update is available in
  build 42 without a new native binary or App Store submission. Leave and reopen
  the 3D screen to load fresh HTML if it was already open during deployment.
