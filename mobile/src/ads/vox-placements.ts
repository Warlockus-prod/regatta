/**
 * VOX SDK 1 placements (Hybrid SSP, ssp.hybrid.ai): Week to Regatta's own
 * "App · WTR · ..." ad slots in the VOX partner panel (Goleta VOX PL EN,
 * created 2026-10-30). The same IDs feed VOX SDK 2 through
 * vox-sdk-2/server/placements.json. Requests carry `mobileSdk` (VOX SDK 1.3.1+), so the SSP
 * serves them as an app (OpenRTB `app`, bundle com.icoffio.regatta) and an in-app campaign
 * (only mobile apps, phones and tablets) wins them; a domain whitelist does not match them.
 */

/** VOX SDK 1 ad request endpoint (GET, `request` = JSON with placeId). */
export const VOX_ENDPOINT = 'https://ssp.hybrid.ai/auction/getad';

/** The app's bundle id: ios.bundleIdentifier in app.json (a test holds them together). */
export const VOX_APP_BUNDLE_ID = 'com.icoffio.regatta';

/**
 * The address in every ad request (`browser.url`): the app's own website. The app itself is
 * named by the bundle id in `mobileSdk.applicationId`; this address only becomes OpenRTB
 * `app.domain` and the Domain in Hybrid's statistics. With weektoregatta.com every format is
 * still served as the app and won by the in-app campaign (measured 2026-11-17). Before build 87
 * it was https://com.icoffio.regatta/, which showed the bundle id as the domain.
 * With no address Hybrid records the publisher's fallback site icoffio.com (PageSource 5).
 */
export const VOX_APP_PAGE_URL = 'https://weektoregatta.com/';

/**
 * The app's numeric App Store id. VOX SDK 1.4.1 sends it as mobileSdk.appStoreId with the store
 * URL, so the SSP can pass app.id and app.storeurl to buyers (they need them to check app-ads.txt).
 */
export const VOX_APP_STORE_ID = '6768134329';

/**
 * The app fields VOX SDK 1.4.1 adds to `mobileSdk` (besides the device block). The in-game board
 * asks the SSP itself, so it sends the same ones. The SSP ignores them until Hybrid maps them to
 * OpenRTB app.id, app.storeurl and app.name.
 */
export const VOX_APP_FIELDS = {
  appName: 'Week to Regatta',
  appStoreId: VOX_APP_STORE_ID,
  storeUrl: `https://apps.apple.com/app/id${VOX_APP_STORE_ID}`,
} as const;

export type VoxPlacementKind = 'banner' | 'video' | 'fullscreen' | 'native';

export type VoxPlacement = {
  key: string;
  placeId: string;
  kind: VoxPlacementKind;
  /** Creative size in points; for video it is the aspect of the slot. */
  width: number;
  height: number;
};

export const VOX_PLACEMENTS: readonly VoxPlacement[] = [
  { key: 'banner320x50', placeId: '6ae4bd2a70e7b23ad0981d98', kind: 'banner', width: 320, height: 50 },
  { key: 'banner300x250', placeId: '6ae4bd6e810d986308d6682c', kind: 'banner', width: 300, height: 250 },
  { key: 'banner320x480', placeId: '6ae4bd9d810d986308d6682e', kind: 'banner', width: 320, height: 480 },
  { key: 'banner300x600', placeId: '6ae4bdb3810d986308d66830', kind: 'banner', width: 300, height: 600 },
  { key: 'banner728x90', placeId: '6ae4bdbf810d986308d66832', kind: 'banner', width: 728, height: 90 },
  { key: 'interstitial', placeId: '6ae4bdc570e7b23ad0981d9a', kind: 'fullscreen', width: 0, height: 0 },
  // A real full screen. Created 2026-11-04, our own campaign; the request names the app (full-screen.ts).
  { key: 'fullScreen1080x1920', placeId: '6aebb2d970e7b21a6c36178f', kind: 'fullscreen', width: 0, height: 0 },
  { key: 'videoHorizontal', placeId: '6ae4bdf070e7b23ad0981d9c', kind: 'video', width: 16, height: 9 },
  { key: 'videoVertical', placeId: '6ae4bdf770e7b23ad0981d9e', kind: 'video', width: 9, height: 16 },
  { key: 'rewarded', placeId: '6ae4bdfd70e7b23ad0981da0', kind: 'video', width: 9, height: 16 },
  // In-game boards (3D world): static image creatives only, fed by board-feed.ts.
  { key: 'inGame970x250', placeId: '6ae4bdcb810d986308d66834', kind: 'banner', width: 970, height: 250 },
  // The board's own shape (VOX has no 2:1): readable on an upright phone. Created 2026-11-04.
  { key: 'inGameBoard640x360', placeId: '6aea913270e7b28514d8f0c6', kind: 'banner', width: 640, height: 360 },
  // Native (VOX SDK 1.4.0+): the app draws the fields itself; the size is the main image's
  // 1200x628. Created 2026-11-18, waits for VOX moderation (until then the SSP answers 204).
  { key: 'native', placeId: '6afcf6ae810d98569070344a', kind: 'native', width: 1200, height: 628 },
];

export function placement(key: string): VoxPlacement {
  const found = VOX_PLACEMENTS.find((p) => p.key === key);
  if (!found) throw new Error(`Unknown VOX placement: ${key}`);
  return found;
}

/** Machine size label: "300x250", "16:9"; empty for full screen. */
export function sizeLabel(p: VoxPlacement): string {
  if (p.kind === 'video') return `${p.width}:${p.height}`;
  if (p.kind === 'fullscreen') return '';
  if (p.kind === 'native') return 'native';
  return `${p.width}x${p.height}`;
}
