// ============================================================================
// 3D boat module config.
//
// The module is intentionally self-contained so it can be updated without
// touching Basics (/simulator) or the Trainer (/simulator-v3). The route is
// always on: the iOS app's "3D" tab embeds it via WebView, so a kill switch
// would break the shipped app (the old NEXT_PUBLIC_SIM_V2 flag was build-time
// inlined and could not actually be flipped in prod; removed 2026-07-05).
// ============================================================================

// Path to the exported GLB (Blender -> glTF, Y-up, morph targets + named rig).
export const YACHT_MODEL_URL = '/models/regatta_sloop.glb';
