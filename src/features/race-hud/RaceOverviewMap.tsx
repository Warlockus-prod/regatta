"use client";

import { useId } from "react";
import { raceMapProjection, type RaceNavigationSnapshot } from "./navigation-model";

export interface RaceOverviewLabels {
  title: string; north: string; start: string; finish: string; marks: string;
  you: string; fleet: string; windFrom: string; empty: string;
}
export interface RaceOverviewMapProps {
  snapshot: RaceNavigationSnapshot | null;
  labels: RaceOverviewLabels;
  width?: number;
  height?: number;
}
const number = (value: number) => Number(value.toFixed(2));
const CYAN = "var(--accent-cyan, #00d4ff)", SECONDARY = "var(--text-secondary, #a2b4c4)";

/** A north-up schematic of the supplied race, never another game renderer. */
export function RaceOverviewMap({ snapshot, labels, width = 320, height = 220 }: RaceOverviewMapProps) {
  const clip = `race-map-${useId().replace(/:/g, "")}`;
  const projection = snapshot && raceMapProjection(snapshot.bounds, width, height);
  if (!snapshot || !projection) return <p role="status" data-testid="race-map-empty">{labels.empty}</p>;
  const { project, viewport } = projection;
  let windwardOrdinal = 0;
  const line = (kind: "start" | "finish" | "start-finish", endpoints: RaceNavigationSnapshot["course"]["startLine"], label: string) => {
    const a = project(endpoints.a), b = project(endpoints.b);
    return <line data-map-line={kind} x1={number(a.x)} y1={number(a.y)} x2={number(b.x)} y2={number(b.y)}
      stroke={kind === "finish" ? "var(--success, #3ddc84)" : "var(--warning, #ffaa00)"} strokeWidth={2} strokeDasharray={kind === "finish" ? undefined : "5 3"}><title>{label}</title></line>;
  };
  return <figure className="m-0" data-testid="race-overview-map">
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={labels.title}
      style={{ width: "100%", height: "auto", display: "block", color: SECONDARY }}>
      <title>{labels.title}</title>
      <defs><clipPath id={clip}><rect x={viewport.x} y={viewport.y} width={viewport.width} height={viewport.height} /></clipPath></defs>
      <rect x={0} y={0} width={width} height={height} rx={8} fill="var(--bg-card, #102838)" />
      <g clipPath={`url(#${clip})`}>
        {snapshot.terrain.map((polygon, index) => <polygon key={index} data-map-terrain="" points={polygon.map(point => { const p = project(point); return `${number(p.x)},${number(p.y)}`; }).join(" ")}
          fill="var(--bg-secondary, #263c42)" stroke={SECONDARY} strokeOpacity={.35} strokeWidth={1} />)}
        {line(snapshot.sharedLine ? "start-finish" : "start", snapshot.course.startLine, snapshot.sharedLine ? `${labels.start} / ${labels.finish}` : labels.start)}
        {!snapshot.sharedLine && line("finish", snapshot.course.finishLine, labels.finish)}
        {snapshot.course.marks.map((mark, index) => {
          const p = project(mark.pos);
          const ordinal = mark.type === "windward" ? ++windwardOrdinal : null;
          const label = mark.type === "start" ? labels.start : mark.type === "finish" ? labels.finish : `${labels.marks} ${ordinal}`;
          return <g key={index} data-map-mark={mark.type} transform={`translate(${number(p.x)} ${number(p.y)})`}>
            <title>{label}</title>
            <circle r={mark.type === "windward" ? 4 : 3} fill="var(--warning, #ffaa00)" stroke="var(--bg-primary, #071923)" strokeWidth={1} />
            {ordinal !== null && <text x={7} y={-5} fontSize={10} fill={SECONDARY}>{ordinal}</text>}
          </g>;
        })}
        {snapshot.boats.map(boat => {
          const p = project(boat.pos);
          return <g key={boat.id} data-map-boat={boat.isPlayer ? "player" : "rival"} transform={`translate(${number(p.x)} ${number(p.y)}) rotate(${number(boat.heading)})`}>
            <title>{boat.isPlayer ? labels.you : labels.fleet}</title>
            <path d="M0-7 L-4 6 L0 4 L4 6 Z" fill={boat.isPlayer ? CYAN : boat.color ?? SECONDARY} stroke="var(--bg-primary, #071923)" strokeWidth={boat.isPlayer ? 1.5 : 1} />
          </g>;
        })}
      </g>
      <g aria-hidden="true" fill={SECONDARY} stroke="none">
        <text x={12} y={14} fontSize={10}>{labels.north}</text>
        <path d="M18 19 L14 28 L18 25 L22 28 Z" />
      </g>
      {snapshot.windFrom !== null && <g data-map-wind="" transform={`translate(${width - 24} 27)`}>
        <title>{`${labels.windFrom}: ${Math.round(snapshot.windFrom)}°`}</title>
        <g transform={`rotate(${number(snapshot.windFrom)})`} stroke={CYAN} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M0-12 V5 M-4 0 L0 5 L4 0" />
        </g>
      </g>}
    </svg>
    <figcaption className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: SECONDARY }}>
      <span>{snapshot.sharedLine ? `${labels.start} / ${labels.finish}` : `${labels.start} · ${labels.finish}`}</span>
      <span style={{ color: CYAN }}>▲ {labels.you}</span>
      <span>{labels.fleet}: {snapshot.boats.filter(boat => !boat.isPlayer).length}</span>
      {snapshot.windFrom !== null && <span>{labels.windFrom}: {Math.round(snapshot.windFrom)}°</span>}
    </figcaption>
  </figure>;
}
