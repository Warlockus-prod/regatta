/**
 * The Ads demo (Settings -> Ads, VOX SDK 1 and 2) is in a build only when
 * EXPO_PUBLIC_ADS_DEMO=1 is set for both `expo prebuild` (links the ad pods,
 * plugins/with-vox-sdk.js) and the JS bundle (shows the Settings entry).
 * App Store builds leave it unset: the README of the VOX SDK 1 module lists what must
 * happen before ads reach the store (own placements, consent, privacy label).
 */
export const ADS_DEMO_ENABLED = process.env.EXPO_PUBLIC_ADS_DEMO === '1';
