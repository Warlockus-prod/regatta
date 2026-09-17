import { sailDimensions } from "@/lib/sailing-physics/sail-plan";
import { sectionTwistDegrees } from "@/lib/sailing-physics/forces";

// Orthographic views of the same planform and inclined forestay as the 3D rig.
// Deliberately no Three.js dependency in the lightweight Trainer.
export function projectSailPoint(kind: "main" | "jib", u: number, v: number,
  angle: number, side: number, reef: number, furl: number, rear: boolean, twist = 0, boomRise = 0) {
  const p = sailDimensions(kind, reef, furl);
  const width = Math.max(0, p.foot * (1 - v) + p.roach * Math.sin(Math.PI * v));
  const pitch = (kind === "main" ? boomRise : 0) * Math.PI / 180;
  const footX = -width * u, footY = p.rise * (1 - v) * u;
  const cx = footX * Math.cos(pitch) + footY * Math.sin(pitch);
  const cy = -footX * Math.sin(pitch) + footY * Math.cos(pitch);
  const radians = (angle + sectionTwistDegrees(twist, v)) * Math.PI / 180;
  const cos = Math.cos(radians), sin = Math.sin(radians);
  const length = Math.hypot(p.luffOffset, p.height);
  const ax = p.luffOffset / length, ay = p.height / length;
  const dot = ax * cx + ay * cy;
  const x = cx * cos + ax * dot * (1 - cos);
  const y = cy * cos + ay * dot * (1 - cos);
  const z = (ax * cy - ay * cx) * sin;
  const originX = kind === "main" ? 0.3 : 6.3;
  const originY = kind === "main" ? 2.74 : 1.5;
  return {
    x: (rear ? side * z : originX + p.luffOffset * v + x) * 16,
    y: -(originY + p.height * v + y) * 16,
  };
}

export function projectedSailPath(kind: "main" | "jib", angle: number, side: number,
  reef: number, furl: number, rear: boolean, twist = 0, boomRise = 0) {
  const at = (u: number, v: number) => projectSailPoint(kind, u, v, angle, side, reef, furl, rear, twist, boomRise);
  const tack = at(0, 0);
  const leech = Array.from({length: 33}, (_, i) => at(1, i / 32));
  return `M ${tack.x} ${tack.y} ${leech.map(p => `L ${p.x} ${p.y}`).join(" ")} Z`;
}
