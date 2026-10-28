export const ADS_SCENES = ["gocek", "open"] as const;
export const ADS_CAMERAS = ["whole", "deck", "stern", "high"] as const;
export const ADS_FOVS = [35, 60, 90] as const;
export const ADS_PLACEMENTS = ["port-board", "bow-board", "stern-board"] as const;
export type AdsScene = typeof ADS_SCENES[number];
export type AdsCamera = typeof ADS_CAMERAS[number];
export type AdsPlacement = typeof ADS_PLACEMENTS[number];
export type AdsFov = typeof ADS_FOVS[number];
export type AdsPreviewAction = "open" | "scene" | "camera" | "reset" | "orbit" | "show" | "hide";
export interface AdsPreviewEvent { readonly seq: number; readonly source: "preview"; readonly action: AdsPreviewAction; readonly outcome: "accepted" | "noop"; readonly scene: AdsScene; readonly camera: AdsCamera; readonly fov: AdsFov; readonly placement?: AdsPlacement }
export const ADS_PREVIEW_LIMIT = 40;

/** Local preview operations only. There is no SDK/impression event conversion. */
export function appendAdsPreview(events: readonly AdsPreviewEvent[], value: Omit<AdsPreviewEvent, "seq" | "source">): readonly AdsPreviewEvent[] {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).some(key => !["action", "outcome", "scene", "camera", "fov", "placement"].includes(key))
    || !["open", "scene", "camera", "reset", "orbit", "show", "hide"].includes(value.action)
    || !ADS_SCENES.includes(value.scene) || !ADS_CAMERAS.includes(value.camera)
    || !ADS_FOVS.includes(value.fov)
    || !["accepted", "noop"].includes(value.outcome)
    || value.placement !== undefined && !ADS_PLACEMENTS.includes(value.placement)
    || (value.action === "show" || value.action === "hide") && value.placement === undefined) return events;
  const previous = events[events.length - 1]?.seq ?? 0;
  if (!Number.isSafeInteger(previous) || previous < 0 || previous >= Number.MAX_SAFE_INTEGER) return events;
  const event = Object.freeze({ seq: previous + 1, source: "preview" as const, action: value.action, outcome: value.outcome, scene: value.scene, camera: value.camera, fov: value.fov,
    ...(value.placement === undefined ? {} : { placement: value.placement }) });
  return Object.freeze([...events.slice(-(ADS_PREVIEW_LIMIT - 1)), event]);
}
