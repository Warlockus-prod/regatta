/** Outhaul response of a synthetic loose-footed teaching sail. 0 is hauled,
 * 1 eased; a setting, not tension. The lower sections change most.
 * Corners/planform remain fixed in this first compliance model. No cloth FEM
 * or measured sail polar is implied. Undefined and .5 preserve legacy trim. */
export function outhaulDepthFactor(ease: number | undefined, height: number): number {
  const setting = Math.max(0, Math.min(1, ease ?? .5));
  const lower = Math.max(0, 1 - Math.max(0, height) / .6) ** 2;
  return 1 + .65 * (setting - .5) * lower;
}
