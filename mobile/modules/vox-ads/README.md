# vox-ads: VOX SDK 1 bridge (iOS)

Local Expo module that wraps the classic Hybrid Adtech SDK ("VOX SDK 1",
`VOXSDK` pod, https://github.com/Warlockus-prod/vox-sdk-ios) for the ads demo
screen. "VOX SDK 2" is the planned Prebid-based SDK and is not part of this.

## Where things are

| Path | What |
|---|---|
| `mobile/app/ads/*.tsx` | Format list and one simulated screen per format (display, interstitial, rewarded, video, in-game) |
| `mobile/app/settings.tsx` | "Ads" entry, the only way into `/ads` |
| `mobile/src/ads/` | `AdSlot` + `RequestPanel`, copy, format routes, place IDs, endpoint and the app's identity `VOX_APP_PAGE_URL` |
| `mobile/modules/vox-ads/index.ts` | JS API: `VoxAds` (null when the native module is absent), `VoxAdView` |
| `mobile/modules/vox-ads/ios/` | Swift: `VoxAdsModule` (interstitial), `VoxAdView` (inline banner / VAST video) |
| `mobile/plugins/with-vox-sdk.js` | Adds `pod 'VOXSDK', :git, :commit` to the generated Podfile |
| `mobile/plugins/with-min-pod-deployment-target.js` | Raises pod targets to iOS 15.1 (Xcode 27 rejects lower) |

## Flow

1. Settings -> Ads opens the format list `/ads`. No ad request happens before a format screen opens.
2. `VoxAdView` gets `placeId` + `kind` + `pageUrl` + `language`, waits for a non-zero
   width, then calls `VOXAds.createBanner` (banner) or `VOXAds.createVASTVideo` (video).
3. The banner's real height is sent back in `onAdLoaded`; the JS slot resizes. A video view
   also sends `onAdCompleted` once the video has really been watched to the end.
4. Interstitial: `VoxAds.showFullScreen(placeId, closeDelay, pageUrl, language)` presents
   VOX's own full-screen controller over the current one.
5. Requests go to `https://ssp.hybrid.ai/auction/getad`, each naming the app (below).

## App identity

Every request names the app, so Hybrid records it as the app and not as its fallback
website `icoffio.com` (owner 2026-11-06, decision Р-43; measurements and how to set up a
campaign: `docs/design/mobile/ads-lab.md`, last section).

- `VOX_APP_BUNDLE_ID` in `mobile/src/ads/vox-placements.ts` is the one bundle id. A test
  (`mobile/__tests__/ads-app-identity.test.tsx`) holds it equal to `ios.bundleIdentifier` in
  `mobile/app.json`. It names the app in `mobileSdk.applicationId` (OpenRTB `app.bundle`).
- `VOX_APP_PAGE_URL` is the app's website `https://weektoregatta.com/` (owner 2026-11-17,
  build 87). It goes in `browser.url` and becomes OpenRTB `app.domain` and the Domain in
  Hybrid's statistics. Builds 82-86 sent `https://com.icoffio.regatta/`, so the bundle id
  showed up as the domain.
- JS gives it to the bridge: the `pageUrl` prop of `VoxAdView`, the third argument of
  `showFullScreen`. Swift puts it in `BrowserModel` through `VoxAdsModule.browser(pageUrl:language:)`,
  so a request does not depend on any SDK default and works on the pinned SDK.
  `VoxAdView` sends nothing without it. The in-game feed (`mobile/src/ads/board-feed.ts`)
  makes its own GET, sends the same address in `browser.url`, and adds `mobileSdk` with the
  same device block as the SDK plus `applicationId` (`mobile/src/ads/board-device.ts`, build 86).
- `mobileSdk` is the key the SSP reads (GitLab `vox/sspcore`, `AdRequestModel.MobileSdk`,
  read 2026-11-17). With it the SSP serves the request as an app: OpenRTB `app` instead of
  `site`, `app.bundle` = `applicationId`, `app.domain` = the `browser.url` domain. Up to
  SDK 1.3.0 and build 1.7.3 (82) the block went out as `sdkInfo`, which the SSP never read,
  so every request was a web page. Confirmed on live traffic 2026-11-17 (Druid `web = app`).
- `BrowserModel` also carries the language chosen in the app (`lang` from `useI18n`, the
  `language` prop, the fourth argument of `showFullScreen`) and the time-zone offset, the
  "app language and time-zone offset" of the privacy texts. Do not put the device's language
  there. Inline requests had no `browser` before this, and the pinned SDK's `sdkInfo` has
  neither field, so both are new on them.
- Since VOX SDK 1.3.1 (build 84) the SSP serves these requests as an app (OpenRTB `app`,
  bundle `com.icoffio.regatta`), and `onlyForMobileApp` campaigns win them. No server change
  at Hybrid was needed.

SDK pin: `VOX_SDK_COMMIT` in `mobile/plugins/with-vox-sdk.js` is VOX SDK 1.4.2, `8b14cca` (728x90 fits a phone, small close cross on short banners, video clip shape matches the slot; 1.4.1 `d05c06b` per-ad banner analytics and app fields). Before that 1.4.0, `aae1668`
(tag `1.4.0` on `main`): rewarded video ends with an end card, banners and full-screen ads run
MRAID 3.0 creatives (link and expand only from a real tap), native ads load as fields. The
video view sends `onAdCompleted` only when the video was watched to the end (at least 90% of
it actually played, seeking does not count); `app/ads/rewarded.tsx` grants the reward on it.
1.3.2 (`f69eb48`, builds 85-87) moved the close cross to the top-right corner. Like 1.3.1 (`a5bdfd6`, build 84) it sends the block below as `mobileSdk`
(in Swift still `sdkInfo`). 1.7.3 (82) used 1.3.0 `42cd227`. Builds up to 1.7.2 (81) used `d197347`, which sends
no `applicationId`, so there the app id travels only inside the address. In
`sdkInfo`, 1.3.0 adds only `applicationId`: no `sdkInfo.language`, no `sdkInfo.timezone`
(the privacy texts promise app language and time-zone offset only, and the SDK overwrites
`sdkInfo`, so the app could not override them). Its default `browser` block is built from the
same identity, and an explicit caller `browser` wins, so the bridge keeps passing its own and
the request changes by that one field.

1.7.3 (82) is the first build on this pin: 1.7.2 (80) is on sale, and that train is closed.

## Build

The Ads section is off by default (`src/config/ads-demo.ts`): without
`EXPO_PUBLIC_ADS_DEMO=1` the plugin excludes `vox-ads` and `vox-prebid` from
autolinking, so neither VOXSDK nor PrebidMobile is in the binary, and Settings
has no Ads entry (App Store 1.7.0 build 77). From 1.7.1 (build 78) App Store
builds set `EXPO_PUBLIC_ADS_DEMO=1` (owner decision 2026-11-03): the Podfile
then reads `use_expo_modules!(exclude: ['vox-prebid'])` and links only VOXSDK.
`VOX_PREBID=1` also links `vox-prebid` (VOX SDK 2, PrebidMobile) for local tests
against the Prebid Server on this Mac; it never ships. Set the variable for
prebuild AND the archive (Metro bundles the JS inside xcodebuild). `ios/` is
generated, so after pulling run:

```bash
cd mobile && EXPO_PUBLIC_ADS_DEMO=1 npx expo prebuild -p ios --no-install && (cd ios && LANG=en_US.UTF-8 pod install)
```

The VOX repository is private: `pod install` uses this Mac's git credentials.
Android, Expo Go and jest have no native module; the screen then shows a
"not available in this build" note.

## Before any App Store release with this screen

Done for 1.7.1:

- Placements: the place IDs from build 75 stay, by owner decision 2026-11-03.
- Consent: every request goes with `gdpr: 1` and no
  consent string (`VoxAdView.swift`, `VoxAdsModule.swift`), so Hybrid SSP serves
  only non-personalised ads. No IDFA, no vendor id, no ATT prompt, no CMP.
- Privacy manifest (`ios.privacyManifests` in `mobile/app.json`, enforced by
  `mobile/__tests__/app-config.test.ts`): Product Interaction also for
  Third-Party Advertising and a new Other Data for Third-Party Advertising,
  both not linked and not tracking.
- Texts: the site policy (`src/app/privacy/page.tsx`), its app-side twin
  `mobile/asc-metadata/PRIVACY_POLICY.md`, the store descriptions and
  promotional texts, the in-app privacy note in Settings, the Ads intro and
  the review notes `mobile/releases/review-notes-1.7.1.txt` describe the same.
- The Settings entry stays visible to all users, as the last entry of Settings.
- `app-ads.txt`, after 1.7.1: live at https://weektoregatta.com/app-ads.txt (200, checked
  2026-11-06).

Still open (owner):

- App Store Connect > App Privacy: add Product Interaction for Third-Party
  Advertising and Other Data for Third-Party Advertising, not linked, not
  tracking (release gate G4b step 2), and publish.
- Publish the updated site policy before G5 (a local change does not update
  the Privacy Policy URL).
