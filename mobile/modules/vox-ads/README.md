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

`ios/` is generated, so after pulling run:

```bash
cd mobile && npx expo prebuild -p ios --no-install && (cd ios && LANG=en_US.UTF-8 pod install)
```

The VOX repository is private: `pod install` uses this Mac's git credentials.
Android, Expo Go and jest have no native module; the screen then shows a
"not available in this build" note.

## Before any App Store release with this screen

- Replace the sample place IDs with Week to Regatta's own placements.
- Pass consent (`AdRequestModel.gdpr` / `gdprConsent`) from a CMP for EU users.
- Update the App Store privacy label and `NSPrivacyCollectedDataTypes`
  (device data sent to the ad server), and publish `app-ads.txt`.
- Decide whether the Settings entry stays visible to all users.
