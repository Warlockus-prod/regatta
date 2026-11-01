"use client";

import { useId } from "react";
import { raceMapProjection, type RaceNavigationSnapshot } from "./navigation-model";
import { PLAYER_COLOR } from "./boat-colors";
import { radarBounds } from "./radar";
import { roundingArc, type RaceMapView } from "./map-view";
import type { Vec2 } from "@/lib/race-physics";

export interface RaceOverviewLabels {
  title: string; north: string; start: string; finish: string; marks: string;
  you: string; fleet: string; windFrom: string; empty: string;
  /** F3: names of the rounding arrows, the track and the route line (big map). */
  roundPort?: string; roundStarboard?: string; track?: string; route?: string;
}
export interface RaceOverviewMapProps {
  snapshot: RaceNavigationSnapshot | null;
  labels: RaceOverviewLabels;
  width?: number;
  height?: number;
  compact?: boolean;
  /** Radar around the player (M2-4): north up, zoomed to the next mark and the
   * nearest rivals, dark and translucent. Default: on for the compact map. */
  radar?: boolean;
  /** The player's next mark or finish in race coordinates; without it the
   * radar reaches the nearest rounding mark. */
  focus?: Vec2 | null;
  /** One hull length in race coordinates of the active model (radar minimum zoom). */
  hullLength?: number;
  /** F3 big map: its own projection (zoom, north up or bow up) instead of the fitted course. */
  view?: RaceMapView | null;
  /** F3: the player's recorded track, race coordinates (full map only). */
  track?: readonly Vec2[];
  /** F3: the route hint from the player's boat (first point) to the next
   * target, when hints are on: the same sailing legs as the route on the
   * water (features/race-scene/guidance.ts), never a line through the no-go zone. */
  route?: readonly Readonly<Vec2>[] | null;
  /** The legend under the full map (the big map has its own controls instead). */
  caption?: boolean;
  testId?: string;
}
const number = (value: number) => Number(value.toFixed(2));
// Cyan is for actions only (M1-7): the player has its own race colour and the
// wind arrow is a reading, drawn in the primary text colour.
const SECONDARY = "var(--text-secondary, #a2b4c4)", WIND = "var(--text-primary, #e8f4f8)";
const BOAT_PATH = "M0-7 L-4 6 L0 4 L4 6 Z";
/** The route hint's colour, the same yellow as the route on the water
 * (GUIDANCE_COLOR in features/race-3d/Race3DView.tsx, not imported: that
 * module loads three.js). A reading, not an action, so never cyan. */
const ROUTE = "#ffd23f";
/** Pixel radius of the rounding arrow round a mark. */
const ROUNDING_PX = 14;
/** The radar's own dark glass in both themes, so the scene shows through it. */
const RADAR_FILL = "rgba(4, 14, 22, 0.58)";
/** Fixed light ink on that glass: the theme's text tokens turn dark in the
 * light theme and would vanish on it. A solid halo keeps mark numbers legible. */
const RADAR_INK = "#c3d3dd", RADAR_STRONG = "#eef5f8", RADAR_HALO = "#04101a", RADAR_LAND = "rgba(150, 170, 180, 0.3)";

/** A north-up schematic of the supplied race, never another game renderer. */
export function RaceOverviewMap({ snapshot, labels, width = 320, height = 220, compact = false, radar = compact, focus, hullLength,
  view = null, track, route = null, caption = !compact, testId }: RaceOverviewMapProps) {
  const clip = `race-map-${useId().replace(/:/g, "")}`;
  // A snapshot may carry the player's next target itself (navigation-model).
  const snapshotFocus = (snapshot as { readonly focus?: Vec2 | null } | null)?.focus;
  const zoom = snapshot && radar && !view ? radarBounds(snapshot, focus !== undefined ? focus : snapshotFocus, { hull: hullLength }) : null;
  const projection = snapshot && (view ? { project: view.project, scale: view.scale, viewport: { x: 0, y: 0, width, height } }
    : raceMapProjection(zoom ?? snapshot.bounds, width, height));
  if (!snapshot || !projection) return <p role="status" data-testid="race-map-empty">{labels.empty}</p>;
  const { project, viewport } = projection;
  // F3 bow up: the world turns by -heading, so every glyph that shows a
  // direction (boats, wind, north) turns with it.
  const rotation = view?.rotation ?? 0;
  const turn = (degrees: number) => number(((degrees + rotation) % 360 + 360) % 360);
  const Container = compact ? "span" : "figure";
  const full = !compact;
  // The big map draws its glyphs larger: it is read at a glance over the race.
  const glyph = view ? 1.6 : 1;
  const trackPoints = full && track && track.length >= 2 ? track.map(point => { const p = project(point); return `${number(p.x)},${number(p.y)}`; }).join(" ") : null;
  const ink = zoom ? RADAR_INK : SECONDARY, strong = zoom ? RADAR_STRONG : WIND;
  const centre = zoom ? project({ x: (zoom.minX + zoom.maxX) / 2, y: (zoom.minY + zoom.maxY) / 2 }) : null;
  // Keep edge boats fully visible in the smaller map, inside its outer frame.
  const clipViewport = compact ? { x: 8, y: 8, width: width - 16, height: height - 16 } : viewport;
  let windwardOrdinal = 0;
  const line = (kind: "start" | "finish" | "start-finish", endpoints: RaceNavigationSnapshot["course"]["startLine"], label: string) => {
    const a = project(endpoints.a), b = project(endpoints.b);
    return <line data-map-line={kind} x1={number(a.x)} y1={number(a.y)} x2={number(b.x)} y2={number(b.y)}
      stroke={kind === "finish" ? "var(--success, #3ddc84)" : "var(--warning, #ffaa00)"} strokeWidth={2} strokeDasharray={kind === "finish" ? undefined : "5 3"}><title>{label}</title></line>;
  };
  const ordinals: { x: number; y: number; ordinal: number }[] = [];
  return <Container className="m-0" data-testid={testId ?? (compact ? "race-mini-map" : "race-overview-map")} data-map-mode={zoom ? "radar" : "course"}
    data-map-rotation={view ? turn(0) : undefined}>
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={labels.title}
      style={{ width: "100%", height: "var(--race-map-height, auto)", display: "block", color: ink }}>
      <title>{labels.title}</title>
      <defs><clipPath id={clip}><rect x={clipViewport.x} y={clipViewport.y} width={clipViewport.width} height={clipViewport.height} /></clipPath></defs>
      <rect x={0} y={0} width={width} height={height} rx={8} fill={zoom ? RADAR_FILL : "var(--bg-card, #102838)"} />
      <g clipPath={`url(#${clip})`}>
        {centre && zoom && <circle data-map-range="" cx={number(centre.x)} cy={number(centre.y)} r={number((zoom.maxX - zoom.minX) * projection.scale / 4)}
          fill="none" stroke={ink} strokeOpacity={.35} strokeWidth={1} strokeDasharray="2 3" />}
        {snapshot.terrain.map((polygon, index) => <polygon key={index} data-map-terrain="" points={polygon.map(point => { const p = project(point); return `${number(p.x)},${number(p.y)}`; }).join(" ")}
          fill={zoom ? RADAR_LAND : "var(--bg-secondary, #263c42)"} stroke={ink} strokeOpacity={.35} strokeWidth={1} />)}
        {trackPoints && <polyline data-map-track="" points={trackPoints} fill="none" stroke={PLAYER_COLOR} strokeOpacity={.75} strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round">{labels.track && <title>{labels.track}</title>}</polyline>}
        {line(snapshot.sharedLine ? "start-finish" : "start", snapshot.course.startLine, snapshot.sharedLine ? `${labels.start} / ${labels.finish}` : labels.start)}
        {!snapshot.sharedLine && line("finish", snapshot.course.finishLine, labels.finish)}
        {snapshot.course.marks.map((mark, index) => {
          const p = project(mark.pos);
          const ordinal = mark.type === "windward" ? ++windwardOrdinal : null;
          const label = mark.type === "start" ? labels.start : mark.type === "finish" ? labels.finish : `${labels.marks} ${ordinal}`;
          if (ordinal !== null) ordinals.push({ x: p.x, y: p.y, ordinal });
          // F3: the side to leave a rounding mark on, as an arrow round it in
          // the direction of travel (standard course: windward marks to port).
          const side = mark.roundSide ?? (mark.type === "windward" ? "port" : null);
          const arc = full && side ? roundingArc(mark.pos, ROUNDING_PX / projection.scale, side).map(project) : null;
          const tip = arc?.at(-1), back = arc?.at(-3);
          const head = tip && back ? (() => {
            const a = Math.atan2(tip.y - back.y, tip.x - back.x), l = 5;
            const at = (d: number) => `${number(tip.x - Math.cos(a + d) * l)},${number(tip.y - Math.sin(a + d) * l)}`;
            return `${number(tip.x)},${number(tip.y)} ${at(.5)} ${at(-.5)}`;
          })() : null;
          return <g key={index}>
            {arc && head && <g data-map-rounding={side} stroke={strong} fill="none" strokeWidth={1.5} strokeLinecap="round">
              <title>{side === "port" ? labels.roundPort ?? label : labels.roundStarboard ?? label}</title>
              <polyline points={arc.map(q => `${number(q.x)},${number(q.y)}`).join(" ")} />
              <polygon points={head} fill={strong} stroke="none" />
            </g>}
            <g data-map-mark={mark.type} transform={`translate(${number(p.x)} ${number(p.y)})`}>
              <title>{label}</title>
              <circle r={(mark.type === "windward" ? 4 : 3) * glyph} fill="var(--warning, #ffaa00)" stroke="var(--bg-primary, #071923)" strokeWidth={1} />
            </g>
          </g>;
        })}
        {full && route && route.length >= 2 && <polyline data-map-route="" points={route.map(point => { const q = project(point); return `${number(q.x)},${number(q.y)}`; }).join(" ")}
          fill="none" stroke={ROUTE} strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round">{labels.route && <title>{labels.route}</title>}</polyline>}
        {snapshot.boats.map(boat => {
          const p = project(boat.pos);
          return <g key={boat.id} data-map-boat={boat.isPlayer ? "player" : "rival"} transform={`translate(${number(p.x)} ${number(p.y)}) rotate(${turn(boat.heading)})`}>
            <title>{boat.isPlayer ? labels.you : labels.fleet}</title>
            <path d={BOAT_PATH} transform={view ? `scale(${glyph})` : undefined} fill={boat.isPlayer ? PLAYER_COLOR : boat.color ?? ink} stroke="var(--bg-primary, #071923)" strokeWidth={boat.isPlayer ? 1.5 : 1} />
          </g>;
        })}
        {/* Mark numbers last: a boat glyph never covers them. */}
        {ordinals.map(({ x, y, ordinal }) => <text key={ordinal} data-map-ordinal="" x={number(x + (view ? 10 : 7))} y={number(y + (view ? 18 : -5))} fontSize={view ? 14 : 10} fill={zoom ? strong : SECONDARY}
          stroke={zoom ? RADAR_HALO : undefined} strokeWidth={zoom ? 2 : undefined} paintOrder={zoom ? "stroke" : undefined}>{ordinal}</text>)}
      </g>
      <g aria-hidden="true" fill={ink} stroke="none">
        <text x={12} y={14} fontSize={view ? 12 : 10}>{labels.north}</text>
        {/* Bow up turns only the arrow; the label stays level and readable. */}
        <path data-map-north="" d="M18 19 L14 28 L18 25 L22 28 Z" transform={rotation ? `rotate(${turn(0)} 18 23.5)` : undefined} />
      </g>
      {snapshot.windFrom !== null && <g data-map-wind="" transform={`translate(${width - 24} 27)`}>
        <title>{`${labels.windFrom}: ${Math.round(snapshot.windFrom)}°`}</title>
        <g transform={`rotate(${turn(snapshot.windFrom)})`} stroke={strong} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M0-12 V5 M-4 0 L0 5 L4 0" />
        </g>
      </g>}
    </svg>
    {caption && <figcaption className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: SECONDARY }}>
      <span>{snapshot.sharedLine ? `${labels.start} / ${labels.finish}` : `${labels.start} · ${labels.finish}`}</span>
      <span className="inline-flex items-center gap-1" data-map-legend="player">
        <svg width="10" height="14" viewBox="-5 -8 10 15" aria-hidden="true"><path d={BOAT_PATH} fill={PLAYER_COLOR} /></svg>
        {labels.you}
      </span>
      <span>{labels.fleet}: {snapshot.boats.filter(boat => !boat.isPlayer).length}</span>
      {snapshot.windFrom !== null && <span>{labels.windFrom}: {Math.round(snapshot.windFrom)}°</span>}
    </figcaption>}
  </Container>;
}
