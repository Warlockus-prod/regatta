'use client';

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { useI18n } from "@/lib/i18n";
import { GUIDANCE_COLOR, playerOf, type OriginRef } from "@/features/race-3d/Race3DView";
import { METRES_PER_UNIT, nextTargetInto, toWorld, type Race3DBoat, type Race3DCourse } from "@/features/race-3d/pose";
import { boundaryProximity, noGoEdges, noGoRing, tacticalSizes, zoneMark, type BoundaryProximity, type RaceTacticsModel } from "./tactics";
import { applyEdgeArrow, EDGE_ARROW_RADIUS, edgeArrow, edgeArrowInsets, type EdgeArrow, type EdgeArrowStyle, type ScreenInsets } from "./edge-arrow";

// ============================================================================
// Tactics on the water (M2-2, M2-3), drawn inside the race scene: the no-go
// wedge at the bow, the zone ring round the next rounding mark, the course
// boundary where the race clamps the boat, and the screen-edge arrow to the
// next mark with the early boundary hint as two DOM elements over the canvas.
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
function ScreenCues({ boatsRef, courseRef, originRef, model, arrowRef, hintRef, emphasisRef }: Omit<TacticalRefs, "windDirRef"> & {
  model: RaceTacticsModel;
  arrowRef: MutableRefObject<HTMLDivElement | null>;
  hintRef: MutableRefObject<HTMLDivElement | null>;
  emphasisRef: MutableRefObject<boolean>;
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
    if (arrowEl) applyEdgeArrow(arrowEl, arrowEl.firstElementChild as SVGElement | null, s.arrow, s.style);
    const hint = player ? boundaryProximity(player.pos, player.heading, player.speed, model, s.proximity).hint : false;
    emphasisRef.current = hint;
    const hintEl = hintRef.current;
    if (hintEl && hint !== s.hint) { hintEl.style.display = hint ? "block" : "none"; s.hint = hint; }
  });
  return null;
}

/** Inside the Canvas: the wedge, the zone ring, the boundary and the screen cues' driver. */
export function TacticalOverlay({ boatsRef, courseRef, windDirRef, originRef, model, arrowRef, hintRef }: TacticalRefs & {
  model: RaceTacticsModel;
  arrowRef: MutableRefObject<HTMLDivElement | null>;
  hintRef: MutableRefObject<HTMLDivElement | null>;
}) {
  const emphasisRef = useRef(false);
  return <>
    <NoGoWedge boatsRef={boatsRef} windDirRef={windDirRef} originRef={originRef} model={model} />
    <MarkZone boatsRef={boatsRef} courseRef={courseRef} originRef={originRef} model={model} />
    <CourseBoundary originRef={originRef} model={model} emphasisRef={emphasisRef} />
    <ScreenCues boatsRef={boatsRef} courseRef={courseRef} originRef={originRef} model={model} arrowRef={arrowRef} hintRef={hintRef} emphasisRef={emphasisRef} />
  </>;
}

/** Over the Canvas: the 44 px arrow to the next mark and the boundary hint, both hidden until needed. */
export function TacticalScreenLayer({ arrowRef, hintRef }: {
  arrowRef: MutableRefObject<HTMLDivElement | null>;
  hintRef: MutableRefObject<HTMLDivElement | null>;
}) {
  const { tl } = useI18n();
  const boundary = tl({ ru: "Граница трассы близко", en: "Course boundary ahead", pl: "Granica trasy blisko", es: "Límite del recorrido cerca", fr: "Limite du parcours proche", de: "Kursgrenze voraus", it: "Limite del percorso vicino" });
  return <>
    <div ref={arrowRef} aria-hidden="true" data-testid="race-mark-arrow" className="pointer-events-none absolute left-0 top-0"
      style={{ display: "none", zIndex: 1, width: EDGE_ARROW_RADIUS * 2, height: EDGE_ARROW_RADIUS * 2, alignItems: "center", justifyContent: "center",
        borderRadius: "50%", background: "rgba(10, 22, 40, 0.86)", border: `2px solid ${GUIDANCE_COLOR}` }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GUIDANCE_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </div>
    <div ref={hintRef} role="status" data-testid="race-boundary-hint" className="pointer-events-none absolute"
      style={{ display: "none", zIndex: 1, left: "50%", top: "62%", transform: "translateX(-50%)", maxWidth: "min(280px, calc(100% - 120px))",
        padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-subtle)", borderLeft: "4px solid var(--danger, #ff4444)",
        background: "var(--bg-card, #102838)", color: "var(--text-primary, #e8f4f8)", fontSize: 16, lineHeight: "24px", fontWeight: 600, textAlign: "center" }}>
      {boundary}
    </div>
  </>;
}
