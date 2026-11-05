# vox-ads: VOX SDK 1 bridge (iOS)

Local Expo module that wraps the classic Hybrid Adtech SDK ("VOX SDK 1",
`VOXSDK` pod, https://github.com/Warlockus-prod/vox-sdk-ios) for the ads demo
screen. "VOX SDK 2" is the planned Prebid-based SDK and is not part of this.

## Where things are

| Path | What |
|---|---|
| `mobile/app/ads/*.tsx` | Format list and one simulated screen per format (display, interstitial, rewarded, video, in-game) |
| `mobile/app/settings.tsx` | "Ads" entry, the only way into `/ads` |
| `mobile/src/ads/` | `AdSlot` + `RequestPanel`, copy, format routes, place IDs and endpoint |
| `mobile/modules/vox-ads/index.ts` | JS API: `VoxAds` (null when the native module is absent), `VoxAdView` |
| `mobile/modules/vox-ads/ios/` | Swift: `VoxAdsModule` (interstitial), `VoxAdView` (inline banner / VAST video) |
| `mobile/plugins/with-vox-sdk.js` | Adds `pod 'VOXSDK', :git, :commit` to the generated Podfile |
| `mobile/plugins/with-min-pod-deployment-target.js` | Raises pod targets to iOS 15.1 (Xcode 27 rejects lower) |

## Flow

1. Settings -> Ads opens the format list `/ads`. No ad request happens before a format screen opens.
2. `VoxAdView` gets `placeId` + `kind`, waits for a non-zero width, then calls
   `VOXAds.createBanner` (banner) or `VOXAds.createVASTVideo` (video).
3. The banner's real height is sent back in `onAdLoaded`; the JS slot resizes.
4. Interstitial: `VoxAds.showFullScreen(placeId, closeDelay)` presents VOX's
   own full-screen controller over the current one.
5. Requests go to `https://ssp.hybrid.ai/auction/getad`.

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
- Consent: every request goes with `AdRequestModel(placeId:, gdpr: 1)` and no
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

Still open (owner):

- Publish `app-ads.txt` on weektoregatta.com (it reaches the site only with a
  site update).
- App Store Connect > App Privacy: add Product Interaction for Third-Party
  Advertising and Other Data for Third-Party Advertising, not linked, not
  tracking (release gate G4b step 2), and publish.
- Publish the updated site policy before G5 (a local change does not update
  the Privacy Policy URL).
