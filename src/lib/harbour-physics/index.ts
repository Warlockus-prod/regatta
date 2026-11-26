// Harbour mode (Manoeuvres section): low-speed 3-DOF model of our yacht under
// engine. Separate from src/lib/sailing-physics, whose constants it never
// changes; it only reads the shared hull length, displacement and drag.
export * from "./types";
export { OUR_YACHT, hullOutline } from "./yacht";
export { HARBOUR_STEP_SECONDS, attachLine, createHarbourState, hullWorld, releaseLine, speedKnots, stepHarbour } from "./step";
export { angleDiff, axes, ccw, clearance, compass, insideConvex, KNOT, rect, toBody, toWorld, type Pose } from "./geometry";
