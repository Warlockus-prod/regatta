// ============================================================================
// Sailing physics - type definitions
//
// Conventions:
// - All user-facing angles in DEGREES (TWA, AWA, heel, heading, sail angles).
// - All speeds at the interface in KNOTS (boat speed, wind speed).
// - Internally math uses RADIANS and m/s; convert at boundaries.
// - Boat frame: +x = starboard, +y = forward (bow).
// - TWA in [-180, 180]. Positive = wind from starboard (starboard tack).
//   Negative = wind from port (port tack).
// - Heel positive = mast leans to starboard; negative = port.
// - Heading in [0, 360), compass bearing (0 = north, 90 = east, 180 = south).
// ============================================================================

/** Everything the engine treats as the evolving state of the boat. */
export interface BoatState {
  // Environment
  /** Compass bearing FROM which the true wind blows. 0-360 deg. */
  trueWindDir: number;
  /** True wind speed, knots. */
  trueWindSpeed: number;

  // Boat motion
  /** Compass bearing the bow points. 0-360 deg. */
  heading: number;
  /** Boat speed over water through hull axis, knots. */
  boatSpeed: number;
  /** Heel angle, degrees. Positive = starboard, negative = port. */
  heel: number;
  /** Leeway angle, degrees. Drift off bow axis toward leeward. */
  leeway: number;
}

/** Optional resolved rig for runtimes that animate sheet transfer. Angles and
 * loading must describe the same sails that are drawn. Omission preserves the
 * steady-trim engine used by the polar solver, lessons and race server. */
export interface ResolvedRig {
  main: { angleOff: number; side: 1 | -1; load: number; outhaulEase?: number };
  jib: { angleOff: number; side: 1 | -1; load: number };
}

/** User inputs that shape the sails. All in [0, 1] except jibSide. */
export interface Controls {
  /** False lowers the main completely; reefing alone never lowers it. */
  mainHoisted?: boolean;
  /** Main sheet tension. 0 = fully eased, 1 = hard sheeted. */
  mainSheet: number;
  /** Jib sheet tension. 0 = fully eased, 1 = hard sheeted. */
  jibSheet: number;
  /** Main twist. 0 = no twist (bottom and top same angle), 1 = max twist. */
  mainTwist: number;
  /** Jib twist. 0-1. */
  jibTwist: number;
  /** Reef depth. 0 = full main, 1 = deep-reefed (halves sail area). */
  reef: number;
  /** Jib furl amount. 0 = full jib, 1 = fully furled. */
  jibFurl: number;
  /** Which side the jib is set on. +1 = same side as main (normal),
   *  -1 = opposite side (wing-on-wing downwind). */
  jibSide: 1 | -1;
}

/** Constant parameters of the abstract 2-sail cruiser we simulate. */
export interface BoatParams {
  /** Displacement in kg. */
  displacement: number;
  /** Length overall, meters (informational). */
  loa: number;
  /** Waterline length, meters. Drives hull speed. */
  lwl: number;
  /** Main sail area at full hoist, m^2. */
  mainArea: number;
  /** Jib sail area at full hoist / unfurled, m^2. */
  jibArea: number;
  /** Effective vertical center of pressure for main, meters above waterline. */
  mainCOP: number;
  /** Effective vertical center of pressure for jib, meters above waterline. */
  jibCOP: number;
  /** Max main-boom off-centerline angle, degrees. */
  mainMaxOff: number;
  /** Max jib off-centerline angle, degrees. */
  jibMaxOff: number;
  /** Min jib off-centerline angle (hard sheeted), degrees. */
  jibMinOff: number;
  /** Metacentric height GM, meters. Drives righting moment. */
  gm: number;
  /** Hull drag coefficient (D = k * v^2, v in m/s). */
  hullDragK: number;
  /** Keel side-force effectiveness (N per radian of leeway per m^2/s^2). */
  keelK: number;
  /** Boat inertial mass for surge (kg, not necessarily = displacement). */
  surgeMass: number;
  /** Seamanlike resistance and soft-sail model (DECISIONS.md ADR-0021). When
   *  present, hullDragK is the frictional part only. Absent on the classic
   *  profile, which keeps the ADR-0001/0002 arithmetic bit for bit. */
  model?: CruiserModel;
}

/** Physics terms of the cruiser profile (DECISIONS.md ADR-0021). Every number
 *  is a calibration of an abstract ~45 ft two-sail cruiser, not a certificate. */
export interface CruiserModel {
  /** Profile id, carried into race-model metadata. */
  id: string;
  /** Residuary (wave-making) resistance as a share of displacement weight
   *  against the Froude number on the waterline, [Fn, Rr / (m g)], Delft form.
   *  Linear between rows, extrapolated with the last slope above the table. */
  residuary: readonly (readonly [number, number])[];
  /** Hull resistance grows with heel: times (1 + heelDragK * heel_rad^2). */
  heelDragK: number;
  /** Keel induced drag: share * |side force| * |tan(leeway)|. */
  keelInducedShare: number;
  /** Effective lateral span (m) that supplies the centripetal force of a turn;
   *  its induced drag is (m v r)^2 / (0.5 rho_w (v + 0.5)^2 pi span^2). */
  turnSpanM: number;
  /** Hull, rig and crew windage, drag coefficient times area, m^2. */
  windageCdA: number;
  /** Sail induced drag Cdi = sailInducedK * Cl^2 (rig aspect ratio). */
  sailInducedK: number;
  /** Soft-sail entry: below luffStartDeg the cloth gives no lift, it reaches
   *  the attached lift curve at luffFullDeg. Section angle of attack, deg. */
  luffStartDeg: number;
  luffFullDeg: number;
  /** Extra drag coefficient of flogging cloth below luffFullDeg. */
  luffCd: number;
  /** Downwash of a drawing jib on the main: the main meets an apparent wind
   *  this many degrees finer (full to AWA 60, none from AWA 100). */
  mainBackwindDeg: number;
}

/** Per-step motion the force model cannot see in BoatState. */
export interface TickMotion {
  /** Yaw rate the helm produced this step, degrees per second. */
  yawRateDegPerS?: number;
}

/** Derived per-tick diagnostic values. Not part of state (recomputed each tick)
 *  but returned so the UI can show them. */
export interface TickDiagnostics {
  /** Apparent wind speed, knots. */
  aws: number;
  /** Apparent wind angle from bow, degrees. Sign convention same as TWA. */
  awa: number;
  /** Main angle of attack, degrees (absolute). */
  mainAoA: number;
  /** Jib angle of attack, degrees (absolute). */
  jibAoA: number;
  /** Main stalled flag. */
  mainStalled: boolean;
  /** Jib stalled flag. */
  jibStalled: boolean;
  /** Slot health in [0, 1]. 1 = healthy, 0 = closed / bad. */
  slotHealth: number;
  /** Drive force on boat, N (positive = forward). */
  drive: number;
  /** Side force on boat, N (positive = to starboard, usually negative = to
   *  port for starboard tack). */
  side: number;
  /** Velocity made good to windward, knots. Positive = toward wind. */
  vmg: number;
  /** Total water and air resistance on the boat this step, N (cruiser
   *  profile only; the classic profile leaves it undefined). */
  resistance?: number;
  /** Heel the boat is relaxing toward this step, degrees (cruiser only). */
  heelTarget?: number;
}

/** Full tick output: new state + diagnostics for the UI. */
export interface TickResult {
  state: BoatState;
  diag: TickDiagnostics;
}
