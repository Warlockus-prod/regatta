'use client';

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { useI18n } from "@/lib/i18n";
import { GUIDANCE_COLOR, playerOf, type OriginRef } from "@/features/race-3d/Race3DView";
import { METRES_PER_UNIT, nextTargetInto, toWorld, type Race3DBoat, type Race3DCourse } from "@/features/race-3d/pose";
import { boundaryProximity, noGoEdges, noGoRing, tacticalSizes, zoneMark, type BoundaryProximity, type RaceTacticsModel } from "./tactics";
import { applyEdgeArrow, arrowMetres, ASTERN_DEG, EDGE_ARROW_RADIUS, edgeArrow, edgeArrowInsets, labelSide, offBow, type EdgeArrow, type EdgeArrowStyle, type ScreenInsets } from "./edge-arrow";

// ============================================================================
// Tactics on the water (M2-2, M2-3), drawn inside the race scene: the no-go
// wedge at the bow, the zone ring round the next rounding mark, the course
// boundary where the race clamps the boat, and the screen-edge arrow to the
// next mark with the early boundary hint as two DOM elements over the canvas.
// Package 8: the arrow carries the distance in metres, and with the mark
// astern it shows a "turn round" sign to the side of the shorter turn.
// Every size comes from tacticalSizes(model). Geometries are built once per
// model; the frame loop only moves objects and writes styles that changed.
// ============================================================================

const DEG = Math.PI / 180;
/** The no-go sector: a danger tone, never the action cyan. */
const WEDGE_COLOR = "#ff4d66";
const WEDGE_EDGE_COLOR = "#ff6680";
/** The zone round the mark: plain white, a reading. */
const ZONE_COLOR = "#f4f7fa";
/** The course boundary: red and white like a racing limit on the water. */
const BOUNDARY_COLOR = "#ff5c5c";

/** The arrow's words, written by TacticalScreenLayer (outside the Canvas, where the language is known). */
export interface ArrowCopy { metres: string; behind: string }

export interface TacticalRefs {
  boatsRef: MutableRefObject<Race3DBoat[]>;
  courseRef: MutableRefObject<Race3DCourse>;
  windDirRef: MutableRefObject<number>;
  originRef: OriginRef;
}

function NoGoWedge({ boatsRef, windDirRef, originRef, model }: Omit<TacticalRefs, "courseRef"> & { model: RaceTacticsModel }) {
  const r = useMemo(() => {
    const s = tacticalSizes(model);
    const ring = noGoRing(model);
    const fillGeometry = new THREE.RingGeometry(s.wedgeInner, s.wedgeOuter, 24, 1, ring.thetaStart, ring.thetaLength);
    fillGeometry.rotateX(-Math.PI / 2);
    const fillMaterial = new THREE.MeshBasicMaterial({ color: WEDGE_COLOR, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false });
    const edgeGeometry = new THREE.BoxGeometry(s.wedgeEdgeWidth, 0.05, s.wedgeOuter - s.wedgeInner);
    const edgeMaterial = new THREE.MeshBasicMaterial({ color: WEDGE_EDGE_COLOR, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false, fog: false });
    const group = new THREE.Group();
    const fill = new THREE.Mesh(fillGeometry, fillMaterial);
    fill.renderOrder = 2;
    group.add(fill);
    // The two edges of the sector at windFrom 0, i.e. bearings -half and +half.
    const mid = (s.wedgeInner + s.wedgeOuter) / 2;
    for (const b of noGoEdges(model, 0)) {
      const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
      edge.position.set(Math.sin(b * DEG) * mid, 0.05, -Math.cos(b * DEG) * mid);
      edge.rotation.y = -b * DEG;
      edge.renderOrder = 3;
      group.add(edge);
    }
    group.visible = false;
    return { group, fillGeometry, fillMaterial, edgeGeometry, edgeMaterial };
  }, [model]);
  const ref = useRef(r);
  useEffect(() => {
    ref.current = r;
    return () => { r.fillGeometry.dispose(); r.fillMaterial.dispose(); r.edgeGeometry.dispose(); r.edgeMaterial.dispose(); };
  }, [r]);
  useFrame(() => {
    const r = ref.current;
    const player = playerOf(boatsRef.current);
    r.group.visible = Boolean(player);
    if (!player) return;
    const origin = originRef.current;
    r.group.position.set(player.pos.x * METRES_PER_UNIT - origin.x, 0.6, player.pos.y * METRES_PER_UNIT - origin.z);
    r.group.rotation.y = -windDirRef.current * DEG;
  });
  return <primitive object={r.group} />;
}

/** The zone round the next rounding mark (three hull lengths, as the rules count it). */
function MarkZone({ boatsRef, courseRef, originRef, model }: Omit<TacticalRefs, "windDirRef"> & { model: RaceTacticsModel }) {
  const r = useMemo(() => {
    const s = tacticalSizes(model);
    const geometry = new THREE.RingGeometry(s.zoneRadius - s.zoneRingWidth, s.zoneRadius, 96);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: ZONE_COLOR, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    mesh.visible = false;
    return { mesh, geometry, material };
  }, [model]);
  const ref = useRef(r);
  useEffect(() => {
    ref.current = r;
    return () => { r.geometry.dispose(); r.material.dispose(); };
  }, [r]);
  useFrame(() => {
    const r = ref.current;
    const mark = zoneMark(playerOf(boatsRef.current), courseRef.current);
    r.mesh.visible = Boolean(mark);
    if (!mark) return;
    r.mesh.position.set(mark.x * METRES_PER_UNIT - originRef.current.x, 0.35, mark.y * METRES_PER_UNIT - originRef.current.z);
  });
  return <primitive object={r.mesh} />;
}

/** The edge where the race stops the boat, drawn as a line with a faint band outside it. */
function CourseBoundary({ originRef, model, emphasisRef }: { originRef: OriginRef; model: RaceTacticsModel; emphasisRef: MutableRefObject<boolean> }) {
  const r = useMemo(() => {
    const s = tacticalSizes(model);
    const a = toWorld({ x: model.water.minX, y: model.water.minY });
    const b = toWorld({ x: model.water.maxX, y: model.water.maxY });
    const box = new THREE.BoxGeometry(1, 1, 1);
    const band = new THREE.PlaneGeometry(1, 1);
    band.rotateX(-Math.PI / 2);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: BOUNDARY_COLOR, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });
    const bandMaterial = new THREE.MeshBasicMaterial({ color: BOUNDARY_COLOR, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const group = new THREE.Group();
    const bandWidth = s.hullMetres * 0.4;
    const w = b.x - a.x, h = b.z - a.z;
    // [centre x, centre z, length along x, length along z, outward x, outward z]
    const edges: [number, number, number, number, number, number][] = [
      [a.x + w / 2, a.z, w, s.boundaryWidth, 0, -1], [a.x + w / 2, b.z, w, s.boundaryWidth, 0, 1],
      [a.x, a.z + h / 2, s.boundaryWidth, h, -1, 0], [b.x, a.z + h / 2, s.boundaryWidth, h, 1, 0],
    ];
    for (const [x, z, sx, sz, ox, oz] of edges) {
      const line = new THREE.Mesh(box, lineMaterial);
      line.position.set(x, 0.15, z);
      line.scale.set(sx, s.boundaryHeight, sz);
      line.renderOrder = 2;
      line.frustumCulled = false;
      const outside = new THREE.Mesh(band, bandMaterial);
      outside.position.set(x + ox * bandWidth / 2, 0.12, z + oz * bandWidth / 2);
      outside.scale.set(ox ? bandWidth : sx, 1, oz ? bandWidth : sz);
      outside.renderOrder = 1;
      outside.frustumCulled = false;
      group.add(line, outside);
    }
    return { group, box, band, lineMaterial, bandMaterial };
  }, [model]);
  const ref = useRef(r);
  useEffect(() => {
    ref.current = r;
    return () => { r.box.dispose(); r.band.dispose(); r.lineMaterial.dispose(); r.bandMaterial.dispose(); };
  }, [r]);
  useFrame(() => {
    const r = ref.current;
    r.group.position.set(-originRef.current.x, 0, -originRef.current.z);
    const near = emphasisRef.current;
    r.lineMaterial.opacity = near ? 0.95 : 0.55;
    r.bandMaterial.opacity = near ? 0.3 : 0.14;
  });
  return <primitive object={r.group} />;
}

/** Moves the DOM arrow to the next mark and toggles the boundary hint; writes only changed styles. */
function ScreenCues({ boatsRef, courseRef, originRef, model, arrowRef, hintRef, emphasisRef, copyRef }: Omit<TacticalRefs, "windDirRef"> & {
  model: RaceTacticsModel;
  arrowRef: MutableRefObject<HTMLDivElement | null>;
  hintRef: MutableRefObject<HTMLDivElement | null>;
  emphasisRef: MutableRefObject<boolean>;
  copyRef: MutableRefObject<ArrowCopy>;
}) {
  const scratch = useRef({
    v: new THREE.Vector3(),
    target: { x: 0, y: 0 },
    insets: { top: 0, right: 0, bottom: 0, left: 0 } as ScreenInsets,
    arrow: { visible: false, x: 0, y: 0, angle: 0 } as EdgeArrow,
    proximity: { nearest: Infinity, ahead: Infinity, hint: false } as BoundaryProximity,
    // NaN: never written, so the first show places the arrow (applyEdgeArrow).
    style: { shown: false, x: NaN, y: NaN, angle: NaN } as EdgeArrowStyle,
    hint: false,
    // What the arrow last showed: "ahead", "port" or "starboard" (astern), its words and their side.
    turn: "", labelTurn: "", side: "", metres: NaN, copy: null as ArrowCopy | null,
  });
  useFrame(({ camera, size }) => {
    const s = scratch.current;
    const player = playerOf(boatsRef.current);
    const target = player ? nextTargetInto(player, courseRef.current, s.target) : null;
    const arrowEl = arrowRef.current;
    if (target && arrowEl) {
      s.v.set(target.x * METRES_PER_UNIT - originRef.current.x, 4, target.y * METRES_PER_UNIT - originRef.current.z).project(camera);
      edgeArrow(s.v.x, s.v.y, s.v.z, size.width, size.height, edgeArrowInsets(size.width, size.height, s.insets), s.arrow);
    } else s.arrow.visible = false;
    const disc = arrowEl?.firstElementChild as HTMLElement | null | undefined;
    const glyphs = disc?.children;
    if (arrowEl && player && target && s.arrow.visible && glyphs && glyphs.length >= 2) {
      const dx = target.x - player.pos.x, dy = target.y - player.pos.y;
      const off = offBow(player.heading, dx, dy);
      const turn = Math.abs(off) > ASTERN_DEG ? (off > 0 ? "starboard" : "port") : "ahead";
      if (turn !== s.turn) {
        s.turn = turn;
        (glyphs[0] as HTMLElement).style.display = turn === "ahead" ? "" : "none";
        const back = glyphs[1] as HTMLElement;
        back.style.display = turn === "ahead" ? "none" : "";
        back.style.transform = turn === "port" ? "scaleX(-1)" : "";
        arrowEl.dataset.turn = turn;
      }
      const labelEl = arrowEl.lastElementChild as HTMLElement;
      const metres = arrowMetres(Math.hypot(dx, dy) * METRES_PER_UNIT), copy = copyRef.current;
      // The words are rebuilt only when the distance, the side or the language changed.
      if (metres !== s.metres || turn !== s.labelTurn || copy !== s.copy) {
        s.metres = metres; s.labelTurn = turn; s.copy = copy;
        labelEl.textContent = turn === "ahead" ? `${metres} ${copy.metres}` : `${copy.behind} · ${metres} ${copy.metres}`;
      }
      const side = labelSide(s.arrow.x, size.width);
      if (side !== s.side) {
        s.side = side;
        labelEl.style.left = side === "start" ? "0" : side === "center" ? "50%" : "";
        labelEl.style.right = side === "end" ? "0" : "";
        labelEl.style.transform = side === "center" ? "translateX(-50%)" : "";
      }
    }
    // Astern the sign does not turn with the arrow: it says "turn round" to one side.
    const glyph = (glyphs?.[0] as SVGElement | undefined) ?? null;
    if (arrowEl) applyEdgeArrow(arrowEl, glyph, s.arrow, s.style);
    const hint = player ? boundaryProximity(player.pos, player.heading, player.speed, model, s.proximity).hint : false;
    emphasisRef.current = hint;
    const hintEl = hintRef.current;
    if (hintEl && hint !== s.hint) { hintEl.style.display = hint ? "block" : "none"; s.hint = hint; }
  });
  return null;
}

/** Inside the Canvas: the wedge, the zone ring, the boundary and the screen cues' driver. */
export function TacticalOverlay({ boatsRef, courseRef, windDirRef, originRef, model, arrowRef, hintRef, copyRef }: TacticalRefs & {
  model: RaceTacticsModel;
  arrowRef: MutableRefObject<HTMLDivElement | null>;
  hintRef: MutableRefObject<HTMLDivElement | null>;
  copyRef: MutableRefObject<ArrowCopy>;
}) {
  const emphasisRef = useRef(false);
  return <>
    <NoGoWedge boatsRef={boatsRef} windDirRef={windDirRef} originRef={originRef} model={model} />
    <MarkZone boatsRef={boatsRef} courseRef={courseRef} originRef={originRef} model={model} />
    <CourseBoundary originRef={originRef} model={model} emphasisRef={emphasisRef} />
    <ScreenCues boatsRef={boatsRef} courseRef={courseRef} originRef={originRef} model={model} arrowRef={arrowRef} hintRef={hintRef} emphasisRef={emphasisRef} copyRef={copyRef} />
  </>;
}

/** Package 8 copy: the arrow's words when the next mark is astern. */
export const MARK_BEHIND = { ru: "Знак сзади", en: "Mark behind", pl: "Znak z tyłu", es: "Baliza detrás", fr: "Bouée derrière", de: "Tonne achteraus", it: "Boa dietro" } as const;

/** Over the Canvas: the 44 px arrow to the next mark with its distance, and
 * the boundary hint, both hidden until needed. */
export function TacticalScreenLayer({ arrowRef, hintRef, copyRef, metres }: {
  arrowRef: MutableRefObject<HTMLDivElement | null>;
  hintRef: MutableRefObject<HTMLDivElement | null>;
  copyRef: MutableRefObject<ArrowCopy>;
  metres: string;
}) {
  const { tl } = useI18n();
  const boundary = tl({ ru: "Граница трассы близко", en: "Course boundary ahead", pl: "Granica trasy blisko", es: "Límite del recorrido cerca", fr: "Limite du parcours proche", de: "Kursgrenze voraus", it: "Limite del percorso vicino" });
  const behind = tl(MARK_BEHIND);
  useEffect(() => { copyRef.current = { metres, behind }; }, [copyRef, metres, behind]);
  const size = EDGE_ARROW_RADIUS * 2;
  return <>
    <div ref={arrowRef} aria-hidden="true" data-testid="race-mark-arrow" className="pointer-events-none absolute left-0 top-0"
      style={{ display: "none", zIndex: 1, width: EDGE_ARROW_RADIUS * 2, height: EDGE_ARROW_RADIUS * 2 }}>
      <div style={{ display: "flex", width: size, height: size, alignItems: "center", justifyContent: "center",
        borderRadius: "50%", background: "rgba(10, 22, 40, 0.86)", border: `2px solid ${GUIDANCE_COLOR}` }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GUIDANCE_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
        {/* Astern: go up, round and back down, mirrored for a turn to port. */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GUIDANCE_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "none" }} data-glyph="astern">
          <path d="M6 20V10a5 5 0 0 1 10 0v7M12 13l4 4 4-4" />
        </svg>
      </div>
      <span data-testid="race-mark-arrow-distance" className="absolute whitespace-nowrap"
        style={{ top: size + 4, left: "50%", transform: "translateX(-50%)", padding: "2px 8px", borderRadius: 6,
          background: "rgba(10, 22, 40, 0.86)", color: "#ffffff", fontSize: 14, lineHeight: "20px", fontWeight: 700 }} />
    </div>
    <div ref={hintRef} role="status" data-testid="race-boundary-hint" className="pointer-events-none absolute"
      style={{ display: "none", zIndex: 1, left: "50%", top: "62%", transform: "translateX(-50%)", maxWidth: "min(280px, calc(100% - 120px))",
        padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-subtle)", borderLeft: "4px solid var(--danger, #ff4444)",
        background: "var(--bg-card, #102838)", color: "var(--text-primary, #e8f4f8)", fontSize: 16, lineHeight: "24px", fontWeight: 600, textAlign: "center" }}>
      {boundary}
    </div>
  </>;
}
