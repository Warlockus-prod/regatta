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
3. The banner's real height is sent back in `onAdLoaded`; the JS slot resizes.
4. Interstitial: `VoxAds.showFullScreen(placeId, closeDelay, pageUrl, language)` presents
   VOX's own full-screen controller over the current one.
5. Requests go to `https://ssp.hybrid.ai/auction/getad`, each naming the app (below).

## App identity

Every request names the app, so Hybrid records it as the app and not as its fallback
website `icoffio.com` (owner 2026-11-06, decision Р-43; measurements and how to set up a
campaign: `docs/design/mobile/ads-lab.md`, last section).

- `VOX_APP_BUNDLE_ID` in `mobile/src/ads/vox-placements.ts` is the one bundle id, and
  `VOX_APP_PAGE_URL` is `https://<bundle id>/`, built from it. A test
  (`mobile/__tests__/ads-app-identity.test.tsx`) holds it equal to `ios.bundleIdentifier` in
  `mobile/app.json`. Hybrid records the address as Domain `com.icoffio.regatta`.
- That address declares the app as a web page. It is a label for our own test campaigns
  only, not for real advertisers' money, until Hybrid's server takes real app identity.
- JS gives it to the bridge: the `pageUrl` prop of `VoxAdView`, the third argument of
  `showFullScreen`. Swift puts it in `BrowserModel` through `VoxAdsModule.browser(pageUrl:language:)`,
  so a request does not depend on any SDK default and works on the pinned SDK.
  `VoxAdView` sends nothing without it. The in-game feed (`mobile/src/ads/board-feed.ts`)
  makes its own GET, sends the same address in `browser.url`, and adds `sdkInfo` with
  `applicationId` and nothing else. Measured 2026-11-06 on the 970x250 place: the same ad
  as without `sdkInfo`, 3 of 3 against 3 of 3.
- `BrowserModel` also carries the language chosen in the app (`lang` from `useI18n`, the
  `language` prop, the fourth argument of `showFullScreen`) and the time-zone offset, the
  "app language and time-zone offset" of the privacy texts. Do not put the device's language
  there. Inline requests had no `browser` before this, and the pinned SDK's `sdkInfo` has
  neither field, so both are new on them.
- Expected cost: Hybrid's promo campaigns stop filling these places, which then answer no
  fill until a campaign whitelists `com.icoffio.regatta`. The loss is measured as 0 of 4 with
  `weektoregatta.com` on 2026-11-04 and is not measured with the bundle id.
- This is the client half. A real in-app identity (DSP AppId, `onlyForMobileApp`
  campaigns, app lists) needs a server change at Hybrid.

SDK pin: `VOX_SDK_COMMIT` in `mobile/plugins/with-vox-sdk.js` is the VOX SDK 1.3.0 commit
`42cd227` (branch `feat/app-identity`). Builds up to 1.7.2 (81) used `d197347`, which sends
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
