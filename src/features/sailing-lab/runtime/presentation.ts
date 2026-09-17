import type { YachtState } from "../../simulator-3d/types";
import type { SailingSession } from "./session";

/** A read-only view adapter. It never advances the clock or changes trim. */
export function yachtFromSession(s: SailingSession): YachtState {
  return {
    boomAngle: s.rig.main, jibAngle: s.rig.jib, rigResolved: true, sailSide: s.rig.lee,
    mainTrim: s.mainTrim ? { pose: s.mainTrim.pose, traveler: s.mainTrim.command.traveler, slack: s.mainTrim.slack,
      vangSlack: s.mainTrim.vangSlack, outhaulEase: s.mainTrim.command.outhaulEase } : undefined,
    mainHoisted: s.live.mainHoisted !== false,
    camber: 0.6 - 0.2 * s.live.reef, twist: s.live.mainTwist,
    luff: s.main.luff, fill: s.main.fill, airSpeed: s.main.airSpeed, reef: s.live.reef,
    rudderAngle: s.steering.mode === "helm" ? s.steering.rudder * 35 : 0,
    heel: s.boat.heel, heading: s.boat.heading, speedKn: s.boat.boatSpeed,
    wind: { from: s.boat.trueWindDir, knots: s.boat.trueWindSpeed },
    apparentWind: { from: (s.boat.heading + s.lastDiag.awa + 360) % 360, knots: s.lastDiag.aws },
    travel: { x: s.position.east, z: -s.position.north },
    jibShape: { camber: 0.7, twist: s.live.jibTwist, luff: s.jib.luff, fill: s.jib.fill,
      airSpeed: s.jib.airSpeed, furl: s.live.jibFurl },
  };
}
