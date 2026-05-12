import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Circle,
  Group,
  Path,
  Skia,
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
}

const HULL_WHITE = '#f7f9fb';
const SAIL_WHITE = 'rgba(255, 255, 255, 0.92)';
const SAIL_OUTLINE = 'rgba(0, 212, 255, 0.42)';
const SPINNAKER = 'rgba(0, 212, 255, 0.55)';
const SPINNAKER_OUTLINE = 'rgba(0, 229, 255, 0.78)';
const HULL_OUTLINE = 'rgba(0, 212, 255, 0.30)';
const SHADOW = 'rgba(0, 0, 0, 0.32)';
const DECK = 'rgba(10, 22, 40, 0.78)';
const CABIN = 'rgba(0, 212, 255, 0.20)';

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

/** Spinnaker as a symmetric balloon forward of the bow. */
function buildSpinnakerPath({ L }: BuildArgs, curveRatio: number): SkPath {
  const p = Skia.Path.Make();
  const head = -1.18 * L;
  const foot = -0.34 * L;
  const half = (0.62 + curveRatio * 0.18) * L;
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
    luffMain = false,
    luffJib = false,
    length = 36,
    heelOffsetPx = 0,
    tickN,
  } = props;

  const L = hullScale(length);

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
  const headMainY = HULL_LAYOUT.bowY * L * 0.62;
  const boomLen = (0.82 + (1 - mainSheet) * 0.18) * L;
  const mainClewX = Math.sin(mainBoomRad) * boomLen;
  const mainClewY = mastY + Math.cos(mainBoomRad) * boomLen;

  const mainSailPath = useMemo(
    () =>
      buildSailPath({
        headX: 0,
        headY: headMainY,
        tackX: 0,
        tackY: mastY,
        clewX: mainClewX,
        clewY: mainClewY,
        curveRatio: mainCurve,
        flutter: mainLuffing ? flutterClock : 0,
      }),
    [headMainY, mastY, mainClewX, mainClewY, mainCurve, mainLuffing, flutterClock],
  );

  const forestayY = HULL_LAYOUT.forestayY * L;
  const jibTackY = HULL_LAYOUT.bowY * L * 0.7;
  const jibClewLen = (0.62 + (1 - jibSheet) * 0.18) * L;
  const jibClewX = Math.sin(jibBoomRad) * jibClewLen;
  const jibClewY = mastY - L * 0.05 + Math.cos(jibBoomRad) * jibClewLen * 0.95;

  const jibSailPath = useMemo(
    () =>
      buildSailPath({
        headX: 0,
        headY: forestayY,
        tackX: 0,
        tackY: jibTackY,
        clewX: jibClewX,
        clewY: jibClewY,
        curveRatio: jibCurve,
        flutter: jibLuffing ? flutterClock + 1.4 : 0,
      }),
    [forestayY, jibTackY, jibClewX, jibClewY, jibCurve, jibLuffing, flutterClock],
  );

  const spinnakerPath = useMemo(
    () => buildSpinnakerPath({ L }, spiCurve),
    [L, spiCurve],
  );

  const showJib = sailSet === 'mainJib';
  const showSpi = sailSet === 'spinnaker';
  const showMain = sailSet !== 'spinnaker';

  // Boom line (drawn as a stroke for definition).
  const boomLinePath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(0, mastY);
    p.lineTo(mainClewX, mainClewY);
    return p;
  }, [mastY, mainClewX, mainClewY]);

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
        </>
      ) : null}

      {showJib ? (
        <>
          <Path
            path={jibSailPath}
            color={SAIL_WHITE}
            opacity={jibLuffing ? 0.65 : 0.92}
          />
          <Path
            path={jibSailPath}
            color={SAIL_OUTLINE}
            style="stroke"
            strokeWidth={1}
            opacity={0.7}
          />
        </>
      ) : null}

      {showMain ? (
        <>
          <Path
            path={mainSailPath}
            color={SAIL_WHITE}
            opacity={mainLuffing ? 0.62 : 0.92}
          />
          <Path
            path={mainSailPath}
            color={SAIL_OUTLINE}
            style="stroke"
            strokeWidth={1}
            opacity={0.7}
          />
          <Path
            path={boomLinePath}
            color="rgba(232, 244, 248, 0.85)"
            style="stroke"
            strokeWidth={Math.max(1.2, L * 0.05)}
            strokeCap="round"
          />
        </>
      ) : null}

      <Path path={hullPath} color={HULL_WHITE} />
      <Path
        path={hullPath}
        color={HULL_OUTLINE}
        style="stroke"
        strokeWidth={Math.max(1, L * 0.04)}
      />
      <Path path={deckPath} color={DECK} />
      <Path path={cabinPath} color={CABIN} />
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
