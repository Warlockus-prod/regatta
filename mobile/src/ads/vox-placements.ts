/**
 * VOX SDK 1 placements (Hybrid SSP, ssp.hybrid.ai): Week to Regatta's own
 * "App · WTR · ..." ad slots in the VOX partner panel (Goleta VOX PL EN,
 * created 2026-10-30). The same IDs feed VOX SDK 2 through
 * vox-sdk-2/server/placements.json. They serve once VOX approves them and a
 * campaign targets them; until then every request is a no fill.
 */

/** VOX SDK 1 ad request endpoint (GET, `request` = JSON with placeId). */
export const VOX_ENDPOINT = 'https://ssp.hybrid.ai/auction/getad';

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
  { key: 'videoHorizontal', placeId: '6ae4bdf070e7b23ad0981d9c', kind: 'video', width: 16, height: 9 },
  { key: 'videoVertical', placeId: '6ae4bdf770e7b23ad0981d9e', kind: 'video', width: 9, height: 16 },
  { key: 'rewarded', placeId: '6ae4bdfd70e7b23ad0981da0', kind: 'video', width: 9, height: 16 },
  // In-game boards (3D world): image creatives only; not wired to the scene yet.
  { key: 'inGame970x250', placeId: '6ae4bdcb810d986308d66834', kind: 'banner', width: 970, height: 250 },
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
