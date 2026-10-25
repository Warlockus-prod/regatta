/** Shared trainer kinematics. Force integration and control interpolation stay
 * with the caller; heading uses the previous speed, travel the integrated one. */
export const KNOT_METRES_PER_SECOND = 0.514444;
export const HELM_TURN_RATE_DEG_PER_S = 22;
export const COURSE_ASSIST_TURN_RATE_DEG_PER_S = 45;

export type SailingSteering = { mode: "course-assist"; heading: number }
  | { mode: "helm"; rudder: number; lowSpeedAssist: boolean };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const compass = (angle: number) => ((angle % 360) + 360) % 360;

/** Course assist is a teaching constraint, not a simulated autopilot. */
export function advanceSailingHeading(heading: number, speedKn: number, steering: SailingSteering, dt: number): number {
  if (steering.mode === "course-assist") {
    const delta = ((compass(steering.heading) - compass(heading) + 540) % 360) - 180;
    const maxStep = COURSE_ASSIST_TURN_RATE_DEG_PER_S * dt;
    return compass(heading + clamp(delta, -maxStep, maxStep));
  }
  return compass(heading + clamp(steering.rudder, -1, 1) * HELM_TURN_RATE_DEG_PER_S
    * Math.max(steering.lowSpeedAssist ? 0.12 : 0, clamp(speedKn / 3, 0, 1)) * dt);
}

/** Metres in earth coordinates: east and north are positive. Heading and
 * leeway are degrees, speed is knots, dt is real simulation seconds. */
export function sailingDisplacement(heading: number, leeway: number, speedKn: number, dt: number): { east: number; north: number } {
  const course = (heading + leeway) * Math.PI / 180;
  const distance = speedKn * KNOT_METRES_PER_SECOND * dt;
  return { east: Math.sin(course) * distance, north: Math.cos(course) * distance };
}
