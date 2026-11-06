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
  board needs an image. That needs an image response, see "In-game boards:
  measured" below. The `imageUrl` parameter of the Prebid Server `vox` adapter
  does not provide one: it is the picture a banner is laid over (InImage).

Measured 2026-10-27 and 2026-10-30: all 12 sample place IDs answer HTTP 204
(no campaign), from the simulator and from curl on the Mac. The slots then
draw a dashed frame of the real size with "No fill (204)". SDK 1.2.3 turns
204 into a JSON decode error and retries 5 times; the bridge reports it as
`no-fill`. The SDK fix lives in the SDK repositories, not here.

Still required before any public release with this screen: Week to Regatta's
own place IDs with a campaign, consent (TCF) passed to `AdRequestModel`, the
App Store privacy label and `NSPrivacyCollectedDataTypes` for device data sent
to the ad server, and a decision whether the Settings entry is
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
  is no fill). Once a video place filled, the app crashed (found 2026-11-04,
  builds 78 and 79): the bridge gave the SDK the app's current controller as
  the player's parent, and UIKit throws when that controller is not an
  ancestor of the slot. The bridge now finds the owning controller through the
  responder chain. Checked on iOS 27 in the simulator: 16:9, 9:16 and rewarded
  play, leaving the screen stops playback.
- Owner's feedback on build 79 (2026-11-04), fixed in `vox-sdk-ios` `d197347`: a
  banner wider than its slot scaled from the top centre and slid right (728x90
  on a phone); it now scales from the top left. A full-screen creative stayed at
  its own size, centred on black; it is now scaled to fit the view.
- Full screen order (`mobile/src/ads/full-screen.ts`): place 1080x1920
  (`6aebb2d970e7b21a6c36178f`, created 2026-11-04, in VOX moderation, answers 204
  until approved) with the app's address, then the 320x480 place without it. Since
  2026-11-06 both name the app, see the last section.
- Address in requests, measured 2026-11-04 with 4 requests per place: without
  `browser.url` all 10 places fill (Hybrid's own promo, recorded in Hybrid's
  statistics under the fallback domain icoffio.com); with `https://weektoregatta.com/`
  every format answers 0 of 4 and only our own campaign on the in-game place fills. So the formats stayed
  without the address until the owner decided otherwise on 2026-11-06 (decision Р-43,
  last section).
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

## In-game boards: measured (2026-11-04)

Live requests from the Mac, no tracker fired: `getad` in-game 970x250 8/8,
300x250 8/8, 320x50 7/8; OpenRTB 970x250 and 300x250 16/16 at 5 PLN. The sampled
advertiser domain is `hybridadtech.com`, so fill says nothing about paid demand.

- The answer is HTML with an iframe, and a native request to the OpenRTB endpoint
  returns the same HTML (the `vox` adapter declares only banner and video). But
  the iframe (`dsa-eu.hybrid.ai/Ad/Load`) holds a plain `<img id="tx_img">` on
  `content.hybrid.ai`, and both answer with `Access-Control-Allow-Origin: *`. A
  static creative can go on a board; an HTML5 one cannot and counts as no fill.
- The markup carries hidden trackers (`SaveImpression2`, `SaveView2`, `seance/View`),
  so a creative rendered off screen would count as shown. The board never renders
  that HTML. The app fires them itself when the view is counted (`getad` also has
  `actionUrls` separately).
- Implemented: `mobile/src/ads/board-feed.ts` asks `getad` (same GET and `gdpr=1`
  as SDK 1, no CORS in React Native), reads the frame, downloads the image and
  hands it to the page as data (the page CSP allows no remote image);
  `src/lib/ads-board.ts` parses the answers and keeps every call on HTTPS `hybrid.ai`;
  `src/features/ads-lab/FloatingBoard.tsx` and `board-viewability.ts` measure.
- This reads Hybrid's internal markup, not a contract: a change on their side
  gives no fill, never a wrong count. Worth asking Hybrid for an image field.
- Viewability (IAB/MRC In-Game Guidelines, August 2022): visible part at least
  1.5% of the screen, angle at most 55 degrees per axis (recommended), samples
  every 200 ms, five in a row for display.
- Size, computed for 390x844, race camera 58 degrees, scene 633 px high, facing
  the camera, no occlusion. The camera stands 68-86 m from the boat. An 8x4 m test
  board from 80 m is 57x29 px, 0.50%, and fails; 16x8 m is 114x57 px, 1.98%; 24x12 m
  is 171x86 px, 4.46%. So 2:1, larger than the 13 m yacht, a logo and a few words.
  Not measured on an iPhone.

Console, 2026-11-04 (the owner's Chrome session):
- VOX slot `App · WTR · In-game board 640x360`, `6aea913270e7b28514d8f0c6`, Pending
  moderation (VOX sizes have no 2:1; 640x360 is the nearest and reads on an upright
  phone). The app asks it first and falls back to `inGame970x250` while it has no ad.
- Hybrid campaign `TEST APP WTR in-game board 640x360`, advertiser TESTY POLSKA, bid
  120, 10 PLN a day, 20 PLN in all, until 2026-11-07, images 640x360 and 970x250,
  whitelist only `weektoregatta.com`.
- `app-ads.txt`: the panel's Ads.txt button gives the line, in `public/app-ads.txt`. Live:
  on 2026-11-06 https://weektoregatta.com/app-ads.txt answers 200 with
  `voxexchange.io, 63d93a3e4d506ea2dc1863ea, DIRECT`.

Why app campaigns never won before, both measured side by side:
- Domain: a request without `browser` is recorded on the fallback page
  `https://icoffio.com/`, `PageSource 5` (nothing in the SDK or the app names it). With
  `browser.url` it is `weektoregatta.com`, `PageSource 1`. The board feed sent it. VOX
  SDK 1 formats did not until 2026-11-06 (`VoxAdView.swift`, `VoxAdsModule.swift`); the
  address is now the bundle id, see the last section.
- Consent: the campaign copied from an old template had `hasGoogleConsent: true`, and
  requests without a consent string did not match it: 204 for 50 minutes. Set to false,
  it won within minutes. Check this flag on any new campaign.

Checked in the app (iOS 27 simulator): our campaign's banner on the board, 1.85% of the
screen, view counted once. `vox_ssp.DistributedStatistics`: `inGame970x250` with Domain
`weektoregatta.com`, 1 impression, the same as the counter; the earlier Hybrid promo
test shows 1 on `icoffio.com`. The DSP table had not shown the impression yet at the time.

The 1631 impressions and 8.16 PLN on `Banner 300x250` (2026-10-30 to 11-01) are test
traffic: nearly all one visitor and one IP, about one every two minutes, so a test
device with a banner left open on auto-refresh. Not revenue, not audience.

Open items and order: `docs/BACKLOG.md` package 30. Owner brief with the SDK
history and Prebid Server: shared separately, not in the repository.

## The app as an app, not a website (2026-11-06)

Owner 2026-11-06: we took this for an app integration, it was a web one; the app must be
seen as an app, so campaigns can target it. Decision Р-43 is closed: send the app's identity.

Measured 2026-11-06, live requests and the Hybrid warehouse:

| Request | Recorded as |
|---|---|
| `getad` with no `browser.url` | Page `https://icoffio.com/`, Domain `icoffio.com`, PageSource 5 (publisher fallback). This is why the app looks like a website |
| `getad`, `browser.url` `https://com.icoffio.regatta/` | Domain `com.icoffio.regatta`, PageSource 1 |
| `getad`, `browser.url` `https://weektoregatta.com/` | Domain `weektoregatta.com` |
| `getad`, an `ios-app://` address | empty Domain, so not used |
| `getad`, `sdkInfo.applicationId` | ignored today, still `icoffio.com` |
| OpenRTB `POST /prebid/server/v1/auction`, `app.bundle`, `app.storeurl`, `app.domain` | ignored, `icoffio.com`, PageSource 5; `site.page` is honoured |

- A minimal `sdkInfo` costs no ad: `getad` with `{placeId, gdpr: 1, browser, sdkInfo:
  {applicationId: "com.icoffio.regatta"}}` on place `6ae4bdcb810d986308d66834`
  (`inGame970x250`) returned the same ad as the same request without `sdkInfo`, 3 of 3
  against 3 of 3. So the in-game feed sends it. The 640x360 place, which the feed asks
  first, was not part of this measurement.
- The server model has `applicationId`: the Android SDK's internal `MobileSdkInfoModel`
  declares it with language, timezone, connectionType, ifa and others. The iOS model lacks
  them. The old pin `d197347` sends no `applicationId`; the app is now on 1.3.0 (`42cd227`).
- SSP Vox id 15: 894.9M DSP impressions in 30 days, 0 with an AppId. The VOX panel has no
  app slot type. So a real in-app identity (DSP AppId, `onlyForMobileApp` campaigns, app
  lists `15|<bundle>`) needs a server change at Hybrid. Campaign
  `6aedd6247d25831d8c887437` (HybridMobileCampaign, `onlyForMobileApp`) has 0 bets for
  that reason.

What this address is: the bundle-shaped `browser.url` declares the app as a web page. It is
a label for our own test campaigns only, not for real advertisers' money, until Hybrid's
server takes real app identity.

Two layers:

1. Client only, now. Every VOX SDK 1 request carries the identity. The app sends `browser.url`
   `https://com.icoffio.regatta/` on all formats (`VOX_APP_PAGE_URL`, display, video,
   rewarded, both full-screen places, in-game), with `gdpr=1` and no consent string as
   before. `browser` also carries the language chosen in the app (`lang` from `useI18n`,
   as the board feed always did) and the time-zone offset. Inline formats sent neither
   before: they had no `browser`, and the pinned SDK's `sdkInfo` has no such field. The
   privacy texts list "app language and time-zone offset", which now holds on every SDK 1
   request, and they now also name the app identifier and the web address made from it.
   Builds up to 1.7.2 (81) send the device's language on the first full-screen request. The
   in-game feed goes past the SDK and sends `sdkInfo.applicationId` itself, from the same
   `VOX_APP_BUNDLE_ID` as the address. The other formats get it with the SDK: VOX SDK 1.3.0
   (iOS) and 1.1.0 (Android) add only `sdkInfo.applicationId`, ignored today and ready for
   the server change. They do not send `sdkInfo.language` or `sdkInfo.timezone`: the goal
   needs only the app id, the server does not use those fields today, and the privacy texts
   promise app language and time-zone offset only, while the SDK overwrites `sdkInfo` in every
   mode, so the app could not override them. The SDK's default `browser` block stays (url from
   the identity, referrer "", language, timezoneOffset, screen size) and an explicit caller
   `browser` wins, so the bridge's own values still go out. The app's pin moves to 1.3.0 after
   it is pushed (`mobile/modules/vox-ads/README.md`).
2. Server change at Hybrid, a separate brief for their server team. Only then the app
   exists as an app in the DSP. Until then the bundle id is a domain-level name in the
   warehouse, not an AppId.

VOX SDK 2 (Prebid, local tests only, never ships) is not changed and sends no identity, so
a warehouse row from it on `icoffio.com` says nothing about this work.

Cost, surfaced on purpose:

- Expected, not measured with the bundle id: Hybrid's promo campaigns no longer fill these
  places. The loss is measured as 0 of 4 with the address `weektoregatta.com` on 2026-11-04.
  Until a campaign whitelists `com.icoffio.regatta`, the display, interstitial, video and
  rewarded screens are expected to show "No fill (204)", and the in-game board its own "No
  image ad right now".
  The hint under "No fill (204)" now says "no campaign for this app on this placement right
  now" in all seven languages: "for this placement" stopped being true once a campaign on
  the place lacks the bundle id in its whitelist, the case below. On a 204 look at that
  whitelist first.
- Our own campaigns (`TEST APP WTR in-game board 640x360` and the one on the 1080x1920
  place) whitelist only `weektoregatta.com`, so the board and that place are expected to stop
  matching too until the bundle id is added to their whitelists.
- A reviewer opening Settings > Ads in a build with this change is expected to see only no
  fill unless a campaign runs. `mobile/releases/review-notes-1.7.2.txt` describes build 80,
  which is on sale, and stays as it is. The next build is 1.7.3, and its review notes must
  name the bundle id instead of `https://weektoregatta.com/`, say that every format sends it,
  and stop promising real ads on each format screen unless a campaign runs.
- Nothing changes for users until a new build: builds up to 1.7.2 (81) keep sending what they
  sent, and 1.7.2 (80) is on sale since 2026-11-05. That train is closed, so the next build is
  1.7.3. `mobile/app.json` here is still 1.7.2 (81) and has to be raised before the archive.

How to set up a campaign for the app today, for our own test campaigns only (console,
advertiser TESTY POLSKA):

1. Ordinary display or video campaign. Not `HybridMobileCampaign` or `onlyForMobileApp`,
   and no app list `15|<bundle>`: they have nothing to match until layer 2.
2. Domain whitelist: `com.icoffio.regatta`, as recorded, no scheme and no slash. Keep
   `weektoregatta.com` in the list while builds up to 1.7.2 (81) are in use: they send that
   address from the in-game board and the first full-screen place. Placement and domain pairs
   (`placementId|domain`) do not match VOX traffic in this cabinet.
3. `hasGoogleConsent: false`. Requests carry no consent string, and with `true` they do not
   match (204 for 50 minutes, 2026-11-04).
4. Creatives of the place's size; a static image for an in-game board (HTML5 counts as no
   fill), VAST for the video places. Places: `mobile/src/ads/vox-placements.ts`.
5. Bid above 99 if Hybrid's own campaigns are also on the place (their bid on 2026-10-30).
6. Check in `vox_ssp.DistributedStatistics` by PlaceId: Domain `com.icoffio.regatta`,
   PageSource 1, the winning CampaignId. Fill is paced, so space the test requests.

Not proven yet: the measurements come from direct requests, not from a build with this
change, and no campaign has whitelisted this Domain, so a fill on `com.icoffio.regatta` is
expected, not observed. The promo loss on the bundle id is expected too, see the cost above.
