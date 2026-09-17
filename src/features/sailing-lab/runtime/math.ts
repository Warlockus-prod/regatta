export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const compass = (angle: number) => ((angle % 360) + 360) % 360;
export function approach(current: number, target: number, maxStep: number): number {
  const delta = target - current;
  return Math.abs(delta) <= maxStep ? target : current + Math.sign(delta) * maxStep;
}
export function approachHeading(current: number, target: number, maxStep: number): number {
  const delta = ((compass(target) - compass(current) + 540) % 360) - 180;
  return compass(current + clamp(delta, -maxStep, maxStep));
}
