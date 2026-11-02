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
source cloud run at this historical checkpoint. The subsequent corrected local
preview is delivered in69, with qualified native acceptance and exact Apple
proof in `docs/design/mobile/testflight69-2026-10-27.md`. This does not certify
every gesture/device or provider callbacks. SDK/provider and real signals remain
OFF by owner choice. The observations above retain their original source scope.

## Native export correction

The first69 candidatebd9 failed actual Release Simulator packaging: Metro
could not resolve the new feature-folder copy import outside its explicit
watch roots. Types and Jest did not establish native export readiness. Pure
seven-language copy now lives at `src/lib/ads-copy.ts`, inside the existing
shared library watch boundary. No whole-Next-tree watch expansion, translation
duplication or SDK change is introduced. The failed source/log is preserved;
exact native/browser gates must repeat for the corrected source.

## Formats on VOX SDK 1 (2026-10-30)

Owner request 2026-10-30: besides in-game, show the usual mobile placements
(full screen, bottom of the screen and the rest) as a list; Rewarded opens a
rewarded video with its endpoint, Display opens screens to swipe through,
In-game opens the yacht world with boards. The SDK chosen for this step is
the classic Hybrid SDK, named "VOX SDK 1" (VOXSDK pod 1.2.3); "VOX SDK 2" is
the planned Prebid-based SDK.

What changed against the boundary above:

- Settings -> Ads is now a native format list (`mobile/app/ads/index.tsx`).
  The 3D lab above is its In-game item at `/ads/in-game`; the web route
  stays `/ads` and its boards stay local test cards.
- Display, Interstitial, Rewarded and Video send real ad requests to
  `GET https://ssp.hybrid.ai/auction/getad` (first with the sample place IDs of the
  VOX example app, now with the app's own slots, see below), only while those screens are open. Each slot shows the
  endpoint, place ID, status and time.
- Rewarded is simulated: SDK 1 has no rewarded format or completion
  callback. The app plays a full-screen VAST video and grants the reward after
  15 s of a loaded ad; closing earlier forfeits it.
- In-game boards are not fed by SDK 1: it returns HTML creatives, a WebGL
  board needs an image. That needs an image or native response (Prebid
  native, or the `imageUrl` parameter of the Prebid Server `vox` adapter).

Measured 2026-10-27 and 2026-10-30: all 12 sample place IDs answer HTTP 204
(no campaign), from the simulator and from curl on the Mac. The slots then
draw a dashed frame of the real size with "No fill (204)". SDK 1.2.3 turns
204 into a JSON decode error and retries 5 times; the bridge reports it as
`no-fill`. The SDK fix lives in the SDK repositories, not here.

Still required before any public release with this screen: Week to Regatta's
own place IDs with a campaign, consent (TCF) passed to `AdRequestModel`, the
App Store privacy label and `NSPrivacyCollectedDataTypes` for device data sent
to the ad server, `app-ads.txt`, and a decision whether the Settings entry is
visible to everyone. Android has no VOX bridge yet.

## VOX SDK 2 and the "ads only in Ads" rule (2026-10-30, later the same day)

Owner: this is a test version, ads must exist only in the Ads section; finish
VOX SDK 1 and VOX SDK 2.

Ads only in Ads, checked:
- Only `app/ads/*`, `src/ads/*`, `modules/vox-*` and the VOX build plugins
  reference an ad bridge; a Jest test enforces it. Settings imports only the
  Ads copy. The VOX SDK has no launch-time code (its singletons are lazy), and
  Prebid starts only on the first SDK 2 request from an Ads screen.
- Found and fixed in VOX SDK 1.2.3 (in `vox-sdk-ios`, not pushed yet): the
  banner registered itself as a WebKit message handler (strong retain cycle),
  so a banner and its auto-refresh timer could outlive the screen and keep
  requesting ads; the VAST player controller stayed attached to the app's root
  controller. Fixes: weak message-handler proxy, player detached on deinit,
  refresh only while the banner is on screen. The bridge also tears ads down
  when a slot leaves the screen, so the rule holds with the old SDK too.

VOX SDK 2: Prebid Mobile 3.4.1 (rendering API, no primary ad server) with a
Prebid Server whose `vox` adapter forwards the OpenRTB request unchanged to
`https://ssp.hybrid.ai/prebid/server/v1/auction` (`imp.ext.bidder.placementId`).
Test server: Prebid Server v4.10.0 built from source on the Mac
(`~/App/sdk_hybrid/vox-sdk-2/server`, port 8200; port 8000 is taken by another
project's container and Docker Desktop could not pull images). Prebid's
default status URL ignores the port, so the bridge sets `customStatusEndpoint`.
Rewarded on SDK 2 is the real Prebid rewarded unit with its reward event.

Measured in the simulator: SDK 2 bottom banner, no bids in 557 ms; SDK 1 same
placement, 204 after 5 retries in 3154 ms. All sample IDs still have no
campaign; `~/App/sdk_hybrid/vox-sdk-2/PLACEMENTS.md` lists the App Ads
placements to create.

## Own placements (2026-10-30, evening)

The sample IDs are replaced by Week to Regatta's own ad slots, created in the
VOX partner panel (Goleta VOX PL EN) as `App · WTR · <format>`: five Display
banners, an Interstitial 320x480, three VideoPlace slots (16:9, 9:16,
9:16 rewarded) and In-game 970x250, domain `weektoregatta.com`. The IDs
are in `mobile/src/ads/vox-placements.ts` (SDK 1) and in
`vox-sdk-2/server/placements.json` (SDK 2), with the full table in
`~/App/sdk_hybrid/vox-sdk-2/PLACEMENTS.md`. New slots start as Pending
moderation and answer 204 until VOX approves them and a campaign targets
them.

## First real ads (2026-10-30, 17:50-18:05, iPhone 16 Pro simulator)

After the slots were approved and test campaigns started, real Hybrid
creatives rendered on both SDKs:

| Format | VOX SDK 1 | VOX SDK 2 |
|---|---|---|
| Bottom 320x50 | shown, 249 ms | shown, 2744 ms |
| In-text 300x250 | shown, 145 ms | shown, 1104 ms |
| Feed 320x480, half page 300x600 | - | shown |
| Interstitial | shown, centred | shown, close button |
| Rewarded | - | video played, reward granted |
| Video 16:9 | 204 in the app (see below) | shown, 722 ms |

Fill is intermittent (pacing): a slot answers an ad in roughly half of the
requests. Bugs found and fixed on the way:
- VOX SDK 1 (`vox-sdk-ios`): the creative HTML has no viewport meta, so a
  320 px banner rendered at a third of its size; the viewport is now set at
  document start. Full screen centres the creative on black. Video places
  answer raw VAST XML instead of JSON, which SDK 1.2.3 failed to decode and
  the bridge showed as no fill; the SDK now accepts VAST XML (an empty VAST
  is no fill). Not yet seen playing in the app: by then every request from
  the Mac answered 204.
- VOX SDK 2 (Prebid Server): Hybrid bids only with `cur` and
  `imp.bidfloorcur` in PLN; its banner iframe has no size and its VAST
  declares the wrong encoding. Fixed in the local server, details in
  `~/App/sdk_hybrid/vox-sdk-2/server/README.md`.

The creatives seen were Hybrid's own promo ads; the `TEST APP WTR`
campaigns (`PLACEMENTS.md`) had no recorded impressions yet. Open: a VOX SDK 2
banner timer counts from the first load, so after an auto-refresh it can show
minutes instead of the request time.

Recheck at 20:55 the same day, one request per slot: the server answered
again. VOX SDK 2 path (our Prebid Server) had a bid on 5 of 10 slots
(320x50, 300x250, 320x480, 728x90, video 16:9); the VOX SDK 1 request had an
ad on 4 of 10 (300x600, interstitial, video 16:9 as VAST, 970x250). Requests
right after that answered 204 again, in the app and from curl alike, so the
limit is on Hybrid's side (pacing per user), not in the SDKs. VOX SDK 1 video
in the app is still not seen playing. The `TEST APP WTR` campaigns ended the
day with 0 impressions and were stopped at 20:59.

At 21:48, with them stopped, VOX SDK 2 still showed 320x50 and 300x250: the
Hybrid promo creative "Reklama, która angażuje" from the icoffio site's test
campaigns in the same Hybrid cabinet (bid 99, no placement restriction); each
app impression added exactly one to their daily count. The place IDs in the
app match the `App · WTR ·` slots in the VOX panel. The phone build still has
only the 3D lab under Ads; the format screens exist only in this branch.
