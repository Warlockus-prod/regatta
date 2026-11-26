/**
 * The Ads section (Settings -> Ads, VOX SDK 1) is in a build only when
 * EXPO_PUBLIC_ADS_DEMO=1 is set for both `expo prebuild` (links the VOXSDK pod,
 * plugins/with-vox-sdk.js) and the JS bundle (shows the Settings entry).
 * App Store builds from 1.7.1 set EXPO_PUBLIC_ADS_DEMO=1 (owner 2026-11-03):
 * the section ships with real, non-personalised VOX SDK 1 ads. VOX_PREBID=1
 * additionally links VOX SDK 2 (Prebid) and is only for local SDK 2 tests
 * against the Prebid Server on this Mac; it never ships. Without the variable
 * (1.7.0 build 77 and earlier store builds) there is no Ads entry and no ad pod.
 * What is done and what remains before a store release: the README of the
 * VOX SDK 1 module (README.md of the vox-ads Expo module).
 */
export const ADS_DEMO_ENABLED = process.env.EXPO_PUBLIC_ADS_DEMO === '1';
