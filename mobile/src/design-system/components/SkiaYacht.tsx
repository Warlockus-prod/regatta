import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Circle,
  Group,
  Image as SkiaImage,
  Path,
  Skia,
  useImage,
  type SkPath,
} from '@shopify/react-native-skia';
import {
  HULL_LAYOUT,
  boomAngleRad,
  hullScale,
  isLuffing,
  sailCurveRatio,
  SAIL_TUNING,
} from '../../simulator/sail-geometry';
import type { SailSet } from '../../simulator/types';
import { colors } from '../tokens';

const YACHT_PHOTO_SOURCE = require('../../../assets/anatomy/yacht-top.png');

export type SkiaYachtMode = 'vector' | 'photo';

export interface SkiaYachtProps {
  centerX: number;
  centerY: number;
  /** Heading in radians, screen-space (0 = north, +CW). */
  headingRad: number;
  /** Apparent wind angle from bow, signed degrees. */
  awaDeg: number;
  /** Mainsheet position 0..1 (0 = eased, 1 = hard). */
  mainSheet: number;
  /** Jibsheet position 0..1. */
  jibSheet: number;
  /** Which set of sails to draw. */
  sailSet: SailSet;
  /** Shared twist control 0..1. Higher values open the leech visually. */
  twist?: number;
  /** Reef control 0..1. Higher values shorten the main visually. */
  reef?: number;
  /** Override for the main sail luff visualization. The component still
   *  forces luff on if AWA is in the no-go zone. */
  luffMain?: boolean;
  luffJib?: boolean;
  /** Half-length of the hull in canvas pixels. Default 36. */
  length?: number;
  /** Extra heel-side shadow offset in px (positive = shadow leeward). */
  heelOffsetPx?: number;
  /** Tick counter from the sim loop, used to drive the luff flutter. */
  tickN?: number;
  /**
   * Render style for the hull/deck.
   * - 'vector' (default): the original layered Skia paths.
   * - 'photo': a top-down yacht photograph rotated as a Skia Image, with the
   *   vector sails (main / jib / spinnaker) overlaid so trim still reads.
   *   Falls back to 'vector' silently if the image asset cannot be loaded.
   */
  mode?: SkiaYachtMode;
  /**
   * Pixel size of the hull image in photo mode. Defaults to `length * 2.6`,
   * which makes a 36 px half-length hull render at ~94 px - close to the
   * vector silhouette but heavy enough to read as a real boat.
   */
  photoSizePx?: number;
}

const HULL_WHITE = '#f7f9fb';
const MAIN_SAIL = 'rgba(255, 250, 238, 0.96)';
const JIB_SAIL = 'rgba(234, 243, 251, 0.94)';
const SAIL_OUTLINE = 'rgba(232, 244, 248, 0.86)';
const SAIL_DETAIL = 'rgba(10, 22, 40, 0.34)';
const SPINNAKER = 'rgba(0, 212, 255, 0.62)';
const SPINNAKER_OUTLINE = 'rgba(0, 229, 255, 0.78)';
const HULL_OUTLINE = 'rgba(0, 212, 255, 0.30)';
const SHADOW = 'rgba(0, 0, 0, 0.32)';
const DECK = 'rgba(10, 22, 40, 0.78)';
const CABIN = 'rgba(0, 212, 255, 0.20)';
const RIG = 'rgba(232, 244, 248, 0.72)';

interface BuildArgs {
  L: number;
}

function buildHullPath({ L }: BuildArgs): SkPath {
  const p = Skia.Path.Make();
  const beam = HULL_LAYOUT.beam * L * 1.05;
  const bow = HULL_LAYOUT.bowY * L;
  const stern = HULL_LAYOUT.sternY * L;
  // Smooth hull silhouette using cubic curves: bow -> starboard -> stern -> port.
  p.moveTo(0, bow);
  p.cubicTo(beam * 0.65, bow + L * 0.18, beam, L * 0.18, beam * 0.85, stern * 0.78);
  p.cubicTo(beam * 0.55, stern, -beam * 0.55, stern, -beam * 0.85, stern * 0.78);
  p.cubicTo(-beam, L * 0.18, -beam * 0.65, bow + L * 0.18, 0, bow);
  p.close();
  return p;
}

function buildDeckPath({ L }: BuildArgs): SkPath {
  const p = Skia.Path.Make();
  const beam = HULL_LAYOUT.beam * L * 0.78;
  const bow = HULL_LAYOUT.bowY * L * 0.86;
  const stern = HULL_LAYOUT.sternY * L * 0.84;
  p.moveTo(0, bow);
  p.cubicTo(beam * 0.65, bow + L * 0.16, beam, L * 0.18, beam * 0.7, stern * 0.78);
  p.cubicTo(beam * 0.4, stern, -beam * 0.4, stern, -beam * 0.7, stern * 0.78);
  p.cubicTo(-beam, L * 0.18, -beam * 0.65, bow + L * 0.16, 0, bow);
  p.close();
  return p;
}

function buildCabinPath({ L }: BuildArgs): SkPath {
  const p = Skia.Path.Make();
  const beam = HULL_LAYOUT.cabinBeam * L;
  const fwd = HULL_LAYOUT.cabinFwdY * L;
  const aft = HULL_LAYOUT.cabinAftY * L;
  p.moveTo(0, fwd);
  p.cubicTo(beam * 1.1, fwd + L * 0.1, beam * 1.1, aft - L * 0.16, beam * 0.6, aft);
  p.cubicTo(beam * 0.3, aft + L * 0.04, -beam * 0.3, aft + L * 0.04, -beam * 0.6, aft);
  p.cubicTo(-beam * 1.1, aft - L * 0.16, -beam * 1.1, fwd + L * 0.1, 0, fwd);
  p.close();
  return p;
}

function buildDeckDetailPath({ L }: BuildArgs): SkPath {
  const p = Skia.Path.Make();
  const bow = HULL_LAYOUT.bowY * L * 0.72;
  const stern = HULL_LAYOUT.sternY * L * 0.68;
  [-0.12, -0.06, 0.06, 0.12].forEach((xNorm) => {
    const x = xNorm * L;
    p.moveTo(x * 0.35, bow);
    p.cubicTo(x * 0.75, -L * 0.2, x * 0.95, L * 0.28, x * 0.72, stern);
  });
  return p;
}

function buildLinePath(points: Array<[number, number]>): SkPath {
  const p = Skia.Path.Make();
  if (points.length === 0) return p;
  const [firstX, firstY] = points[0]!;
  p.moveTo(firstX, firstY);
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i]!;
    p.lineTo(x, y);
  }
  return p;
}

/**
 * Build a curved sail panel as a quadratic bezier wedge.
 * Inputs are in the local (boat-up) frame. The leading edge runs from
 * `headX, headY` to `tackX, tackY` (mast/forestay), the foot runs from
 * `tackX, tackY` to the clew (`clewX, clewY`), and the leech curves from
 * the clew back up to the head with the bulge controlled by `curveRatio`.
 *
 * `flutter` adds wavy distortion on the luffing edge; `0` = clean line.
 */
function buildSailPath(args: {
  headX: number;
  headY: number;
  tackX: number;
  tackY: number;
  clewX: number;
  clewY: number;
  curveRatio: number;
  flutter: number;
}): SkPath {
  const p = Skia.Path.Make();
  const { headX, headY, tackX, tackY, clewX, clewY, curveRatio, flutter } = args;

  // Direction perpendicular to the leech (head -> clew), pointing AWAY
  // from the mast - this is the "bulge" axis.
  const lx = clewX - headX;
  const ly = clewY - headY;
  const lLen = Math.max(0.0001, Math.sqrt(lx * lx + ly * ly));
  const nx = -ly / lLen;
  const ny = lx / lLen;
  // Decide which side of the leech the mast lives on. The bulge should
  // push outward (away from the mast / tack).
  const tx = tackX - (headX + clewX) / 2;
  const ty = tackY - (headY + clewY) / 2;
  const dot = tx * nx + ty * ny;
  const sign = dot > 0 ? -1 : 1;
  const bulge = sign * lLen * 0.42 * curveRatio;
  const ctrlX = (headX + clewX) / 2 + nx * bulge;
  const ctrlY = (headY + clewY) / 2 + ny * bulge;

  if (flutter > 0) {
    // Luffing: draw the leading edge as a small wave between head and tack.
    const segs = 5;
    p.moveTo(headX, headY);
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const baseX = headX + (tackX - headX) * t;
      const baseY = headY + (tackY - headY) * t;
      // Perpendicular to the luff line.
      const ldx = tackX - headX;
      const ldy = tackY - headY;
      const lenLuff = Math.max(0.0001, Math.sqrt(ldx * ldx + ldy * ldy));
      const px = -ldy / lenLuff;
      const py = ldx / lenLuff;
      const wave = Math.sin(t * Math.PI * 2 + flutter) * lenLuff * 0.08;
      p.lineTo(baseX + px * wave, baseY + py * wave);
    }
  } else {
    p.moveTo(headX, headY);
    p.lineTo(tackX, tackY);
  }
  p.lineTo(clewX, clewY);
  p.quadTo(ctrlX, ctrlY, headX, headY);
  p.close();
  return p;
}

function buildSailBattenPath(args: {
  headX: number;
  headY: number;
  tackX: number;
  tackY: number;
  clewX: number;
  clewY: number;
  ratios: number[];
  reach: number;
}): SkPath {
  const p = Skia.Path.Make();
  const { headX, headY, tackX, tackY, clewX, clewY, ratios, reach } = args;
  for (const t of ratios) {
    const sx = headX + (tackX - headX) * t;
    const sy = headY + (tackY - headY) * t;
    const ex = sx + (clewX - sx) * reach;
    const ey = sy + (clewY - sy) * reach;
    p.moveTo(sx, sy);
    p.lineTo(ex, ey);
  }
  return p;
}

/** Spinnaker as a symmetric balloon forward of the bow. */
function buildSpinnakerPath({ L }: BuildArgs, curveRatio: number): SkPath {
  const p = Skia.Path.Make();
  const head = -1.3 * L;
  const foot = -0.22 * L;
  const half = (0.78 + curveRatio * 0.22) * L;
  p.moveTo(0, head);
  p.cubicTo(half, head + L * 0.18, half, foot - L * 0.06, half * 0.45, foot);
  p.cubicTo(half * 0.18, foot + L * 0.04, -half * 0.18, foot + L * 0.04, -half * 0.45, foot);
  p.cubicTo(-half, foot - L * 0.06, -half, head + L * 0.18, 0, head);
  p.close();
  return p;
}

/**
 * <SkiaYacht>: a layered top-down yacht primitive. Drop into any Skia
 * Canvas. Rotates as a unit around `centerX, centerY` via a single
 * Group transform; sails rotate INSIDE the group based on `awaDeg`.
 */
export function SkiaYacht(props: SkiaYachtProps): React.JSX.Element {
  const {
    centerX,
    centerY,
    headingRad,
    awaDeg,
    mainSheet,
    jibSheet,
    sailSet,
    twist: twistRaw = 0.15,
    reef: reefRaw = 0,
    luffMain = false,
    luffJib = false,
    length = 36,
    heelOffsetPx = 0,
    tickN,
    mode = 'vector',
    photoSizePx,
  } = props;

  const yachtPhoto = useImage(YACHT_PHOTO_SOURCE);
  const photoMode = mode === 'photo' && yachtPhoto != null;
  const photoSize = photoSizePx ?? Math.max(48, length * 2.6);
  const photoHalf = photoSize / 2;

  const L = hullScale(length);
  const twist = Math.max(0, Math.min(1, twistRaw));
  const reef = Math.max(0, Math.min(1, reefRaw));

  // Drive luff flutter from the tick counter or a local raf if not provided.
  const rafTickRef = useRef(0);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (tickN != null) return;
    let raf: ReturnType<typeof requestAnimationFrame> | null = null;
    let alive = true;
    const loop = () => {
      if (!alive) return;
      rafTickRef.current += 1;
      setTick(rafTickRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [tickN]);
  const flutterClock = (tickN != null ? tickN : rafTickRef.current) * 0.22;

  const hullPath = useMemo(() => buildHullPath({ L }), [L]);
  const deckPath = useMemo(() => buildDeckPath({ L }), [L]);
  const deckDetailPath = useMemo(() => buildDeckDetailPath({ L }), [L]);
  const cabinPath = useMemo(() => buildCabinPath({ L }), [L]);

  const noGo = Math.abs(awaDeg) < SAIL_TUNING.NO_GO_AWA_DEG;
  const mainLuffing = luffMain || isLuffing(awaDeg, mainSheet);
  const jibLuffing = luffJib || isLuffing(awaDeg, jibSheet);

  const mainBoomRad = boomAngleRad(awaDeg, mainSheet);
  const jibBoomRad = boomAngleRad(awaDeg, jibSheet);
  const mainCurve = sailCurveRatio(awaDeg, mainSheet);
  const jibCurve = sailCurveRatio(awaDeg, jibSheet);
  const spiCurve = Math.max(0.6, sailCurveRatio(awaDeg, 0.4));

  const mastY = HULL_LAYOUT.mastY * L;
  const mainHeadBaseY = HULL_LAYOUT.bowY * L * 1.08;
  const headMainY = mastY + (mainHeadBaseY - mastY) * (1 - reef * 0.36);
  const mainHeadX = Math.sin(mainBoomRad) * L * 0.1 * twist;
  const boomLen = (1.08 + (1 - mainSheet) * 0.32) * L * (1 - reef * 0.12);
  const mainClewX = Math.sin(mainBoomRad) * boomLen;
  const mainClewY = mastY + Math.cos(mainBoomRad) * boomLen;

  const mainSailPath = useMemo(
    () =>
      buildSailPath({
        headX: mainHeadX,
        headY: headMainY,
        tackX: 0,
        tackY: mastY,
        clewX: mainClewX,
        clewY: mainClewY,
        curveRatio: mainCurve * (1 - reef * 0.12),
        flutter: mainLuffing ? flutterClock : 0,
      }),
    [mainHeadX, headMainY, mastY, mainClewX, mainClewY, mainCurve, reef, mainLuffing, flutterClock],
  );

  const forestayY = HULL_LAYOUT.bowY * L * 1.02;
  const jibTackY = HULL_LAYOUT.bowY * L * 0.92;
  const jibHeadX = Math.sin(jibBoomRad) * L * 0.05 * twist;
  const jibClewLen = (0.92 + (1 - jibSheet) * 0.28) * L;
  const jibClewX = Math.sin(jibBoomRad) * jibClewLen;
  const jibClewY = mastY + Math.cos(jibBoomRad) * jibClewLen * 0.82;

  const jibSailPath = useMemo(
    () =>
      buildSailPath({
        headX: jibHeadX,
        headY: forestayY,
        tackX: 0,
        tackY: jibTackY,
        clewX: jibClewX,
        clewY: jibClewY,
        curveRatio: jibCurve,
        flutter: jibLuffing ? flutterClock + 1.4 : 0,
      }),
    [jibHeadX, forestayY, jibTackY, jibClewX, jibClewY, jibCurve, jibLuffing, flutterClock],
  );

  const mainBattenPath = useMemo(
    () =>
      buildSailBattenPath({
        headX: mainHeadX,
        headY: headMainY,
        tackX: 0,
        tackY: mastY,
        clewX: mainClewX,
        clewY: mainClewY,
        ratios: [0.3, 0.52, 0.74],
        reach: 0.44 + twist * 0.12,
      }),
    [mainHeadX, headMainY, mastY, mainClewX, mainClewY, twist],
  );

  const jibBattenPath = useMemo(
    () =>
      buildSailBattenPath({
        headX: jibHeadX,
        headY: forestayY,
        tackX: 0,
        tackY: jibTackY,
        clewX: jibClewX,
        clewY: jibClewY,
        ratios: [0.42, 0.68],
        reach: 0.5,
      }),
    [jibHeadX, forestayY, jibTackY, jibClewX, jibClewY],
  );

  const spinnakerPath = useMemo(
    () => buildSpinnakerPath({ L }, spiCurve),
    [L, spiCurve],
  );

  const showJib = sailSet === 'mainJib';
  const showSpi = sailSet === 'spinnaker';
  const showMain = true;

  // Boom line (drawn as a stroke for definition).
  const boomLinePath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(0, mastY);
    p.lineTo(mainClewX, mainClewY);
    return p;
  }, [mastY, mainClewX, mainClewY]);

  const mastStayPath = useMemo(
    () =>
      buildLinePath([
        [0, forestayY],
        [0, mastY],
        [0, HULL_LAYOUT.sternY * L * 0.72],
      ]),
    [forestayY, mastY, L],
  );

  const spinnakerSeamPath = useMemo(
    () =>
      buildLinePath([
        [0, -1.24 * L],
        [0, -0.26 * L],
      ]),
    [L],
  );

  return (
    <Group
      transform={[
        { translateX: centerX },
        { translateY: centerY },
        { rotate: headingRad },
      ]}
    >
      <Circle cx={heelOffsetPx} cy={L * 0.18} r={L * 1.06} color={SHADOW} opacity={0.42} />

      {showSpi ? (
        <>
          <Path path={spinnakerPath} color={SPINNAKER} />
          <Path
            path={spinnakerPath}
            color={SPINNAKER_OUTLINE}
            style="stroke"
            strokeWidth={1.2}
            opacity={0.85}
          />
          <Path
            path={spinnakerSeamPath}
            color="rgba(232, 244, 248, 0.48)"
            style="stroke"
            strokeWidth={Math.max(0.8, L * 0.018)}
            strokeCap="round"
          />
        </>
      ) : null}

      {showJib ? (
        <>
          <Path
            path={jibSailPath}
            color={JIB_SAIL}
            opacity={jibLuffing ? 0.68 : 0.96}
          />
          <Path
            path={jibSailPath}
            color={SAIL_OUTLINE}
            style="stroke"
            strokeWidth={Math.max(1.1, L * 0.025)}
            opacity={0.95}
          />
          <Path
            path={jibBattenPath}
            color={SAIL_DETAIL}
            style="stroke"
            strokeWidth={Math.max(0.7, L * 0.014)}
            strokeCap="round"
            opacity={0.75}
          />
        </>
      ) : null}

      {showMain ? (
        <>
          <Path
            path={mainSailPath}
            color={MAIN_SAIL}
            opacity={mainLuffing ? 0.68 : 0.98}
          />
          <Path
            path={mainSailPath}
            color={SAIL_OUTLINE}
            style="stroke"
            strokeWidth={Math.max(1.2, L * 0.026)}
            opacity={0.96}
          />
          <Path
            path={mainBattenPath}
            color={SAIL_DETAIL}
            style="stroke"
            strokeWidth={Math.max(0.7, L * 0.014)}
            strokeCap="round"
            opacity={0.75}
          />
          <Path
            path={boomLinePath}
            color={RIG}
            style="stroke"
            strokeWidth={Math.max(1.5, L * 0.045)}
            strokeCap="round"
          />
        </>
      ) : null}

      <Path
        path={mastStayPath}
        color={RIG}
        style="stroke"
        strokeWidth={Math.max(0.9, L * 0.018)}
        strokeCap="round"
        opacity={0.75}
      />
      {photoMode ? (
        <SkiaImage
          image={yachtPhoto}
          x={-photoHalf}
          y={-photoHalf}
          width={photoSize}
          height={photoSize}
          fit="contain"
        />
      ) : (
        <>
          <Path path={hullPath} color={HULL_WHITE} />
          <Path
            path={hullPath}
            color={HULL_OUTLINE}
            style="stroke"
            strokeWidth={Math.max(1, L * 0.04)}
          />
          <Path path={deckPath} color={DECK} />
          <Path
            path={deckDetailPath}
            color="rgba(232, 244, 248, 0.16)"
            style="stroke"
            strokeWidth={Math.max(0.6, L * 0.01)}
            strokeCap="round"
          />
          <Path path={cabinPath} color={CABIN} />
        </>
      )}
      <Circle cx={0} cy={mastY} r={Math.max(2, L * 0.085)} color={colors.accentCyan} />

      {noGo ? (
        <Circle
          cx={0}
          cy={mastY}
          r={Math.max(3, L * 0.13)}
          color={colors.danger}
          opacity={0.55}
          style="stroke"
          strokeWidth={1.4}
        />
      ) : null}
    </Group>
  );
}
