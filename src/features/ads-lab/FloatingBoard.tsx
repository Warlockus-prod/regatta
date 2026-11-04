'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Matrix3, Mesh, Object3D, Raycaster, SRGBColorSpace, Texture, Vector3, Vector4, type Group, type Intersection, type Material } from "three";
import { BOARD_RUN_START, BOARD_SAMPLE_MS, boardSample, boardSize, observeBoard, type BoardRun, type BoardSample, type Vec3, type Vec4 } from "./board-viewability";

export interface BoardCreative { readonly id: string; readonly src: string; readonly width: number; readonly height: number }
export interface BoardReading extends BoardSample {
  readonly streak: number;
  readonly counted: boolean;
  /** Metres from the camera to the board's centre. */
  readonly distance: number;
  /** The board's bounding box on the canvas, CSS pixels. */
  readonly pixels: readonly [number, number];
}

/** Abeam and a little ahead of the yacht, inside the narrow portrait frame of the race camera. */
const BOARD_POSITION = new Vector3(15, 0, -14);
/** Turned towards the approaching leg: the race camera stands about 69 m astern of the yacht. */
const BOARD_YAW = Math.atan2(-84, 14);
const PONTOON_HEIGHT = .9;
const POST_HEIGHT = 1.2;
const OCCLUSION_COLUMNS = 5;
const OCCLUSION_ROWS = 3;

const isOccluder = (mesh: Mesh) => {
  const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as Material & { isMeshBasicNodeMaterial?: boolean };
  return !material.transparent && !material.isMeshBasicNodeMaterial; // Water, sky, wake and shadows never hide a board.
};
function shown(object: Object3D | null): boolean {
  for (let node = object; node; node = node.parent) if (!node.visible) return false;
  return true;
}

/**
 * One floating board with a real image. It counts as seen only by measurement;
 * `onCounted` fires once per creative, on the sample that completes the run.
 */
export function FloatingBoard({ creative, area, onReading, onImageReady, onCounted }: {
  creative: BoardCreative | null;
  area: number;
  onReading: (reading: BoardReading) => void;
  onImageReady: (id: string) => void;
  onCounted: (id: string) => void;
}) {
  const { camera, scene, size, gl } = useThree();
  const [texture, setTexture] = useState<{ id: string; map: Texture } | null>(null);
  const group = useRef<Group>(null);
  const face = useRef<Mesh>(null);
  const run = useRef<BoardRun>(BOARD_RUN_START);
  const lastSample = useRef(0);
  const rays = useRef({ blocked: new Array<boolean>(OCCLUSION_COLUMNS * OCCLUSION_ROWS).fill(false), cursor: 0, occluders: [] as Mesh[], listedAt: -Infinity });
  const still = useMemo(() => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches), []);
  const tools = useRef({ raycaster: new Raycaster(), origin: new Vector3(), target: new Vector3(), normal: new Vector3(), right: new Vector3(), center: new Vector3(), corner: new Vector4(), matrix: new Matrix3(), direction: new Vector3(), hits: [] as Intersection[] });

  useEffect(() => {
    run.current = BOARD_RUN_START;
    if (!creative) return;
    let live = true;
    const image = new Image();
    image.onload = () => {
      if (!live) return;
      const map = new Texture(image);
      map.colorSpace = SRGBColorSpace;
      // The sailing renderer is three's WebGPURenderer (with its WebGL2 backend): no `capabilities` there.
      map.anisotropy = Math.min(8, (gl as unknown as { getMaxAnisotropy?: () => number }).getMaxAnisotropy?.() ?? 1);
      map.needsUpdate = true;
      setTexture({ id: creative.id, map });
      onImageReady(creative.id);
    };
    image.onerror = () => { if (live) setTexture(null); };
    image.src = creative.src;
    return () => { live = false; image.onload = null; image.onerror = null; };
  }, [creative, gl, onImageReady]);
  useEffect(() => () => texture?.map.dispose(), [texture]);

  const aspect = creative ? creative.width / creative.height : 2;
  const { width, height } = boardSize(aspect, area);
  const faceY = PONTOON_HEIGHT + POST_HEIGHT + height / 2;

  useFrame(({ clock }) => {
    const root = group.current, plane = face.current;
    if (!root || !plane) return;
    if (!still) {
      const t = clock.elapsedTime;
      root.position.y = Math.sin(t * .7) * .12;
      root.rotation.x = Math.sin(t * .53) * .012;
    }
    const now = performance.now();
    if (now - lastSample.current < BOARD_SAMPLE_MS) return;
    lastSample.current = now;

    const { raycaster, origin, target, normal, right, center, corner, matrix, direction, hits } = tools.current;
    plane.updateWorldMatrix(true, false);
    const corners: Vec4[] = [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]].map(([x, y]) => {
      corner.set(x * width, y * height, 0, 1).applyMatrix4(plane.matrixWorld).applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
      return [corner.x, corner.y, corner.z, corner.w] as const;
    });
    let left = Infinity, rightEdge = -Infinity, bottom = Infinity, top = -Infinity;
    for (const c of corners) if (c[3] > 0) {
      left = Math.min(left, c[0] / c[3]); rightEdge = Math.max(rightEdge, c[0] / c[3]);
      bottom = Math.min(bottom, c[1] / c[3]); top = Math.max(top, c[1] / c[3]);
    }
    const pixels: readonly [number, number] = rightEdge > left
      ? [(Math.min(1, rightEdge) - Math.max(-1, left)) / 2 * size.width, (Math.min(1, top) - Math.max(-1, bottom)) / 2 * size.height]
      : [0, 0];

    // One row of rays per sample keeps this cheap: the whole face is refreshed every 600 ms.
    const state = rays.current;
    if (now - state.listedAt > 2000) {
      state.listedAt = now; state.occluders = [];
      scene.traverse(node => {
        const mesh = node as Mesh;
        if (!mesh.isMesh || !isOccluder(mesh)) return;
        for (let owner: Object3D | null = mesh; owner; owner = owner.parent) if (owner === root) return;
        state.occluders.push(mesh);
      });
    }
    origin.setFromMatrixPosition(camera.matrixWorld);
    const row = Math.floor(state.cursor / OCCLUSION_COLUMNS);
    for (let column = 0; column < OCCLUSION_COLUMNS; column++) {
      const index = row * OCCLUSION_COLUMNS + column;
      target.set(((column + .5) / OCCLUSION_COLUMNS - .5) * width, ((row + .5) / OCCLUSION_ROWS - .5) * height, 0).applyMatrix4(plane.matrixWorld);
      const distance = target.distanceTo(origin);
      raycaster.set(origin, direction.subVectors(target, origin).normalize());
      raycaster.near = .01; raycaster.far = Math.max(.02, distance - .2);
      hits.length = 0;
      raycaster.intersectObjects(state.occluders, false, hits);
      state.blocked[index] = hits.some(hit => shown(hit.object));
    }
    state.cursor = (state.cursor + OCCLUSION_COLUMNS) % state.blocked.length;
    const occluded = state.blocked.filter(Boolean).length / state.blocked.length;

    matrix.setFromMatrix4(camera.matrixWorldInverse.clone().multiply(plane.matrixWorld));
    normal.set(0, 0, 1).applyMatrix3(matrix).normalize();
    right.set(1, 0, 0).applyMatrix3(matrix).normalize();
    center.setFromMatrixPosition(plane.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
    const screen = typeof window !== "undefined" ? window.screen : null;
    const screenArea = screen && screen.width > 0 && screen.height > 0 ? screen.width * screen.height : size.width * size.height;
    const sample = boardSample({
      corners, center: center.toArray() as unknown as Vec3, normal: normal.toArray() as unknown as Vec3, right: right.toArray() as unknown as Vec3,
      canvasShare: (size.width * size.height) / Math.max(1, screenArea), occluded,
      imageReady: Boolean(creative && texture?.id === creative.id),
      pageVisible: typeof document === "undefined" || document.visibilityState === "visible",
    });
    const before = run.current.counted;
    run.current = observeBoard(run.current, sample.viewable, now);
    if (run.current.counted && !before && creative) onCounted(creative.id);
    onReading({ ...sample, streak: run.current.streak, counted: run.current.counted, distance: center.length(), pixels });
  });

  return <group ref={group} position={[BOARD_POSITION.x, 0, BOARD_POSITION.z]} rotation={[0, BOARD_YAW, 0]}>
    <mesh position={[0, PONTOON_HEIGHT / 2 - .2, 0]}><boxGeometry args={[width + 2, PONTOON_HEIGHT + .4, 4]} /><meshStandardMaterial color="#2c3f4a" roughness={.8} /></mesh>
    {[-.4, .4].map(x => <mesh key={x} position={[x * width, PONTOON_HEIGHT + POST_HEIGHT / 2, -.12]}><cylinderGeometry args={[.16, .16, POST_HEIGHT + .4, 8]} /><meshStandardMaterial color="#63757e" /></mesh>)}
    <mesh ref={face} position={[0, faceY, 0]}>
      <planeGeometry args={[width, height]} />
      {texture && creative && texture.id === creative.id
        ? <meshBasicMaterial key={texture.id} map={texture.map} toneMapped={false} />
        : <meshStandardMaterial color="#8d9ba3" />}
    </mesh>
    <mesh position={[0, faceY, -.06]} rotation={[0, Math.PI, 0]}><planeGeometry args={[width + .3, height + .3]} /><meshStandardMaterial color="#455967" /></mesh>
  </group>;
}
