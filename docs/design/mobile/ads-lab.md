# Ads: camera and placement inspection

Owner request2026-10-27: a Settings tab named Ads, with camera scenes that can
be switched and freely inspected left/right/up/down, and test placements for
a later real SDK signal check. This is a separate temporary worktree from the
main race work. Frozen delivered68 remains sourcef7/tag68.

## Implemented prototype contract

Settings opens the installed `/ads` activity. Its same locally bundled yacht,
sea and Göcek/open-water venues are used for inspection. Native Back/recovery
returns to Settings; the main tabs yield scene/control space. There is no
remote-site fallback or new public website route.

Four presets (wide/deck/stern/high), free pointer orbit and pinch/wheel zoom,
direction buttons, reset and35/60/90degree lenses control the actual camera.
The inspection-only320m maximum accommodates the declared35degree portrait
fit, which exceeded the initial220m limit. Existing trainer/race camera limits
are not changed. The dock is beside the scene on a wide screen and scrolls
below it on a phone; it does not cover the yacht. Controls retain44px targets.

Three front-facing local test cards have fixed IDs: port-board, bow-board and
stern-board. Their gray backs are not ad fronts; all placements can be hidden
individually. These are test stands, not proposed production inventory or a
claim of SDK viewability. Texture resources are disposed when removed.

The local journal retains only the last40preview actions in this session.
The general diagnostic bridge receives finite preview/navigation outcomes,
without raw SDK errors, ad-unit IDs or callbacks. Clearing the preview journal
does not erase other product diagnostics. Copy is present in all7existing
languages; Ads and the fixed test-card machine labels remain intentional.

## SDK boundary

No ad SDK/provider exists in the current repository. The owner explicitly deferred
SDK setup: "пока просто создай место потом отдельно все настроим". The current
scope is the inspection place only. The UI says SDK not connected and sends
no ad request.
Preview actions must never become a successful impression/loading signal.

After the SDK is selected: use its official test mode/test units, map actual
load/display/failure/dismiss callbacks with bounded request identity, and
separate SDK events from the local preview journal. Check supported render
surfaces, lifecycle/disposal, consent/privacy declarations, permissions and
offline failure behavior before any broader rollout. No paid traffic,
production inventory, tracking identifiers or public rollout is authorized by
this prototype's existence.

## Acceptance status

Source checks pass:1640web cases in161files,589native cases in79suites with
unchanged5000ms deadlines, plus9release-tool cases. Root/native types, lint,
all3fresh offline packages, content twins, generated server, actual socket
lifecycle, production build, project map and typography pass. Static chunks
remain6.48MiB across110files under the unchanged6.5MiB limit.

The final bundled sailing HTML is1fcbb1fd76c2,6.28MiB with233source inputs.
Actual browser inspection used this exact HTML: RU390x740, PL/EN320x640,
and1280x720 desktop. All18buttons are at least44px tall, all are at least44px
wide, no horizontal overflow and the scene does not overlap the dock. Actual
first frame, four presets, pointer orbit, direction/reset,35degree lens,
placement hide/show, venue change, journal clear and camera-limit noop were
observed. No final console error was observed. These are pointer/browser
checks, not a physical touch-device claim.

Evidence: `docs/audits/2026-10-27/checks/ads-source.json`; original screenshots
and logs stay in the private external `regatta-audit/ads-preview` directory.
The new60s browser case retains its25s scene deadline and still needs the exact
source cloud run. Installed native Settings/Back/gesture and Apple delivery
remain pending. Provider-specific callbacks are a later task by owner choice.
No new TestFlight delivery or real SDK signal is claimed.
