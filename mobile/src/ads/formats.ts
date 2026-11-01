import type { Href } from 'expo-router';

/** Ad formats listed on Settings -> Ads, in display order, with their routes. */
export const AD_FORMATS = ['display', 'interstitial', 'rewarded', 'video', 'inGame'] as const;
export type AdFormat = typeof AD_FORMATS[number];

export const AD_FORMAT_ROUTES: Record<AdFormat, Href> = {
  display: '/ads/display',
  interstitial: '/ads/interstitial',
  rewarded: '/ads/rewarded',
  video: '/ads/video',
  inGame: '/ads/in-game',
};
