/**
 * VOX SDK 1 placements (Hybrid SSP, ssp.hybrid.ai): Week to Regatta's own
 * "App · WTR · ..." ad slots in the VOX partner panel (Goleta VOX PL EN,
 * created 2026-10-30). The same IDs feed VOX SDK 2 through
 * vox-sdk-2/server/placements.json. They serve once VOX approves them and a
 * campaign targets them with com.icoffio.regatta in its domain whitelist
 * (VOX_APP_PAGE_URL below); until then a request is expected to be a no fill.
 */

/** VOX SDK 1 ad request endpoint (GET, `request` = JSON with placeId). */
export const VOX_ENDPOINT = 'https://ssp.hybrid.ai/auction/getad';

/** The app's bundle id: ios.bundleIdentifier in app.json (a test holds them together). */
export const VOX_APP_BUNDLE_ID = 'com.icoffio.regatta';

/**
 * The app's identity in every VOX SDK 1 request: https://<bundle id>/. Hybrid records it
 * as Domain com.icoffio.regatta, PageSource 1, so a campaign can whitelist the app.
 * With no address the request is recorded as the website icoffio.com (PageSource 5),
 * and an ios-app:// address gives an empty Domain (measured 2026-11-06).
 * This declares the app as a web page: a label for our own test campaigns only, not for
 * real advertisers' money, until Hybrid's server takes real app identity.
 */
export const VOX_APP_PAGE_URL = `https://${VOX_APP_BUNDLE_ID}/`;

export type VoxPlacementKind = 'banner' | 'video' | 'fullscreen';

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
  return `${p.width}x${p.height}`;
}
