'use client';

// The big race map (F3, TestFlight 74: "the map is small, needs different
// modes and the ability to zoom"). A panel over the race scene, opened from
// the corner map: the course with the side to leave each mark on, every boat,
// the player's track, the wind and the route hint when hints are on (the same
// sailing legs as the route on the water); zoom by buttons, pinch or the mouse
// wheel, drag to look round when zoomed in; north up or bow up; "whole course"
// goes back to zoom 1. The race keeps running: the panel covers only the
// scene, so the helm in the dock stays usable, and the countdown, start flags
// and race toasts stay above it. The replay shows the same panel with the
// boat at the replay's time. The view maths is pure (map-view.ts).

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useI18n } from "@/lib/i18n";
import type { Vec2 } from "@/lib/race-physics";
import type { RaceGuidance } from "@/lib/race-guidance";
import { RACE_MAP_COPY } from "@/data/race-map-copy";
import { guidancePath } from "@/features/race-scene/guidance";
import { RaceOverviewMap } from "./RaceOverviewMap";
import { useRaceNavigationCopy } from "./navigation-copy";
import type { RaceNavigationSnapshot } from "./navigation-model";
import { BIG_MAP_INITIAL, MAP_ZOOM, bigMapReducer, mapDragToPan, mapFitBounds, mapPanLimit, mapTrackPoints, raceMapView, type BigMapAction, type BigMapState, type MapOrientation } from "./map-view";
import { CloseIcon, MinusIcon, PlusIcon } from "./RaceIcons";
import styles from "./RaceBigMap.module.css";

/** The orientation the player chose last, for this page's life (race to race and the replay). */
let rememberedOrientation: MapOrientation = BIG_MAP_INITIAL.orientation;

export interface RaceBigMapProps {
  snapshot: RaceNavigationSnapshot | null;
  /** The player's recorded positions (race log samples or the replay up to its time). */
  track?: readonly Readonly<{ x: number; y: number }>[] | null;
  /** The route hint (the race aid), only when hints are on; the map draws the
   * same legs as the route on the water from the player's boat. */
  guidance?: RaceGuidance | null;
  you: string; fleet: string;
  onClose: () => void;
  /** A short line under the map (the race: it keeps running). */
  note?: string;
  /** The host's placement (top under the race status row, room for the coach line). */
  className?: string;
}

export function RaceBigMap({ snapshot, track, guidance, you, fleet, onClose, note, className }: RaceBigMapProps) {
  const { tl } = useI18n();
  const nav = useRaceNavigationCopy();
  const titleId = `race-big-map-${useId().replace(/:/g, "")}`;
  const [state, setState] = useState<BigMapState>(() => ({ ...BIG_MAP_INITIAL, orientation: rememberedOrientation }));
  const [size, setSize] = useState({ width: 360, height: 360 });
  const frameRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pointers = useRef(new Map<number, Vec2>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  // The zoom when a pinch begins (the pinch scales from it).
  const zoomRef = useRef(state.zoom);
  useEffect(() => { zoomRef.current = state.zoom; }, [state.zoom]);
  // Close as it is now, for the window's Esc listener (set up once).
  const closeHandler = useRef(onClose);
  closeHandler.current = onClose;
  const act = (action: BigMapAction) => setState(previous => {
    const next = bigMapReducer(previous, action);
    rememberedOrientation = next.orientation;
    return next;
  });

  // The map fills its frame: measure it (no layout read per render).
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const box = frame.getBoundingClientRect();
      const width = Math.round(box.width), height = Math.round(box.height);
      if (width >= 64 && height >= 64) setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);
  // The mouse wheel zooms the map, never the page (a passive React listener cannot prevent it).
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      act({ type: "factor", factor: Math.exp(-event.deltaY / 400) });
    };
    frame.addEventListener("wheel", wheel, { passive: false });
    return () => frame.removeEventListener("wheel", wheel);
  }, []);
  // Esc closes the map wherever focus is (the helm in the dock, typically),
  // before the race's own Esc (pause) on the window sees it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault(); event.stopImmediatePropagation();
      closeHandler.current();
    };
    window.addEventListener("keydown", escape, true);
    return () => window.removeEventListener("keydown", escape, true);
  }, []);
  // Focus goes to Close on open and back to where it was (the corner map) on
  // close. The opener is read once, on the first render: a development
  // double effect must not take the Close button for it.
  const [opener] = useState(() => typeof document === "undefined" ? null : document.activeElement as HTMLElement | null);
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      const active = typeof document === "undefined" ? null : document.activeElement;
      if (opener?.isConnected && (!active || active === document.body)) opener.focus({ preventScroll: true });
    };
  }, [opener]);

  const player = snapshot?.boats.find(boat => boat.isPlayer) ?? null;
  const trackPoints = mapTrackPoints(track ?? []);
  const fit = snapshot ? mapFitBounds(snapshot, trackPoints) : null;
  const view = snapshot && fit ? raceMapView({ fit, width: size.width, height: size.height,
    zoom: state.zoom, orientation: state.orientation, player, pan: state.pan }) : null;
  const orientation = player ? state.orientation : "north";
  const routePoints = player && guidance && snapshot?.windFrom !== null && snapshot?.windFrom !== undefined
    ? guidancePath(player.pos, player.heading, snapshot.windFrom, guidance) : [];
  // The path starts at the boat itself (guidance.ts).
  const route = routePoints.length >= 2 ? routePoints : null;

  // Two fingers on the map: zoom by the change of their distance since the
  // pinch began. One finger (or the mouse) drags the map when zoomed in.
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest?.("button")) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: zoomRef.current };
    }
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1 && !pinch.current) {
      if (!view || !fit) return;
      const step = mapDragToPan(view, event.clientX - previous.x, event.clientY - previous.y);
      if (step.x || step.y) act({ type: "pan", dx: step.x, dy: step.y, limit: mapPanLimit(fit) });
      return;
    }
    const start = pinch.current;
    if (!start || pointers.current.size !== 2 || start.distance < 8) return;
    const [a, b] = [...pointers.current.values()];
    act({ type: "scale", base: start.zoom, factor: Math.hypot(a.x - b.x, a.y - b.y) / start.distance });
  };
  const up = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };
  const key = (event: KeyboardEvent<HTMLElement>) => {
    // Esc closes the map instead of pausing the race underneath it.
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    else if (event.key === "+" || event.key === "=") act({ type: "zoom", steps: 1 });
    else if (event.key === "-") act({ type: "zoom", steps: -1 });
  };

  return <section role="dialog" aria-modal="false" aria-labelledby={titleId} className={`${styles.overlay}${className ? ` ${className}` : ""}`}
    data-testid="race-big-map" data-map-zoom={Number(state.zoom.toFixed(2))} data-map-orientation={orientation}
    data-map-panned={state.pan.x || state.pan.y ? "" : undefined} onKeyDown={key}>
    {/* Title, orientation and Close share the header: on a short scene the
        title is only read out and the orientation moves up beside Close. */}
    <header className={styles.head}>
      <h2 id={titleId}>{nav.map}</h2>
      <div className={styles.modes} role="radiogroup" aria-label={tl(RACE_MAP_COPY.orientation)}>
        {(["north", "heading"] as const).map(mode => <button key={mode} type="button" role="radio" aria-checked={orientation === mode}
          disabled={mode === "heading" && !player} onClick={() => act({ type: "orientation", orientation: mode })}>
          {tl(mode === "north" ? RACE_MAP_COPY.northUp : RACE_MAP_COPY.headingUp)}</button>)}
      </div>
      <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label={tl(RACE_MAP_COPY.close)} title={tl(RACE_MAP_COPY.close)}
        data-testid="race-big-map-close"><CloseIcon size={24} /></button>
    </header>
    <div ref={frameRef} className={styles.frame} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}>
      <RaceOverviewMap snapshot={snapshot} width={size.width} height={size.height} view={view} track={trackPoints} route={route} caption={false}
        testId="race-big-map-view" labels={{ ...nav, title: nav.map, you, fleet, roundPort: tl(RACE_MAP_COPY.roundPort),
          roundStarboard: tl(RACE_MAP_COPY.roundStarboard), track: tl(RACE_MAP_COPY.track), route: tl(RACE_MAP_COPY.route) }} />
    </div>
    {/* Under the map, never over it: no control hides the start line or a boat. */}
    <div className={styles.zoom} role="group" aria-label={tl(RACE_MAP_COPY.zoom)}>
      <button type="button" className={styles.fit} onClick={() => act({ type: "fit" })} disabled={state.zoom <= MAP_ZOOM.min}
        data-testid="race-big-map-fit">{tl(RACE_MAP_COPY.fit)}</button>
      <button type="button" onClick={() => act({ type: "zoom", steps: -1 })} disabled={state.zoom <= MAP_ZOOM.min}
        aria-label={tl(RACE_MAP_COPY.zoomOut)} title={tl(RACE_MAP_COPY.zoomOut)} data-testid="race-big-map-zoom-out"><MinusIcon size={24} /></button>
      <button type="button" onClick={() => act({ type: "zoom", steps: 1 })} disabled={state.zoom >= MAP_ZOOM.max}
        aria-label={tl(RACE_MAP_COPY.zoomIn)} title={tl(RACE_MAP_COPY.zoomIn)} data-testid="race-big-map-zoom-in"><PlusIcon size={24} /></button>
    </div>
    {note && <p className={styles.note}>{note}</p>}
  </section>;
}
