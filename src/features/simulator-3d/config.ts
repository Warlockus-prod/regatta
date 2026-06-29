// ============================================================================
// Simulator V2 (3D) - feature flag.
//
// V2 is the new Blender-built 3D sloop module. It is intentionally a separate,
// self-contained feature so it can be enabled/disabled and updated without
// touching V1 (2D canvas) or V3 (SVG trim trainer).
//
// Toggle: set NEXT_PUBLIC_SIM_V2=0 to hide the route (it then redirects to V1).
// Any other value (or unset) leaves V2 enabled.
// ============================================================================

export const SIM_V2_ENABLED = process.env.NEXT_PUBLIC_SIM_V2 !== '0';

// Path to the exported GLB (Blender -> glTF, Y-up, morph targets + named rig).
export const YACHT_MODEL_URL = '/models/regatta_sloop.glb';
