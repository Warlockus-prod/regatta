// Nominal flat planform areas, shared by the force model and sail drawings.
// Rig dimensions are in the source GLB coordinate system (Y up).
export const SAIL_PLAN = {
  main: { area: 45, height: 17, foot: 5.2, clewRise: 0.16 },
  jib: { area: 30, height: 16.1433333333, luffOffset: -5.8, clewRise: 1.05, roach: -0.14 },
} as const;

export const clampSailFraction = (value: number) => Math.max(0, Math.min(1, value));
export const reefAreaFraction = (reef: number) => 1 - 0.65 * clampSailFraction(reef);
export const jibAreaFraction = (furl: number) => 1 - clampSailFraction(furl);

/** Integral of the curved planform, including the raised clew. */
export function sailDimensions(kind: "main" | "jib", reef = 0, furl = 0) {
  if (kind === "main") {
    const p = SAIL_PLAN.main;
    const heightScale = 1 - 0.45 * clampSailFraction(reef);
    const height = p.height * heightScale;
    const rise = p.clewRise;
    const fullRoach = (p.area - p.height * p.foot / 2) * Math.PI / (2 * (p.height - rise));
    const roach = fullRoach * heightScale;
    const area = p.area * reefAreaFraction(reef);
    const foot = 2 * (area - 2 * roach * (height - rise) / Math.PI) / height;
    return { height, rise, roach, foot, luffOffset: 0 };
  }
  const p = SAIL_PLAN.jib;
  const fraction = jibAreaFraction(furl);
  const rise = p.clewRise * fraction;
  const roach = p.roach * fraction;
  const foot = (2 * (p.area * fraction - 2 * roach * (p.height - rise) / Math.PI) - p.luffOffset * rise) / p.height;
  return { height: p.height, rise, roach, foot, luffOffset: p.luffOffset };
}
