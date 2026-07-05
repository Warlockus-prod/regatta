import { Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Canvas,
  Circle,
  Fill,
  Group,
  Path,
  RadialGradient,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useI18n } from '../../src/i18n/context';
import { pointsOfSail } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { Screen, Slider, SkiaYacht, Text } from '../../src/design-system/components';
import { fetchWeatherNow, type WeatherNow } from '../../src/api/weather';
import { useSimLoop } from '../../src/simulator/use-sim-loop';
import type { TrailPoint } from '../../src/simulator/use-sim-loop';
import {
  buildArrowGrid,
  buildWindArrowsPath,
  buildNoGoPath,
  buildApparentArrowPath,
  buildCompassArrowPath,
  buildForceVectorPath,
  buildSectorRingPath,
} from '../../src/simulator/skia-wind';
import Svg, {
  Circle as SvgCircle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient as SvgLinearGradient,
  Path as SvgPath,
  Polygon,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { DRILLS, MISSIONS, type SimMode } from '../../src/simulator/missions';
import type { SailState } from '../../src/simulator/sail-feedback';
import { leewayAngleDeg } from '../../src/simulator/sail-geometry';
import {
  formatSpeed,
  formatWindSpeed,
  speedUnitLabel,
  windSpeedUnitLabel,
  useUnits,
} from '../../src/persistence/units';
import { colors, radii, shadow, spacing } from '../../src/design-system/tokens';

const COMPASS_R = 48;
const SNAP_DEG = 15;
const SNAP_RAD = (SNAP_DEG * Math.PI) / 180;
const WIND_SPEED_PRESETS = [6, 10, 14, 20] as const;

// The synthetic wind-speed control on this screen cycles the presets
// above, so its effective range is 6..20 kt. Live wind only SETS the
// existing wind speed, so we clamp a fetched value into that same band -
// no physics or default behavior changes, just a starting value the user
// can keep tweaking with the normal controls.
const WIND_SPEED_MIN_KTS = WIND_SPEED_PRESETS[0];
const WIND_SPEED_MAX_KTS = WIND_SPEED_PRESETS[WIND_SPEED_PRESETS.length - 1];

/** Clamp a wind speed (knots) into the simulator's wind-speed range. */
function clampWindSpeedKts(kts: number): number {
  return Math.max(WIND_SPEED_MIN_KTS, Math.min(WIND_SPEED_MAX_KTS, kts));
}

// Preset venues only (no geolocation, no Location permission). Same list
// as the home WindNowCard - well-known sailing spots. The user picks one
// from the chip row; we never read device location.
interface LiveSpot {
  key: string;
  /** Place name - identical in every locale. */
  label: string;
  lat: number;
  lon: number;
}
const LIVE_SPOTS: readonly LiveSpot[] = [
  { key: 'palma', label: 'Palma', lat: 39.57, lon: 2.65 },
  { key: 'tarifa', label: 'Tarifa', lat: 36.01, lon: -5.6 },
  { key: 'cowes', label: 'Cowes', lat: 50.76, lon: -1.3 },
  { key: 'hyeres', label: 'Hyeres', lat: 43.07, lon: 6.15 },
] as const;

const LIVE_FALLBACK_ATTRIBUTION = 'Weather data by Open-Meteo.com (CC BY 4.0).';

/** 8-point cardinal - mirrors WindNowCard's `toCardinal`. */
const LIVE_CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
function liveCardinal(dirDeg: number): string {
  const normalized = ((dirDeg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return LIVE_CARDINALS[index]!;
}

type LiveWindState =
  | { status: 'idle' }
  | { status: 'loading'; spotKey: string }
  | { status: 'ok'; spotKey: string; data: WeatherNow }
  | { status: 'error'; spotKey: string };

type SimView = 'top' | 'side' | 'rear';
type WindMapMode = 'steady' | 'shift' | 'gust';

interface SceneLabels {
  apparentWind: string;
  trueWind: string;
  drive: string;
  sideForce: string;
  heel: string;
  reef: string;
  twist: string;
  gust: string;
  shift: string;
  leeway: string;
}

function snapToStep(rad: number, step: number): number {
  return Math.round(rad / step) * step;
}

function scoreColor(score: number): string {
  if (score >= 78) return colors.success;
  if (score >= 52) return colors.accentCyan;
  return colors.warning;
}

function buildTrailPath(trail: TrailPoint[], width: number, height: number) {
  const p = Skia.Path.Make();
  if (trail.length === 0) return p;
  p.moveTo(trail[0]!.x, trail[0]!.y);
  for (let i = 1; i < trail.length; i++) {
    const prev = trail[i - 1]!;
    const curr = trail[i]!;
    const wrappedX = Math.abs(curr.x - prev.x) > width / 2;
    const wrappedY = Math.abs(curr.y - prev.y) > height / 2;
    if (wrappedX || wrappedY) {
      p.moveTo(curr.x, curr.y);
    } else {
      p.lineTo(curr.x, curr.y);
    }
  }
  return p;
}

function buildWakePath(
  boatX: number,
  boatY: number,
  heading: number,
  boatLength: number,
  speedKn: number,
) {
  const p = Skia.Path.Make();
  if (speedKn < 0.6) return p;
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  const toScreen = (localX: number, localY: number) => ({
    x: boatX + localX * c - localY * s,
    y: boatY + localX * s + localY * c,
  });
  const stern = boatLength * 0.9;
  const len = boatLength * (0.8 + Math.min(1.5, speedKn / 5));
  const spread = boatLength * (0.22 + Math.min(0.22, speedKn / 26));
  const startL = toScreen(-boatLength * 0.18, stern);
  const startR = toScreen(boatLength * 0.18, stern);
  const ctrlL = toScreen(-spread, stern + len * 0.5);
  const ctrlR = toScreen(spread, stern + len * 0.5);
  const endL = toScreen(-spread * 1.35, stern + len);
  const endR = toScreen(spread * 1.35, stern + len);
  p.moveTo(startL.x, startL.y);
  p.quadTo(ctrlL.x, ctrlL.y, endL.x, endL.y);
  p.moveTo(startR.x, startR.y);
  p.quadTo(ctrlR.x, ctrlR.y, endR.x, endR.y);
  return p;
}

function buildGustBandPath(width: number, height: number, tickN: number) {
  const p = Skia.Path.Make();
  const phase = (tickN % 210) / 210;
  const x = width * (0.12 + phase * 0.86);
  const lean = width * 0.16;
  const band = Math.max(34, width * 0.11);
  p.moveTo(x - band, 0);
  p.lineTo(x + band, 0);
  p.lineTo(x + band + lean, height);
  p.lineTo(x - band + lean, height);
  p.close();
  return p;
}

function buildShiftPath(width: number, height: number, tickN: number) {
  const p = Skia.Path.Make();
  const phase = (tickN % 160) / 160;
  for (let i = 0; i < 3; i++) {
    const y = height * (0.24 + i * 0.2);
    const amp = 18 + i * 5;
    const x0 = width * 0.08;
    const x1 = width * 0.35;
    const x2 = width * 0.68;
    const x3 = width * 0.94;
    const offset = Math.sin(phase * Math.PI * 2 + i * 0.9) * amp;
    p.moveTo(x0, y + offset);
    p.cubicTo(x1, y - amp, x2, y + amp, x3, y - offset);
  }
  return p;
}

function buildWavePath(width: number, height: number, tickN: number) {
  const p = Skia.Path.Make();
  // Slow 6s drift. Each row gets its OWN phase + amplitude so the surface does
  // not move in lockstep (the old single-phase version read as a flat grid).
  const t = (tickN % 180) / 180;
  let row = 0;
  for (let y = 30; y < height; y += 30) {
    const rowPhase = t * Math.PI * 2 + row * 0.6;
    const amp = 3 + (row % 3); // 3..5 px swell, varies by row
    let first = true;
    for (let x = -24; x <= width + 24; x += 18) {
      // Two harmonics -> an organic, non-uniform swell instead of a clean sine.
      const yy =
        y +
        Math.sin(x / 30 + rowPhase) * amp +
        Math.sin(x / 13 - rowPhase * 1.7) * (amp * 0.35);
      if (first) {
        p.moveTo(x, yy);
        first = false;
      } else {
        p.lineTo(x, yy);
      }
    }
    row++;
  }
  return p;
}

// Finer, faster ripple layer drawn over the swells for surface sparkle + depth.
function buildWaveShimmerPath(width: number, height: number, tickN: number) {
  const p = Skia.Path.Make();
  const t = (tickN % 75) / 75; // ~2.5s, faster than the swells
  let row = 0;
  for (let y = 46; y < height; y += 38) {
    const rowPhase = t * Math.PI * 2 + row * 1.3;
    let first = true;
    for (let x = -24; x <= width + 24; x += 14) {
      const yy = y + Math.sin(x / 17 + rowPhase) * 1.8;
      if (first) {
        p.moveTo(x, yy);
        first = false;
      } else {
        p.lineTo(x, yy);
      }
    }
    row++;
  }
  return p;
}

/**
 * Wind-rose wedge for a point-of-sail sector, centred at (0,0) (the compass
 * Group is already translated to the compass centre). Degrees measured from
 * "up" (0 = toward the wind-from arrow once the sector group is rotated by the
 * wind direction); +deg sweeps clockwise (starboard), -deg anticlockwise (port).
 */
function roseWedgePath(r: number, minDeg: number, maxDeg: number) {
  const p = Skia.Path.Make();
  let a0 = minDeg;
  let a1 = maxDeg;
  if (a1 < a0) [a0, a1] = [a1, a0];
  p.moveTo(0, 0);
  const rad0 = ((a0 - 90) * Math.PI) / 180;
  p.lineTo(r * Math.cos(rad0), r * Math.sin(rad0));
  const steps = 18;
  for (let i = 1; i <= steps; i++) {
    const t = a0 + ((a1 - a0) * i) / steps;
    const rad = ((t - 90) * Math.PI) / 180;
    p.lineTo(r * Math.cos(rad), r * Math.sin(rad));
  }
  p.close();
  return p;
}

/**
 * Points of sail by |TWA|, drawn as faint coloured zones on the wind rose so
 * the user can read which way they can sail and which point of sail they are on
 * (same tints as the Courses diagram). `hi` is the highlighted fill used when
 * the boat is currently sailing that point of sail.
 */
const ROSE_SECTORS: { id: string; min: number; max: number; tint: string; hi: string }[] = [
  { id: 'in-irons', min: 0, max: 30, tint: 'rgba(255, 80, 80, 0.22)', hi: 'rgba(255, 104, 104, 0.70)' },
  { id: 'close-hauled', min: 30, max: 60, tint: 'rgba(255, 176, 40, 0.20)', hi: 'rgba(255, 196, 84, 0.68)' },
  { id: 'beam-reach', min: 60, max: 110, tint: 'rgba(60, 216, 255, 0.19)', hi: 'rgba(96, 230, 255, 0.66)' },
  { id: 'broad-reach', min: 110, max: 160, tint: 'rgba(96, 182, 255, 0.20)', hi: 'rgba(128, 202, 255, 0.66)' },
  { id: 'running', min: 160, max: 180, tint: 'rgba(80, 255, 150, 0.21)', hi: 'rgba(120, 255, 182, 0.66)' },
];

function sailStateColor(state: SailState): string {
  switch (state) {
    // Luffing is the normal cold-start / pinching state (head to wind = both
    // sails luff), so it reads as an amber CAUTION, not a red error. Red is
    // reserved for stall - the genuinely-bad over-trim where flow detaches.
    case 'luff': return colors.warning;
    case 'stall': return colors.danger;
    case 'overtrim': return colors.overtrim;
    case 'good': return colors.accentCyan;
    default: return colors.textMuted;
  }
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function insideCompassAt(
  x: number,
  y: number,
  compassCx: number,
  compassCy: number,
): boolean {
  const dx = x - compassCx;
  const dy = y - compassCy;
  return dx * dx + dy * dy <= (COMPASS_R + 8) * (COMPASS_R + 8);
}

export default function Simulator() {
  const { tp, lang } = useI18n();
  const { units } = useUnits();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const sceneW = Math.min(Math.max(windowWidth - spacing.lg * 2, 320), 440);
  const sceneH = Math.min(Math.max(windowHeight * 0.46, 340), 520);
  const centerX = sceneW / 2;
  const centerY = sceneH / 2;
  const compassCx = sceneW - COMPASS_R - 18;
  const compassCy = COMPASS_R + 18;
  const sim = useSimLoop({ bounds: { width: sceneW, height: sceneH } });
  const boatLength = sceneW < 360 ? 48 : 56;
  const viewParam = useLocalSearchParams<{ view?: string }>().view;
  const [simView, setSimView] = useState<SimView>(
    viewParam === 'side' || viewParam === 'rear' ? viewParam : 'top',
  );
  // Deep-link a view: regatta://simulator?view=side|rear. Re-applies when the
  // param changes; a manual tab tap still wins (the param stays put).
  useEffect(() => {
    if (viewParam === 'top' || viewParam === 'side' || viewParam === 'rear') {
      setSimView(viewParam);
    }
  }, [viewParam]);
  const [windMapMode, setWindMapMode] = useState<WindMapMode>('steady');
  const windBaseRef = useRef(sim.wind.trueWindDirRad);
  const windSpeedBaseRef = useRef(sim.wind.trueWindSpeedKts);

  // Sprint 8: a drill can pin the wind regime. When the active drill
  // declares a `windMode`, we adopt it for the screen pill so the user
  // sees the matching ambient effect, and the simulator loop drives the
  // schedule itself (so the screen-level `useEffect` below should NOT
  // double-drive shift/gust during a drill).
  const drillWindMode = sim.drill?.windMode;
  useEffect(() => {
    if (drillWindMode && drillWindMode !== windMapMode) {
      windBaseRef.current = sim.wind.trueWindDirRad;
      windSpeedBaseRef.current = sim.wind.trueWindSpeedKts;
      setWindMapMode(drillWindMode);
    }
    // Intentionally only react to drillWindMode flips, not every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillWindMode]);

  useEffect(() => {
    if (windMapMode === 'steady') return;
    if (drillWindMode) return;
    const phase = sim.tickN / 30;
    if (windMapMode === 'shift') {
      const swingRad = (15 * Math.PI) / 180;
      sim.setWindDir(windBaseRef.current + Math.sin(phase * 0.42) * swingRad);
      return;
    }
    const gust = Math.max(0, Math.sin(phase * 0.78));
    sim.setWindSpeed(windSpeedBaseRef.current + gust * 4);
  }, [sim, windMapMode, drillWindMode]);

  const steer = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin((e) => {
          if (insideCompassAt(e.x, e.y, compassCx, compassCy)) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
            () => {},
          );
          const dx = e.x - centerX;
          const dy = e.y - centerY;
          if (dx === 0 && dy === 0) return;
          sim.setTargetHeading(Math.atan2(dx, -dy));
        })
        .onChange((e) => {
          if (insideCompassAt(e.x, e.y, compassCx, compassCy)) return;
          const dx = e.x - centerX;
          const dy = e.y - centerY;
          if (dx === 0 && dy === 0) return;
          sim.setTargetHeading(Math.atan2(dx, -dy));
        }),
    // Gesture callbacks intentionally close over the current scene geometry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [centerX, centerY, compassCx, compassCy],
  );

  const windDrag = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin((e) => {
          if (!insideCompassAt(e.x, e.y, compassCx, compassCy)) return;
          const dx = e.x - compassCx;
          const dy = e.y - compassCy;
          const next = snapToStep(Math.atan2(dx, -dy), SNAP_RAD);
          windBaseRef.current = next;
          sim.setWindDir(next);
        })
        .onChange((e) => {
          if (!insideCompassAt(e.x, e.y, compassCx, compassCy)) return;
          const dx = e.x - compassCx;
          const dy = e.y - compassCy;
          const next = snapToStep(Math.atan2(dx, -dy), SNAP_RAD);
          windBaseRef.current = next;
          sim.setWindDir(next);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compassCx, compassCy],
  );

  const composedGesture = useMemo(
    () => Gesture.Simultaneous(windDrag, steer),
    [windDrag, steer],
  );

  const arrowGrid = useMemo(
    () => buildArrowGrid(sceneW, sceneH, 54),
    [sceneW, sceneH],
  );
  const windArrowsPath = useMemo(
    () => buildWindArrowsPath(arrowGrid, sim.wind.trueWindDirRad),
    [arrowGrid, sim.wind.trueWindDirRad],
  );
  const wavePath = useMemo(
    () => buildWavePath(sceneW, sceneH, sim.tickN),
    [sceneW, sceneH, sim.tickN],
  );
  const waveShimmerPath = useMemo(
    () => buildWaveShimmerPath(sceneW, sceneH, sim.tickN),
    [sceneW, sceneH, sim.tickN],
  );
  const trailPath = useMemo(
    () => buildTrailPath(sim.trail, sceneW, sceneH),
    [sim.trail, sim.tickN, sceneW, sceneH],
  );
  const wakePath = useMemo(
    () =>
      buildWakePath(
        sim.boat.x,
        sim.boat.y,
        sim.boat.heading,
        boatLength,
        sim.boatExt.boatSpeedKn,
      ),
    [sim.boat.x, sim.boat.y, sim.boat.heading, boatLength, sim.boatExt.boatSpeedKn, sim.tickN],
  );
  const windEffectPath = useMemo(() => {
    if (windMapMode === 'gust') return buildGustBandPath(sceneW, sceneH, sim.tickN);
    if (windMapMode === 'shift') return buildShiftPath(sceneW, sceneH, sim.tickN);
    return Skia.Path.Make();
  }, [windMapMode, sceneW, sceneH, sim.tickN]);

  const noGoPath = useMemo(() => {
    const awaScreenRad =
      sim.boat.heading + (sim.boatExt.awaDeg * Math.PI) / 180;
    return buildNoGoPath(sim.boat.x, sim.boat.y, awaScreenRad, 112);
  }, [sim.boat.x, sim.boat.y, sim.boat.heading, sim.boatExt.awaDeg, sim.tickN]);

  const apparentArrowPath = useMemo(() => {
    const awaScreenRad =
      sim.boat.heading + (sim.boatExt.awaDeg * Math.PI) / 180;
    const bowX = sim.boat.x + Math.sin(sim.boat.heading) * boatLength * 0.96;
    const bowY = sim.boat.y - Math.cos(sim.boat.heading) * boatLength * 0.96;
    return buildApparentArrowPath(bowX, bowY, awaScreenRad);
  }, [sim.boat.x, sim.boat.y, sim.boat.heading, sim.boatExt.awaDeg, boatLength, sim.tickN]);

  // --- Radar cockpit (v1.3): force vectors + point-of-sail halo on the boat ---
  // Drive (тяга): forward along the bow, length ~ boat speed. Side (бок): to
  // leeward (perpendicular), length ~ heel. Together they show the core
  // trade-off the web cockpit teaches: point too high and drive collapses while
  // the side/heeling force grows.
  const driveVectorPath = useMemo(() => {
    const mag = Math.max(0, Math.min(1, sim.boatExt.boatSpeedKn / 7.5));
    const len = boatLength * 0.6 + mag * boatLength * 1.5;
    return buildForceVectorPath(sim.boat.x, sim.boat.y, sim.boat.heading, len);
  }, [sim.boat.x, sim.boat.y, sim.boat.heading, sim.boatExt.boatSpeedKn, boatLength, sim.tickN]);

  const sideVectorPath = useMemo(() => {
    const mag = Math.max(0, Math.min(1, Math.abs(sim.boatExt.heelDeg) / 26));
    const len = boatLength * 0.32 + mag * boatLength * 1.28;
    // Leeward side: apparent wind from starboard (awaDeg >= 0) heels/pushes the
    // boat to port, so the side force points to port (heading - 90 deg).
    const sideDir =
      sim.boat.heading + (sim.boatExt.awaDeg >= 0 ? -Math.PI / 2 : Math.PI / 2);
    return buildForceVectorPath(sim.boat.x, sim.boat.y, sideDir, len);
  }, [sim.boat.x, sim.boat.y, sim.boat.heading, sim.boatExt.heelDeg, sim.boatExt.awaDeg, boatLength, sim.tickN]);

  // Points-of-sail halo: the same sectors as the corner rose, but drawn as an
  // annular band around the boat (anchored on the true-wind direction) so the
  // top view reads as a radar - the boat sits inside its point-of-sail band.
  const sectorHaloPaths = useMemo(() => {
    const haloRi = boatLength * 1.5;
    const haloRo = boatLength * 2.1;
    const twd = (sim.wind.trueWindDirRad * 180) / Math.PI;
    return ROSE_SECTORS.map((s) => ({
      id: s.id,
      tint: s.tint,
      hi: s.hi,
      stb: buildSectorRingPath(sim.boat.x, sim.boat.y, haloRi, haloRo, twd + s.min, twd + s.max),
      port: buildSectorRingPath(sim.boat.x, sim.boat.y, haloRi, haloRo, twd - s.max, twd - s.min),
    }));
  }, [sim.boat.x, sim.boat.y, sim.wind.trueWindDirRad, boatLength, sim.tickN]);

  const autoTrim = sim.controls.autoTrim !== false;
  const mainSheet = sim.controls.mainSheet ?? 0.5;
  const jibSheet = sim.controls.jibSheet ?? 0.4;
  const twist = sim.controls.twist ?? 0.15;
  const reef = sim.controls.reef ?? 0;

  const compassArrowPath = useMemo(() => buildCompassArrowPath(), []);
  // Wind-rose point-of-sail sectors (static geometry; the group is rotated by
  // the live wind direction at render time).
  const roseSectorPaths = useMemo(
    () =>
      ROSE_SECTORS.map((s) => ({
        id: s.id,
        tint: s.tint,
        hi: s.hi,
        stb: roseWedgePath(COMPASS_R - 3, s.min, s.max),
        port: roseWedgePath(COMPASS_R - 3, -s.max, -s.min),
      })),
    [],
  );
  // Which point of sail the boat is currently on (|TWA|), so its sector lights up.
  const activeRoseId = useMemo(() => {
    const a = Math.abs(sim.boatExt.twaDeg);
    return ROSE_SECTORS.find((s) => a >= s.min && a <= s.max)?.id ?? null;
  }, [sim.boatExt.twaDeg]);
  // The localized point-of-sail NAME for the active sector (the "understand the
  // wind" payoff). Short form: drop the "/ ..." alias from the data name.
  const pointOfSailName = useMemo(() => {
    if (!activeRoseId) return '';
    const p = pointsOfSail.find((x) => x.id === activeRoseId);
    return p ? (legacyPick(p, 'name', lang).split('/')[0] ?? '').trim() : '';
  }, [activeRoseId, lang]);
  // Bow-heading marker position on the rose (world frame, 0 = north = up).
  const boatMarkerXY = useMemo(
    () => ({
      x: (COMPASS_R - 7) * Math.sin(sim.boat.heading),
      y: -(COMPASS_R - 7) * Math.cos(sim.boat.heading),
    }),
    [sim.boat.heading],
  );

  const title = tp('Симулятор', 'Simulator', 'Symulator', {
    es: 'Simulador',
    fr: 'Simulateur',
    de: 'Simulator',
    it: 'Simulatore',
  });
  const badge = tp('VPP физика', 'VPP physics', 'Fizyka VPP', {
    es: 'Fisica VPP',
    fr: 'Physique VPP',
    de: 'VPP-Physik',
    it: 'Fisica VPP',
  });
  const resetLabel = tp('СБРОС', 'RESET', 'RESET', {
    es: 'RESET',
    fr: 'RESET',
    de: 'RESET',
    it: 'RESET',
  });
  const autoLabel = tp('АВТО TRIM', 'AUTO TRIM', 'AUTO TRIM', {
    es: 'AUTO TRIM',
    fr: 'AUTO TRIM',
    de: 'AUTO TRIM',
    it: 'AUTO TRIM',
  });
  const manualLabel = tp('РУЧНОЙ TRIM', 'MANUAL TRIM', 'RECZNY TRIM', {
    es: 'TRIM MANUAL',
    fr: 'TRIM MANUEL',
    de: 'MANUELLER TRIM',
    it: 'TRIM MANUALE',
  });
  const headingLabel = tp('КУРС', 'HEADING', 'KURS', {
    es: 'RUMBO',
    fr: 'CAP',
    de: 'KURS',
    it: 'ROTTA',
  });
  // Sprint 11: Speed-cell heading reflects the chosen speed unit so
  // the value beneath reads as the right kind of speed (kt vs m/s).
  // The original `tp('УЗЛЫ', 'SPEED', 'WEZLY', ...)` was a static
  // "knots" label that lied when the user picked metric units.
  const speedUnitWord = speedUnitLabel(units.speed).toUpperCase();
  const speedLabel = speedUnitWord;
  const heelLabel = tp('КРЕН', 'HEEL', 'PRZECHYL', {
    es: 'ESCORA',
    fr: 'GITE',
    de: 'KRANGUNG',
    it: 'SBANDAMENTO',
  });
  const trimLabel = tp('TRIM', 'TRIM', 'TRIM', {
    es: 'TRIM',
    fr: 'TRIM',
    de: 'TRIM',
    it: 'TRIM',
  });
  const mainLabel = tp('ГРОТ', 'MAIN', 'GROT', {
    es: 'MAYOR',
    fr: 'GV',
    de: 'GROSS',
    it: 'RANDA',
  });
  const jibLabel = tp('СТАКСЕЛЬ', 'JIB', 'FOK', {
    es: 'FOQUE',
    fr: 'FOC',
    de: 'FOCK',
    it: 'FIOCCO',
  });
  const reefLabel = tp('РИФ', 'REEF', 'REF', {
    es: 'RIZO',
    fr: 'RIS',
    de: 'REFF',
    it: 'TERZAROLI',
  });
  const twistLabel = tp('TWIST', 'TWIST', 'TWIST', {
    es: 'TWIST',
    fr: 'TWIST',
    de: 'TWIST',
    it: 'TWIST',
  });
  const note = tp(
    'Тяни по воде - руление. Компас справа меняет ветер. MAIN/JIB показывают, как шкот влияет на скорость, крен и срыв.',
    'Drag on water to steer. The compass changes wind. MAIN/JIB show how sheet trim changes speed, heel and stall.',
    'Przeciagaj po wodzie - ster. Kompas zmienia wiatr. MAIN/JIB pokazuja wplyw szotow na predkosc, przechyl i stall.',
    {
      es: 'Arrastra sobre el agua para gobernar. La brujula cambia el viento. MAIN/JIB muestran como el trim cambia velocidad, escora y stall.',
      fr: 'Glisse sur leau pour barrer. La boussole change le vent. MAIN/JIB montrent comment le reglage change vitesse, gite et stall.',
      de: 'Ziehe ueber das Wasser zum Steuern. Der Kompass aendert Wind. MAIN/JIB zeigen Tempo, Kraengung und Stall.',
      it: 'Trascina sullacqua per timonare. La bussola cambia vento. MAIN/JIB mostrano velocita, sbandamento e stall.',
    },
  );
  const modeFreeLabel = tp('Свободно', 'Free', 'Swobodnie', {
    es: 'Libre',
    fr: 'Libre',
    de: 'Frei',
    it: 'Libero',
  });
  const modeDrillLabel = tp('Тренировка', 'Drill', 'Cwiczenie', {
    es: 'Ejercicio',
    fr: 'Exercice',
    de: 'Drill',
    it: 'Esercizio',
  });
  const modeMissionLabel = tp('Миссия', 'Mission', 'Misja', {
    es: 'Mision',
    fr: 'Mission',
    de: 'Mission',
    it: 'Missione',
  });
  const viewTopLabel = tp('Сверху', 'Top', 'Gora', {
    es: 'Arriba',
    fr: 'Dessus',
    de: 'Oben',
    it: 'Alto',
  });
  const viewSideLabel = tp('Сбоку', 'Side', 'Bok', {
    es: 'Lado',
    fr: 'Cote',
    de: 'Seite',
    it: 'Lato',
  });
  const viewRearLabel = tp('С кормы', 'Rear', 'Rufa', {
    es: 'Popa',
    fr: 'Arriere',
    de: 'Heck',
    it: 'Poppa',
  });
  const windSteadyLabel = tp('Ровный', 'Steady', 'Staly', {
    es: 'Estable',
    fr: 'Stable',
    de: 'Stetig',
    it: 'Stabile',
  });
  const windShiftLabel = tp('Заход', 'Shift', 'Zmiana', {
    es: 'Role',
    fr: 'Bascule',
    de: 'Dreher',
    it: 'Salto',
  });
  const windGustLabel = tp('Порыв', 'Gust', 'Podmuch', {
    es: 'Racha',
    fr: 'Rafale',
    de: 'Boe',
    it: 'Raffica',
  });
  const missionLabel = tp('МИССИЯ', 'MISSION', 'MISJA', {
    es: 'MISION',
    fr: 'MISSION',
    de: 'MISSION',
    it: 'MISSIONE',
  });
  const drillSelectLabel = tp(
    'Выбери тренировку',
    'Pick a drill',
    'Wybierz cwiczenie',
    {
      es: 'Elige un ejercicio',
      fr: 'Choisis un exercice',
      de: 'Drill waehlen',
      it: 'Scegli un esercizio',
    },
  );
  const missionSelectLabel = tp(
    'Выбери миссию',
    'Pick a mission',
    'Wybierz misje',
    {
      es: 'Elige una mision',
      fr: 'Choisis une mission',
      de: 'Mission waehlen',
      it: 'Scegli una missione',
    },
  );
  const tryAgainLabel = tp('Ещё раз', 'Try again', 'Jeszcze raz', {
    es: 'Otra vez',
    fr: 'Recommencer',
    de: 'Nochmal',
    it: 'Ancora',
  });
  const nextMissionLabel = tp(
    'Следующая миссия',
    'Next mission',
    'Nastepna misja',
    {
      es: 'Siguiente mision',
      fr: 'Mission suivante',
      de: 'Naechste Mission',
      it: 'Prossima missione',
    },
  );
  const drillDoneLabel = tp(
    'Готово!',
    'Done!',
    'Gotowe!',
    {
      es: 'Hecho!',
      fr: 'Fini!',
      de: 'Geschafft!',
      it: 'Fatto!',
    },
  );
  const drillFailLabel = tp(
    'Не получилось',
    'Not this time',
    'Nie udalo sie',
    {
      es: 'No salio',
      fr: 'Pas cette fois',
      de: 'Nicht geschafft',
      it: 'Non stavolta',
    },
  );
  const drillScoreLabel = tp('Счёт', 'Score', 'Wynik', {
    es: 'Puntuacion',
    fr: 'Score',
    de: 'Punktzahl',
    it: 'Punteggio',
  });
  const missionDoneLabel = tp(
    'Финиш!',
    'Finish!',
    'Meta!',
    {
      es: 'Meta!',
      fr: 'Arrivee!',
      de: 'Ziel!',
      it: 'Traguardo!',
    },
  );
  const elapsedLabel = tp('Время', 'Time', 'Czas', {
    es: 'Tiempo',
    fr: 'Temps',
    de: 'Zeit',
    it: 'Tempo',
  });
  const scoreLabel = tp('Очки', 'Score', 'Wynik', {
    es: 'Puntos',
    fr: 'Score',
    de: 'Punkte',
    it: 'Punti',
  });
  const distanceLabel = tp('До знака', 'To mark', 'Do znaku', {
    es: 'A la baliza',
    fr: 'Vers la bouee',
    de: 'Zur Tonne',
    it: 'Alla boa',
  });
  const windMapLabel = tp('КАРТА ВЕТРА', 'WIND MAP', 'MAPA WIATRU', {
    es: 'MAPA DE VIENTO',
    fr: 'CARTE DU VENT',
    de: 'WINDKARTE',
    it: 'MAPPA VENTO',
  });
  const trackLabel = tp('ТРЕК', 'TRACK', 'SLAD', {
    es: 'TRAZA',
    fr: 'TRACE',
    de: 'SPUR',
    it: 'TRACCIA',
  });
  const sceneLabels: SceneLabels = {
    apparentWind: tp('вымпельный', 'apparent', 'pozorny', {
      es: 'aparente',
      fr: 'apparent',
      de: 'scheinbar',
      it: 'apparente',
    }),
    trueWind: tp('истинный', 'true wind', 'wiatr realny', {
      es: 'viento real',
      fr: 'vent reel',
      de: 'wahrer Wind',
      it: 'vento reale',
    }),
    drive: tp('тяга', 'drive', 'ciag', {
      es: 'empuje',
      fr: 'poussee',
      de: 'Vortrieb',
      it: 'spinta',
    }),
    sideForce: tp('боковая', 'side force', 'sila boczna', {
      es: 'lateral',
      fr: 'lateral',
      de: 'Seitkraft',
      it: 'laterale',
    }),
    heel: tp('крен', 'heel', 'przechyl', {
      es: 'escora',
      fr: 'gite',
      de: 'Krangung',
      it: 'sbandamento',
    }),
    reef: tp('риф', 'reef', 'ref', {
      es: 'rizo',
      fr: 'ris',
      de: 'Reff',
      it: 'terzaroli',
    }),
    twist: 'twist',
    gust: tp('порыв', 'gust', 'podmuch', {
      es: 'racha',
      fr: 'rafale',
      de: 'Boe',
      it: 'raffica',
    }),
    shift: tp('заход ветра', 'wind shift', 'zmiana wiatru', {
      es: 'role de viento',
      fr: 'bascule de vent',
      de: 'Winddreher',
      it: 'salto di vento',
    }),
    leeway: tp('дрейф', 'leeway', 'dryf', {
      es: 'abatimiento',
      fr: 'derive',
      de: 'Abdrift',
      it: 'scarroccio',
    }),
  };
  const luffLabel = tp('ХЛОПАЕТ', 'LUFF', 'LUFF', {
    es: 'FLAMEA',
    fr: 'FASEILLE',
    de: 'KILLT',
    it: 'FILEGGIA',
  });
  const stallLabel = tp('СРЫВ', 'STALL', 'STALL', {
    es: 'STALL',
    fr: 'DECROCH',
    de: 'STALL',
    it: 'STALLO',
  });
  const overtrimLabel = tp('ПЕРЕТЯНУТ', 'OVERTRIM', 'PRZECIAG', {
    es: 'TENSO',
    fr: 'TROP BORD',
    de: 'ZU DICHT',
    it: 'TROPPO',
  });
  const goodLabel = tp('ОК', 'GOOD', 'OK', {
    es: 'OK',
    fr: 'OK',
    de: 'GUT',
    it: 'OK',
  });
  const sailStateLabel = (s: SailState): string => {
    switch (s) {
      case 'luff': return luffLabel;
      case 'stall': return stallLabel;
      case 'overtrim': return overtrimLabel;
      case 'good': return goodLabel;
      default: return '';
    }
  };

  const headingDeg = Math.round(
    (((sim.boat.heading * 180) / Math.PI) % 360 + 360) % 360,
  );
  const twdDeg = Math.round(
    (((sim.wind.trueWindDirRad * 180) / Math.PI) % 360 + 360) % 360,
  );
  // `speedKn` retains the raw .toFixed(1) string for legacy SVG scenes
  // (TopScene speedometer needle). `speedDisplay` is the unit-formatted
  // value the HUD cell reads.
  const speedKn = sim.boatExt.boatSpeedKn.toFixed(1);
  const speedDisplay = formatSpeed(sim.boatExt.boatSpeedKn, units.speed);
  const heelDeg = Math.round(sim.boatExt.heelDeg);
  const leewayDegVisual = leewayAngleDeg(sim.boatExt);
  const twaDeg = Math.round(sim.boatExt.twaDeg);
  const awaDeg = Math.round(sim.boatExt.awaDeg);
  // VMG is a speed - format per the speed-unit choice. We append the
  // unit suffix because the readout sits next to TWA/AWA so a unit-less
  // number could be mistaken for an angle.
  const vmgDisplay = `${formatSpeed(sim.boatExt.vmgKn, units.speed)} ${speedUnitLabel(units.speed)}`;
  // The wind compass and SVG scenes render a wind-speed label. Beaufort
  // ('F4') has no decimal, kt/m/s show 1 decimal. The cycle button
  // toggles preset wind speeds (6/10/14/20 kt) - we still pass through
  // the live windKts in knots to the engine; it only affects display.
  const windKts = Math.round(sim.wind.trueWindSpeedKts);
  const windDisplay = formatWindSpeed(sim.wind.trueWindSpeedKts, units.windSpeed);
  const windDisplaySuffix =
    units.windSpeed === 'beaufort'
      ? '' // Beaufort already contains the F prefix, no suffix needed
      : ` ${windSpeedUnitLabel(units.windSpeed)}`;
  const windDisplayWithUnit = `${windDisplay}${windDisplaySuffix}`;
  const trimScore = sim.boatExt.trimScore;
  const trimColor = scoreColor(trimScore);
  // Cockpit header pill: TRIM% . point-of-sail . tack (mirrors the web V3).
  // Starboard tack = apparent wind over the starboard side (TWA >= 0).
  const isStarboardTack = sim.boatExt.twaDeg >= 0;
  const tackName = isStarboardTack
    ? tp('ПРАВЫЙ ГАЛС', 'STARBOARD', 'PRAWY HALS', {
        es: 'ESTRIBOR',
        fr: 'TRIBORD',
        de: 'STEUERBORD',
        it: 'MURA DRITTA',
      })
    : tp('ЛЕВЫЙ ГАЛС', 'PORT', 'LEWY HALS', {
        es: 'BABOR',
        fr: 'BABORD',
        de: 'BACKBORD',
        it: 'MURA SINISTRA',
      });
  const cockpitTrimWord = tp('ТРИМ', 'TRIM', 'TRIM', {
    es: 'TRIM',
    fr: 'TRIM',
    de: 'TRIM',
    it: 'TRIM',
  });
  const cockpitPillText = [
    `${cockpitTrimWord} ${trimScore}%`,
    pointOfSailName ? pointOfSailName.toUpperCase() : '',
    tackName,
  ]
    .filter(Boolean)
    .join('  ·  ');
  // Force-vector legend words (тяга / бок), matching the web cockpit.
  const driveWord = tp('ТЯГА', 'DRIVE', 'NAPED', {
    es: 'EMPUJE',
    fr: 'POUSSEE',
    de: 'VORTRIEB',
    it: 'SPINTA',
  });
  const sideWord = tp('БОК', 'SIDE', 'BOK', {
    es: 'LATERAL',
    fr: 'LATERAL',
    de: 'SEITE',
    it: 'LATERALE',
  });
  const heelOffset = Math.max(-8, Math.min(8, sim.boatExt.heelDeg / 4));
  const showSpinnaker = sim.boatExt.sailSet === 'spinnaker';
  const showTrack = sim.trail.length > 5;
  const activeWindModeLabel =
    windMapMode === 'gust'
      ? windGustLabel
      : windMapMode === 'shift'
      ? windShiftLabel
      : windSteadyLabel;
  const commentary = commentaryFor({
    mainStalled: sim.boatExt.mainStalled,
    jibStalled: sim.boatExt.jibStalled,
    heelDeg,
    twaDeg,
    trimScore,
    tp,
  });

  // VoiceOver label for the interactive top-view control. Drag on the water
  // steers the boat (heading); drag on the compass rose changes the wind
  // direction. We fold the live heading + wind-from values into the label so
  // a screen reader announces the current state, mirroring the web sliders'
  // "Boat heading" / "Wind direction" aria-labels.
  const sceneA11yLabel = tp(
    `Управление ветром и рулём. Тяни по воде - руль, компас меняет ветер. Курс ${headingDeg} градусов, ветер с ${twdDeg} градусов.`,
    `Wind and steering control. Drag on the water to steer, the compass changes the wind. Heading ${headingDeg} degrees, wind from ${twdDeg} degrees.`,
    `Sterowanie wiatrem i sterem. Przeciagaj po wodzie - ster, kompas zmienia wiatr. Kurs ${headingDeg} stopni, wiatr z ${twdDeg} stopni.`,
    {
      es: `Control de viento y timon. Arrastra sobre el agua para gobernar, la brujula cambia el viento. Rumbo ${headingDeg} grados, viento desde ${twdDeg} grados.`,
      fr: `Controle du vent et de la barre. Glisse sur l'eau pour barrer, la boussole change le vent. Cap ${headingDeg} degres, vent de ${twdDeg} degres.`,
      de: `Wind- und Steuerregler. Ziehe ueber das Wasser zum Steuern, der Kompass aendert den Wind. Kurs ${headingDeg} Grad, Wind aus ${twdDeg} Grad.`,
      it: `Controllo vento e timone. Trascina sull'acqua per timonare, la bussola cambia il vento. Rotta ${headingDeg} gradi, vento da ${twdDeg} gradi.`,
    },
  );

  const mode: SimMode = sim.mode;
  const drillState = sim.drill;
  const missionState = sim.mission;
  const activeDrill = drillState
    ? DRILLS.find((d) => d.id === drillState.drillId)
    : undefined;
  const activeMission = missionState
    ? MISSIONS.find((m) => m.id === missionState.missionId)
    : undefined;

  const handlePickView = (next: SimView) => {
    Haptics.selectionAsync().catch(() => {});
    setSimView(next);
  };

  const handlePickWindMode = (next: WindMapMode) => {
    Haptics.selectionAsync().catch(() => {});
    if (next !== 'steady') {
      windBaseRef.current = sim.wind.trueWindDirRad;
      windSpeedBaseRef.current = sim.wind.trueWindSpeedKts;
    } else {
      sim.setWindDir(windBaseRef.current);
      sim.setWindSpeed(windSpeedBaseRef.current);
    }
    setWindMapMode(next);
  };

  const handleCycleWindSpeed = () => {
    const currentBase = windSpeedBaseRef.current;
    const currentIdx = WIND_SPEED_PRESETS.findIndex((k) => k === Math.round(currentBase));
    const next =
      WIND_SPEED_PRESETS[(currentIdx + 1) % WIND_SPEED_PRESETS.length] ?? WIND_SPEED_PRESETS[0];
    windSpeedBaseRef.current = next;
    sim.setWindSpeed(next);
  };

  const handlePickMode = (next: SimMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    sim.setMode(next);
  };
  const handlePickDrill = (id: typeof DRILLS[number]['id']) => {
    Haptics.selectionAsync().catch(() => {});
    sim.setDrillId(id);
    sim.reset();
  };
  const handlePickMission = (id: typeof MISSIONS[number]['id']) => {
    Haptics.selectionAsync().catch(() => {});
    sim.setMissionId(id);
    sim.reset();
  };
  const handleNextMission = () => {
    if (!activeMission) return;
    const idx = MISSIONS.findIndex((m) => m.id === activeMission.id);
    const next = MISSIONS[(idx + 1) % MISSIONS.length]!;
    handlePickMission(next.id);
  };

  return (
    <Screen noTopInset>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>{badge.toUpperCase()}</Text>
          </View>
          <View style={styles.headerSpacer} />
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                () => {},
              );
              sim.reset();
            }}
            accessibilityRole="button"
            accessibilityLabel={resetLabel}
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.resetPressed,
            ]}
          >
            <Text style={styles.resetText}>{resetLabel}</Text>
          </Pressable>
        </View>

        <View style={styles.modeBar}>
          <ModeChip
            label={modeFreeLabel}
            active={mode === 'free'}
            onPress={() => handlePickMode('free')}
          />
          <ModeChip
            label={modeDrillLabel}
            active={mode === 'drill'}
            onPress={() => handlePickMode('drill')}
          />
          <ModeChip
            label={modeMissionLabel}
            active={mode === 'mission'}
            onPress={() => handlePickMode('mission')}
          />
        </View>

        <View style={styles.viewBar}>
          <ViewChip
            label={viewTopLabel}
            active={simView === 'top'}
            onPress={() => handlePickView('top')}
          />
          <ViewChip
            label={viewSideLabel}
            active={simView === 'side'}
            onPress={() => handlePickView('side')}
          />
          <ViewChip
            label={viewRearLabel}
            active={simView === 'rear'}
            onPress={() => handlePickView('rear')}
          />
        </View>

        <View style={styles.windModeBar}>
          <WindModeChip
            label={windSteadyLabel}
            active={windMapMode === 'steady'}
            onPress={() => handlePickWindMode('steady')}
          />
          <WindModeChip
            label={windShiftLabel}
            active={windMapMode === 'shift'}
            onPress={() => handlePickWindMode('shift')}
          />
          <WindModeChip
            label={windGustLabel}
            active={windMapMode === 'gust'}
            onPress={() => handlePickWindMode('gust')}
          />
        </View>

        <LiveWindControl
          onApply={(speedKts, dirRad) => {
            // Live wind only SETS the existing wind. The synthetic
            // wind-map mode stays whatever the user chose; we just feed a
            // real starting value into the same setters the sliders use.
            sim.setWindSpeed(speedKts);
            sim.setWindDir(dirRad);
            // Keep the steady/shift/gust base refs in sync so toggling
            // wind-map modes does not snap back to the old synthetic value.
            windBaseRef.current = dirRad;
            windSpeedBaseRef.current = speedKts;
          }}
        />

        {mode === 'mission' && activeMission && missionState ? (
          <View style={styles.missionHud}>
            <View style={styles.missionHudRow}>
              <Text style={styles.missionHudKicker}>{missionLabel}</Text>
              <Text style={styles.missionHudClock}>
                {formatTime(missionState.elapsedSec)}
              </Text>
            </View>
            <Text style={styles.missionHudTitle} numberOfLines={3}>
              {activeMission.title(tp)}
            </Text>
            <Text variant="caption" style={styles.missionHudHint} numberOfLines={3}>
              {activeMission.hint(tp)}
            </Text>
            {missionState.distanceToNextPx != null &&
              !missionState.done && (
              <View style={styles.missionHudMeta}>
                <Text style={styles.missionHudMetaLabel}>{distanceLabel}</Text>
                <Text style={styles.missionHudMetaValue}>
                  {`${Math.round(missionState.distanceToNextPx)} px`}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {mode === 'drill' && activeDrill && drillState ? (
          <View style={styles.missionHud}>
            <Text style={styles.missionHudKicker}>{modeDrillLabel.toUpperCase()}</Text>
            <Text style={styles.missionHudTitle} numberOfLines={3}>
              {activeDrill.title(tp)}
            </Text>
            <Text variant="caption" style={styles.missionHudHint} numberOfLines={3}>
              {activeDrill.hint(tp)}
            </Text>
            <View style={styles.missionHudMeta}>
              <Text style={styles.missionHudMetaLabel}>
                {activeDrill.progressLabel(
                  drillState.progressSec,
                  drillState.targetSec,
                  tp,
                )}
              </Text>
              <View style={styles.drillBarTrack}>
                <View
                  style={[
                    styles.drillBarFill,
                    {
                      width: `${Math.min(
                        100,
                        Math.round(
                          (drillState.progressSec / drillState.targetSec) * 100,
                        ),
                      )}%`,
                      backgroundColor: drillState.done
                        ? colors.success
                        : drillState.active
                        ? colors.accentCyan
                        : colors.textMuted,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        ) : null}

        <View style={[styles.canvasWrap, { width: sceneW, height: sceneH }]}>
          {simView === 'top' ? (
            <GestureDetector gesture={composedGesture}>
            <Canvas
              style={{ width: sceneW, height: sceneH }}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={sceneA11yLabel}
            >
              <Group>
                {/* Water depth: radial gradient, lighter near the boat,
                    darkening toward the edges so the playfield reads as
                    open water with depth instead of a flat panel. */}
                <Fill>
                  <RadialGradient
                    c={vec(centerX, centerY)}
                    r={Math.max(sceneW, sceneH) * 0.78}
                    colors={['#1b3f60', '#0d2238', '#060e18']}
                  />
                </Fill>
                <Path
                  path={wavePath}
                  color="rgba(150, 210, 235, 0.18)"
                  style="stroke"
                  strokeWidth={1.3}
                  strokeCap="round"
                />
                <Path
                  path={waveShimmerPath}
                  color="rgba(196, 236, 255, 0.10)"
                  style="stroke"
                  strokeWidth={0.8}
                  strokeCap="round"
                />
                {windMapMode === 'gust' ? (
                  <Path
                    path={windEffectPath}
                    color={colors.success}
                    style="fill"
                    opacity={0.14}
                  />
                ) : null}
                {windMapMode === 'shift' ? (
                  <Path
                    path={windEffectPath}
                    color={colors.warning}
                    style="stroke"
                    strokeWidth={2}
                    strokeCap="round"
                    opacity={0.42}
                  />
                ) : null}
                <Path
                  path={windArrowsPath}
                  color={colors.windColor}
                  style="stroke"
                  strokeWidth={1}
                  strokeCap="round"
                  opacity={0.34}
                />
                {mode === 'mission' && missionState
                  ? missionState.marks.map((m) => (
                      <Group key={m.id}>
                        <Circle
                          cx={m.x}
                          cy={m.y}
                          r={m.captureRadius}
                          color={
                            m.cleared
                              ? 'rgba(68, 255, 136, 0.10)'
                              : m.active
                              ? 'rgba(0, 212, 255, 0.18)'
                              : 'rgba(255, 170, 0, 0.10)'
                          }
                          style="stroke"
                          strokeWidth={1}
                        />
                        <Circle
                          cx={m.x}
                          cy={m.y}
                          r={m.radius}
                          color={
                            m.cleared
                              ? colors.success
                              : m.active
                              ? colors.accentCyan
                              : colors.warning
                          }
                        />
                      </Group>
                    ))
                  : null}

                <Path
                  path={trailPath}
                  color="rgba(82, 255, 142, 0.70)"
                  style="stroke"
                  strokeWidth={1.4}
                  strokeCap="round"
                  strokeJoin="round"
                  opacity={0.34}
                />

                <Path
                  path={wakePath}
                  color="rgba(232, 244, 248, 0.42)"
                  style="stroke"
                  strokeWidth={2}
                  strokeCap="round"
                  opacity={0.55}
                />

                {/* Points-of-sail halo (radar band around the boat). The band
                    the boat sits in is its current point of sail; it brightens
                    on the active tack side so the top view reads as a cockpit
                    radar, like the web V3. */}
                {sectorHaloPaths.map((s) => {
                  const on = s.id === activeRoseId;
                  const stbOn = on && isStarboardTack;
                  const portOn = on && !isStarboardTack;
                  return (
                    <Group key={s.id}>
                      <Path path={s.stb} color={stbOn ? s.hi : s.tint} opacity={stbOn ? 0.85 : 0.4} />
                      <Path path={s.port} color={portOn ? s.hi : s.tint} opacity={portOn ? 0.85 : 0.4} />
                    </Group>
                  );
                })}

                {/* No-go zone: amber CAUTION sector ("can't point here"), not
                    a red fault. Unified with the luff/no-go-ring caution color. */}
                <Path
                  path={noGoPath}
                  color={colors.warning}
                  style="fill"
                  opacity={0.12}
                />
                <Path
                  path={noGoPath}
                  color={colors.warning}
                  style="stroke"
                  strokeWidth={1}
                  opacity={0.34}
                />

                <Path
                  path={apparentArrowPath}
                  color={colors.windColor}
                  style="stroke"
                  strokeWidth={2.4}
                  strokeCap="round"
                  opacity={0.95}
                />

                <SkiaYacht
                  centerX={sim.boat.x}
                  centerY={sim.boat.y}
                  headingRad={sim.boat.heading}
                  awaDeg={sim.boatExt.awaDeg}
                  mainSheet={mainSheet}
                  jibSheet={jibSheet}
                  twist={twist}
                  reef={reef}
                  sailSet={sim.boatExt.sailSet}
                  luffMain={sim.sailFeedback.main === 'luff'}
                  luffJib={sim.sailFeedback.jib === 'luff'}
                  length={boatLength}
                  heelOffsetPx={heelOffset}
                  tickN={sim.tickN}
                />

                {/* Force vectors on the boat (cockpit): side/heeling force
                    (бок, amber) under the forward drive (тяга, green), so the
                    point-too-high trade-off is visible at a glance. */}
                <Path
                  path={sideVectorPath}
                  color={colors.warning}
                  style="stroke"
                  strokeWidth={3}
                  strokeCap="round"
                  opacity={0.9}
                />
                <Path
                  path={driveVectorPath}
                  color={colors.success}
                  style="stroke"
                  strokeWidth={3.4}
                  strokeCap="round"
                  opacity={0.96}
                />

                <Group
                  transform={[
                    { translateX: compassCx },
                    { translateY: compassCy },
                  ]}
                >
                  <Circle cx={0} cy={0} r={COMPASS_R} color="rgba(15, 32, 53, 0.92)" />
                  {/* Points-of-sail sectors, rotated so the no-go zone sits
                      under the wind-from arrow. The boat's current point of
                      sail lights up - this is the "understand the wind" part. */}
                  <Group transform={[{ rotate: sim.wind.trueWindDirRad }]}>
                    {roseSectorPaths.map((s) => {
                      const on = s.id === activeRoseId;
                      return (
                        <Group key={s.id}>
                          <Path path={s.stb} color={on ? s.hi : s.tint} />
                          <Path path={s.port} color={on ? s.hi : s.tint} />
                        </Group>
                      );
                    })}
                  </Group>
                  <Circle
                    cx={0}
                    cy={0}
                    r={COMPASS_R}
                    color={colors.windColor}
                    style="stroke"
                    strokeWidth={1.2}
                    opacity={0.6}
                  />
                  {/* Bow-heading marker: whichever sector it falls in is the
                      current point of sail. */}
                  <Circle cx={boatMarkerXY.x} cy={boatMarkerXY.y} r={3} color={colors.textPrimary} />
                  <Group transform={[{ rotate: sim.wind.trueWindDirRad }]}>
                    <Path
                      path={compassArrowPath}
                      color={colors.windColor}
                      style="stroke"
                      strokeWidth={2.5}
                      strokeCap="round"
                    />
                  </Group>
                </Group>
              </Group>
            </Canvas>
            </GestureDetector>
          ) : simView === 'side' ? (
            <SideProfileScene
              width={sceneW}
              height={sceneH}
              twaDeg={twaDeg}
              awaDeg={awaDeg}
              heelDeg={heelDeg}
              leewayDeg={leewayDegVisual}
              speedKn={Number(speedKn)}
              mainSheet={mainSheet}
              jibSheet={jibSheet}
              twist={twist}
              reef={reef}
              windKts={windKts}
              windDisplayLabel={windDisplayWithUnit}
              windMode={windMapMode}
              showSpinnaker={showSpinnaker}
              tickN={sim.tickN}
              labels={sceneLabels}
            />
          ) : (
            <RearScene
              width={sceneW}
              height={sceneH}
              twaDeg={twaDeg}
              awaDeg={awaDeg}
              heelDeg={heelDeg}
              leewayDeg={leewayDegVisual}
              trimScore={trimScore}
              mainSheet={mainSheet}
              jibSheet={jibSheet}
              reef={reef}
              windDisplayLabel={windDisplayWithUnit}
              windMode={windMapMode}
              showSpinnaker={showSpinnaker}
              tickN={sim.tickN}
              labels={sceneLabels}
            />
          )}

          <Pressable
            style={[styles.windSpeedButton, { top: compassCy + COMPASS_R + 8 }]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              handleCycleWindSpeed();
            }}
            accessibilityRole="button"
            accessibilityLabel={`${tp('Ветер', 'Wind', 'Wiatr', { es: 'Viento', fr: 'Vent', de: 'Wind', it: 'Vento' })}: ${windDisplayWithUnit}, ${twdDeg}°`}
            accessibilityHint={tp(
              'Нажми, чтобы поменять силу ветра',
              'Tap to cycle wind speed',
              'Stuknij, aby zmienic predkosc wiatru',
              {
                es: 'Toca para cambiar la velocidad del viento',
                fr: 'Touche pour changer la vitesse du vent',
                de: 'Tippen, um Windstaerke zu wechseln',
                it: 'Tocca per cambiare la velocita del vento',
              },
            )}
          >
            <Text allowFontScaling={false} style={styles.windSpeedValue}>{windDisplayWithUnit}</Text>
            <Text allowFontScaling={false} style={styles.windSpeedLabel}>TWD</Text>
            <Text allowFontScaling={false} style={styles.windSpeedTwd}>{`${twdDeg}°`}</Text>
          </Pressable>

          {/* Cockpit hero readout: TRIM% . point-of-sail . tack (the web V3
              header pill), placed at the bottom where it is unobstructed on a
              phone, with the raw TWA/AWA/VMG chips beneath it. */}
          <View style={styles.sceneReadout}>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[styles.cockpitPill, { maxWidth: sceneW - 20 }]}
            >
              {cockpitPillText}
            </Text>
            <View style={styles.sceneReadoutRow}>
              <Text allowFontScaling={false} style={styles.sceneReadoutText}>{`TWA ${twaDeg}°`}</Text>
              <Text allowFontScaling={false} style={styles.sceneReadoutText}>{`AWA ${awaDeg}°`}</Text>
              <Text allowFontScaling={false} style={styles.sceneReadoutText}>{`VMG ${vmgDisplay}`}</Text>
            </View>
          </View>

          <View pointerEvents="none" style={styles.mapLegend}>
            <View style={styles.mapLegendRow}>
              <View style={[styles.mapLegendDot, { backgroundColor: colors.windColor }]} />
              <Text allowFontScaling={false} style={styles.mapLegendText}>
                {`${windMapLabel} ${activeWindModeLabel.toUpperCase()}`}
              </Text>
            </View>
            {simView === 'top' ? (
              <>
                <View style={styles.mapLegendRow}>
                  <View style={[styles.mapLegendDot, { backgroundColor: colors.success }]} />
                  <Text allowFontScaling={false} style={styles.mapLegendText}>
                    {driveWord.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.mapLegendRow}>
                  <View style={[styles.mapLegendDot, { backgroundColor: colors.warning }]} />
                  <Text allowFontScaling={false} style={styles.mapLegendText}>
                    {sideWord.toUpperCase()}
                  </Text>
                </View>
              </>
            ) : null}
            {showTrack ? (
              <View style={styles.mapLegendRow}>
                <View style={[styles.mapLegendDot, { backgroundColor: colors.success }]} />
                <Text allowFontScaling={false} style={styles.mapLegendText}>{trackLabel}</Text>
              </View>
            ) : null}
          </View>

          {!showSpinnaker ? (
            <SailBadge
              state={sim.sailFeedback.main}
              label={`MAIN ${sailStateLabel(sim.sailFeedback.main)}`}
              left={Math.max(8, sim.boat.x - 92)}
              top={Math.max(8, sim.boat.y - 26)}
            />
          ) : null}
          {!showSpinnaker ? (
            <SailBadge
              state={sim.sailFeedback.jib}
              label={`JIB ${sailStateLabel(sim.sailFeedback.jib)}`}
              left={Math.min(sceneW - 96, sim.boat.x + 36)}
              top={Math.max(8, sim.boat.y - 26)}
            />
          ) : null}

          {missionState?.done && activeMission ? (
            <View style={styles.resultPanel}>
              <Text style={styles.resultKicker}>{missionDoneLabel}</Text>
              <Text style={styles.resultTitle} numberOfLines={3}>
                {activeMission.title(tp)}
              </Text>
              <View style={styles.resultRow}>
                <View style={styles.resultStat}>
                  <Text style={styles.resultStatLabel}>{elapsedLabel}</Text>
                  <Text style={styles.resultStatValue}>
                    {formatTime(missionState.elapsedSec)}
                  </Text>
                </View>
                <View style={styles.resultStat}>
                  <Text style={styles.resultStatLabel}>{scoreLabel}</Text>
                  <Text style={styles.resultStatValue}>
                    {missionState.score}
                  </Text>
                </View>
              </View>
              <View style={styles.resultActions}>
                <Pressable
                  onPress={() => sim.reset()}
                  accessibilityRole="button"
                  accessibilityLabel={tryAgainLabel}
                  style={({ pressed }) => [
                    styles.resultButton,
                    pressed && styles.resultButtonPressed,
                  ]}
                >
                  <Text style={styles.resultButtonText}>{tryAgainLabel}</Text>
                </Pressable>
                <Pressable
                  onPress={handleNextMission}
                  accessibilityRole="button"
                  accessibilityLabel={nextMissionLabel}
                  style={({ pressed }) => [
                    styles.resultButton,
                    styles.resultButtonPrimary,
                    pressed && styles.resultButtonPressed,
                  ]}
                >
                  <Text style={styles.resultButtonTextPrimary}>
                    {nextMissionLabel}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {drillState?.done && activeDrill ? (
            <View style={styles.resultPanel}>
              <Text
                style={[
                  styles.resultKicker,
                  !drillState.passed && styles.resultKickerFail,
                ]}
              >
                {drillState.passed ? drillDoneLabel : drillFailLabel}
              </Text>
              <Text style={styles.resultTitle} numberOfLines={3}>
                {activeDrill.title(tp)}
              </Text>
              {drillState.passed ? (
                <View style={styles.resultRow}>
                  <View style={styles.resultStat}>
                    <Text style={styles.resultStatLabel}>
                      {drillScoreLabel}
                    </Text>
                    <Text style={styles.resultStatValue}>
                      {drillState.score}
                    </Text>
                  </View>
                </View>
              ) : null}
              <View style={styles.resultActions}>
                <Pressable
                  onPress={() => sim.reset()}
                  accessibilityRole="button"
                  accessibilityLabel={tryAgainLabel}
                  style={({ pressed }) => [
                    styles.resultButton,
                    styles.resultButtonPrimary,
                    pressed && styles.resultButtonPressed,
                  ]}
                >
                  <Text style={styles.resultButtonTextPrimary}>
                    {tryAgainLabel}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        {mode === 'drill' ? (
          <View style={styles.pickerRow}>
            <Text style={styles.pickerLabel}>{drillSelectLabel}</Text>
            <View style={styles.pickerChips}>
              {DRILLS.map((d) => {
                const isActive = drillState?.drillId === d.id;
                return (
                <Pressable
                  key={d.id}
                  onPress={() => handlePickDrill(d.id)}
                  accessibilityRole="button"
                  accessibilityLabel={d.title(tp)}
                  accessibilityState={{ selected: isActive }}
                  style={({ pressed }) => [
                    styles.pickerChip,
                    isActive && styles.pickerChipActive,
                    pressed && styles.pickerChipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerChipText,
                      isActive && styles.pickerChipTextActive,
                    ]}
                  >
                    {d.title(tp)}
                  </Text>
                </Pressable>
              );
              })}
            </View>
          </View>
        ) : null}

        {mode === 'mission' ? (
          <View style={styles.pickerRow}>
            <Text style={styles.pickerLabel}>{missionSelectLabel}</Text>
            <View style={styles.pickerChips}>
              {MISSIONS.map((m) => {
                const isActive = missionState?.missionId === m.id;
                return (
                <Pressable
                  key={m.id}
                  onPress={() => handlePickMission(m.id)}
                  accessibilityRole="button"
                  accessibilityLabel={m.title(tp)}
                  accessibilityState={{ selected: isActive }}
                  style={({ pressed }) => [
                    styles.pickerChip,
                    isActive && styles.pickerChipActive,
                    pressed && styles.pickerChipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerChipText,
                      isActive && styles.pickerChipTextActive,
                    ]}
                  >
                    {m.title(tp)}
                  </Text>
                </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.hud}>
          <HudCell label={headingLabel} value={`${headingDeg}°`} />
          <HudCell label={speedLabel} value={speedDisplay} />
          <HudCell label={heelLabel} value={`${heelDeg}°`} muted={Math.abs(heelDeg) < 18} />
          <HudCell label={trimLabel} value={`${trimScore}`} color={trimColor} />
        </View>

        <View style={styles.trimPanel}>
          <View style={styles.trimHeader}>
            <Text style={styles.trimHeaderTitle}>
              {autoTrim ? autoLabel : manualLabel}
            </Text>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                sim.setAutoTrim(!autoTrim);
              }}
              accessibilityRole="switch"
              accessibilityLabel={autoLabel}
              accessibilityState={{ checked: autoTrim }}
              style={({ pressed }) => [
                styles.autoButton,
                autoTrim && styles.autoButtonActive,
                pressed && styles.autoButtonPressed,
              ]}
            >
              <Text
                style={[
                  styles.autoButtonText,
                  autoTrim && styles.autoButtonTextActive,
                ]}
              >
                {autoTrim ? 'ON' : 'OFF'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.sliderRow}>
            <Slider
              label={mainLabel}
              accessibilityLabel={`${mainLabel} ${tp('шкот', 'sheet', 'szot', { es: 'escota', fr: 'ecoute', de: 'Schot', it: 'scotta' })}`}
              value={mainSheet}
              onChange={sim.setMainSheet}
              orientation="vertical"
              step={0.1}
            />
            <Slider
              label={jibLabel}
              accessibilityLabel={`${jibLabel} ${tp('шкот', 'sheet', 'szot', { es: 'escota', fr: 'ecoute', de: 'Schot', it: 'scotta' })}`}
              value={jibSheet}
              onChange={sim.setJibSheet}
              orientation="vertical"
              step={0.1}
            />
            <Slider
              label={twistLabel}
              accessibilityLabel={twistLabel}
              value={twist}
              onChange={sim.setTwist}
              orientation="vertical"
              step={0.1}
            />
            <Slider
              label={reefLabel}
              accessibilityLabel={reefLabel}
              value={reef}
              onChange={sim.setReef}
              orientation="vertical"
              step={0.25}
            />
          </View>
        </View>

        <View style={styles.commentary}>
          <View style={[styles.commentaryDot, { backgroundColor: trimColor }]} />
          <Text variant="caption" style={styles.commentaryText}>
            {commentary}
          </Text>
        </View>

        <Text variant="caption" style={styles.note}>{note}</Text>
      </ScrollView>
    </Screen>
  );
}

function commentaryFor({
  mainStalled,
  jibStalled,
  heelDeg,
  twaDeg,
  trimScore,
  tp,
}: {
  mainStalled: boolean;
  jibStalled: boolean;
  heelDeg: number;
  twaDeg: number;
  trimScore: number;
  tp: ReturnType<typeof useI18n>['tp'];
}): string {
  if (Math.abs(twaDeg) < 30) {
    return tp(
      'No-go zone: яхта теряет тягу, увались от ветра.',
      'No-go zone: the sails lose drive, bear away from the wind.',
      'No-go zone: zagle traca ciag, odpadnij od wiatru.',
      {
        es: 'No-go zone: las velas pierden empuje, cae del viento.',
        fr: 'No-go zone: les voiles perdent la puissance, abats.',
        de: 'No-go zone: Segel verlieren Druck, falle ab.',
        it: 'No-go zone: le vele perdono spinta, poggia.',
      },
    );
  }
  if (mainStalled || jibStalled) {
    return tp(
      'Срыв потока: ослабь MAIN или JIB, пока скорость не вернется.',
      'Stall: ease MAIN or JIB until speed comes back.',
      'Stall: poluzuj MAIN albo JIB, az predkosc wroci.',
      {
        es: 'Stall: suelta MAIN o JIB hasta que vuelva la velocidad.',
        fr: 'Stall: choque MAIN ou JIB jusquau retour de vitesse.',
        de: 'Stall: MAIN oder JIB fieren, bis Tempo zurueckkommt.',
        it: 'Stall: lasca MAIN o JIB finche torna velocita.',
      },
    );
  }
  if (Math.abs(heelDeg) > 25) {
    return tp(
      'Крен высокий: поставь REEF или отпусти грот.',
      'Heel is high: add REEF or ease the main.',
      'Przechyl wysoki: dodaj REF albo poluzuj grot.',
      {
        es: 'Escora alta: mete RIZO o suelta la mayor.',
        fr: 'Gite forte: prends un RIS ou choque la GV.',
        de: 'Viel Kraengung: REFF setzen oder Gross fieren.',
        it: 'Sbandamento alto: prendi TERZAROLI o lasca randa.',
      },
    );
  }
  if (trimScore >= 78) {
    return tp(
      'Trim здоровый: оба паруса тянут вместе.',
      'Trim is healthy: both sails are pulling together.',
      'Trim dobry: oba zagle pracuja razem.',
      {
        es: 'Trim sano: ambas velas tiran juntas.',
        fr: 'Trim sain: les deux voiles tirent ensemble.',
        de: 'Trim gut: beide Segel ziehen zusammen.',
        it: 'Trim sano: entrambe le vele spingono insieme.',
      },
    );
  }
  return tp(
    'Поиграй MAIN/JIB: цель - высокий TRIM без лишнего крена.',
    'Work MAIN/JIB: aim for high TRIM without excess heel.',
    'Ustaw MAIN/JIB: cel to wysoki TRIM bez duzego przechylu.',
    {
      es: 'Ajusta MAIN/JIB: busca TRIM alto sin mucha escora.',
      fr: 'Regle MAIN/JIB: vise un TRIM haut sans trop de gite.',
      de: 'Arbeite mit MAIN/JIB: hoher TRIM, wenig Kraengung.',
      it: 'Regola MAIN/JIB: TRIM alto senza troppo sbandamento.',
    },
  );
}

function HudCell({
  label,
  value,
  muted = false,
  color,
}: {
  label: string;
  value: string;
  muted?: boolean;
  color?: string;
}) {
  return (
    <View style={styles.hudCell}>
      <Text variant="muted" style={styles.hudLabel}>{label}</Text>
      <Text
        style={[
          styles.hudValue,
          muted && styles.hudValueMuted,
          color ? { color } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function ModeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.modeChip,
        active && styles.modeChipActive,
        pressed && styles.modeChipPressed,
      ]}
    >
      <Text
        style={[styles.modeChipText, active && styles.modeChipTextActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ViewChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.viewChip,
        active && styles.viewChipActive,
        pressed && styles.viewChipPressed,
      ]}
    >
      <Text
        style={[styles.viewChipText, active && styles.viewChipTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function WindModeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.windModeChip,
        active && styles.windModeChipActive,
        pressed && styles.windModeChipPressed,
      ]}
    >
      <Text
        style={[styles.windModeChipText, active && styles.windModeChipTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function clampNum(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Opt-in "Live wind" control for the simulator.
 *
 * The synthetic wind controls (the steady / shift / gust wind-map mode and
 * the trim sliders) remain the default and stay fully usable - this is
 * purely additive. Tapping a preset spot fetches a single real wind
 * snapshot from the existing web `/api/weather` endpoint and SETS the
 * simulator's wind speed + direction via the callback. It never changes
 * physics or any default behavior, and on failure it does nothing harmful:
 * the wind is left exactly as it was and an inline retry is offered.
 *
 * No geolocation and no new permission/dependency: the venue is chosen
 * from a chip row (same preset list as the home WindNowCard).
 */
function LiveWindControl({
  onApply,
}: {
  /** Apply a fetched snapshot: speed already clamped to the sim range
   *  (knots), direction converted to radians for `setWindDir`. */
  onApply: (speedKts: number, dirRad: number) => void;
}) {
  const { tp } = useI18n();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [state, setState] = useState<LiveWindState>({ status: 'idle' });
  // Track the in-flight request's spot so a slow earlier response can't
  // overwrite a newer tap (last-tap-wins) or apply to the wrong spot.
  const requestKeyRef = useRef<string | null>(null);

  const load = useCallback(
    async (spot: LiveSpot) => {
      requestKeyRef.current = spot.key;
      setState({ status: 'loading', spotKey: spot.key });
      const res = await fetchWeatherNow(spot.lat, spot.lon);
      // Ignore a response the user has since superseded with another tap.
      if (requestKeyRef.current !== spot.key) return;
      if (res.ok && res.data) {
        const speedKts = clampWindSpeedKts(Math.round(res.data.wind.speedKn));
        const dirRad = (res.data.wind.dirDeg * Math.PI) / 180;
        onApply(speedKts, dirRad);
        setState({ status: 'ok', spotKey: spot.key, data: res.data });
      } else {
        // Failure path: leave the wind untouched, surface a retry CTA.
        setState({ status: 'error', spotKey: spot.key });
      }
    },
    [onApply],
  );

  const onSelect = useCallback(
    (spot: LiveSpot) => {
      Haptics.selectionAsync().catch(() => {});
      setSelectedKey(spot.key);
      void load(spot);
    },
    [load],
  );

  const selectedSpot =
    LIVE_SPOTS.find((s) => s.key === selectedKey) ?? null;

  const heading = tp('Живой ветер', 'Live wind', 'Wiatr na zywo', {
    es: 'Viento real',
    fr: 'Vent reel',
    de: 'Echter Wind',
    it: 'Vento reale',
  });
  const subtitle = tp(
    'По желанию: задать ветер по реальным данным.',
    'Optional: set the wind from real data.',
    'Opcjonalnie: ustaw wiatr z realnych danych.',
    {
      es: 'Opcional: ajusta el viento con datos reales.',
      fr: 'Optionnel: regle le vent avec des donnees reelles.',
      de: 'Optional: Wind aus echten Daten setzen.',
      it: 'Opzionale: imposta il vento da dati reali.',
    },
  );
  const fromWord = tp('с', 'from', 'z', {
    es: 'del',
    fr: 'de',
    de: 'aus',
    it: 'da',
  });
  const appliedWord = tp('задан', 'set', 'ustawiony', {
    es: 'aplicado',
    fr: 'applique',
    de: 'gesetzt',
    it: 'impostato',
  });
  const unitKn = tp('уз', 'kn', 'w', {
    es: 'kn',
    fr: 'nd',
    de: 'kn',
    it: 'kn',
  });
  const loadingLabel = tp('Загрузка...', 'Loading...', 'Ladowanie...', {
    es: 'Cargando...',
    fr: 'Chargement...',
    de: 'Laden...',
    it: 'Caricamento...',
  });
  const errorLabel = tp(
    'Не удалось загрузить ветер.',
    'Could not load wind.',
    'Nie udalo sie pobrac wiatru.',
    {
      es: 'No se pudo cargar el viento.',
      fr: 'Impossible de charger le vent.',
      de: 'Wind konnte nicht geladen werden.',
      it: 'Impossibile caricare il vento.',
    },
  );
  const retryLabel = tp('Повторить', 'Retry', 'Ponow', {
    es: 'Reintentar',
    fr: 'Reessayer',
    de: 'Erneut',
    it: 'Riprova',
  });
  const disclaimer = tp(
    'Для тренировки, не для навигации.',
    'For training, not for navigation.',
    'Do treningu, nie do nawigacji.',
    {
      es: 'Para entrenar, no para navegar.',
      fr: "Pour l'entrainement, pas pour la navigation.",
      de: 'Zum Training, nicht zur Navigation.',
      it: "Per l'allenamento, non per la navigazione.",
    },
  );

  return (
    <View style={styles.liveWind}>
      <View style={styles.liveWindHeaderRow}>
        <View style={styles.liveWindDot} />
        <Text style={styles.liveWindTitle}>{heading.toUpperCase()}</Text>
      </View>
      <Text variant="caption" style={styles.liveWindSubtitle}>
        {subtitle}
      </Text>

      <View style={styles.liveWindChips}>
        {LIVE_SPOTS.map((spot) => {
          const active = spot.key === selectedKey;
          return (
            <Pressable
              key={spot.key}
              onPress={() => onSelect(spot)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.liveWindChip,
                active && styles.liveWindChipActive,
                pressed && !active && styles.liveWindChipPressed,
              ]}
            >
              <Text
                style={[
                  styles.liveWindChipText,
                  active && styles.liveWindChipTextActive,
                ]}
                numberOfLines={1}
              >
                {spot.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {state.status === 'loading' ? (
        <View style={styles.liveWindStatusRow}>
          <ActivityIndicator color={colors.accentCyan} />
          <Text variant="caption" style={styles.liveWindStatusText}>
            {loadingLabel}
          </Text>
        </View>
      ) : null}

      {state.status === 'error' ? (
        <View style={styles.liveWindStatusRow}>
          <Text variant="caption" style={styles.liveWindError}>
            {errorLabel}
          </Text>
          {selectedSpot ? (
            <Pressable
              onPress={() => onSelect(selectedSpot)}
              accessibilityRole="button"
              accessibilityLabel={retryLabel}
              style={({ pressed }) => [
                styles.liveWindRetry,
                pressed && styles.liveWindRetryPressed,
              ]}
            >
              <Text style={styles.liveWindRetryText}>{retryLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {state.status === 'ok' && selectedSpot ? (
        <Text style={styles.liveWindReadout}>
          {`${selectedSpot.label}: ${fromWord} ${liveCardinal(
            state.data.wind.dirDeg,
          )} (${Math.round(state.data.wind.dirDeg)} deg), ${clampWindSpeedKts(
            Math.round(state.data.wind.speedKn),
          )} ${unitKn} ${appliedWord}`}
        </Text>
      ) : null}

      <Text variant="muted" style={styles.liveWindFooter}>
        {`${disclaimer} ${
          state.status === 'ok'
            ? state.data.attribution || LIVE_FALLBACK_ATTRIBUTION
            : LIVE_FALLBACK_ATTRIBUTION
        }`}
      </Text>
    </View>
  );
}

function SideProfileScene({
  width,
  height,
  twaDeg,
  awaDeg,
  heelDeg,
  leewayDeg,
  speedKn,
  mainSheet,
  jibSheet,
  twist,
  reef,
  windKts,
  windDisplayLabel,
  windMode,
  showSpinnaker,
  tickN,
  labels,
}: {
  width: number;
  height: number;
  twaDeg: number;
  awaDeg: number;
  heelDeg: number;
  leewayDeg: number;
  speedKn: number;
  mainSheet: number;
  jibSheet: number;
  twist: number;
  reef: number;
  /** Raw wind speed in knots; drives wave amplitude / particle visuals. */
  windKts: number;
  /** Pre-formatted wind label for the user, e.g. "12.0 kt" / "6.2 m/s" / "F4". */
  windDisplayLabel: string;
  windMode: WindMapMode;
  showSpinnaker: boolean;
  tickN: number;
  labels: SceneLabels;
}) {
  const waterY = height * 0.66;
  const cx = width * 0.48;
  const hullLen = Math.min(width * 0.78, 340);
  const sternX = cx - hullLen * 0.5;
  const bowX = cx + hullLen * 0.5;
  const mastX = cx + hullLen * 0.08;
  const mastTopY = waterY - Math.min(height * 0.47, 224) * (1 - reef * 0.18);
  const boomY = waterY - 38;
  const boomAngle = (8 + (1 - mainSheet) * 68) * (Math.PI / 180);
  const boomLen = hullLen * (0.33 + (1 - mainSheet) * 0.08);
  const boomEndX = mastX - Math.cos(boomAngle) * boomLen;
  const boomEndY = boomY + Math.sin(boomAngle) * 22;
  const mainBelly = (18 + twist * 22) * (1 - reef * 0.24);
  const jibClewX = mastX + hullLen * (0.1 + (1 - jibSheet) * 0.1);
  const jibClewY = boomY - 8 + twist * 8;
  const windPhase = (tickN % 90) / 90;
  const heelText = `${labels.heel} ${heelDeg}°`;
  const reefText = `${labels.reef} ${Math.round(reef * 100)}%`;
  const twistText = `${labels.twist} ${Math.round(twist * 100)}%`;
  const windText =
    windMode === 'gust'
      ? `${labels.gust} ${windDisplayLabel}`
      : windMode === 'shift'
      ? labels.shift
      : `${labels.trueWind} ${windDisplayLabel}`;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <SvgLinearGradient id="sideSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0a2040" />
          <Stop offset="0.62" stopColor="#123355" />
          <Stop offset="0.63" stopColor="#092139" />
          <Stop offset="1" stopColor="#061428" />
        </SvgLinearGradient>
        <SvgLinearGradient id="sideHull" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#f8fbff" />
          <Stop offset="1" stopColor="#8ba7b8" />
        </SvgLinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#sideSky)" />
      {windMode === 'gust' ? (
        <Rect
          x={width * (0.1 + windPhase * 0.7)}
          y={0}
          width={width * 0.18}
          height={height}
          fill="rgba(68, 255, 136, 0.12)"
        />
      ) : null}
      {Array.from({ length: 6 }).map((_, i) => {
        // Animated swell: each line bobs and its crest pulses at its own phase,
        // so the sea surface rolls instead of sitting as static curves.
        const baseY = waterY + 10 + i * 15;
        const ph = windPhase * Math.PI * 2 + i * 0.8;
        const amp = 2.5 + Math.min(6, windKts / 4);
        const y = baseY + Math.sin(ph) * 1.8;
        const bump = amp * (0.55 + 0.45 * Math.sin(ph + 0.6));
        return (
          <SvgPath
            key={i}
            d={`M -10 ${y} Q ${width * 0.26} ${y - bump} ${width * 0.5} ${y} T ${width + 10} ${y}`}
            fill="none"
            stroke="rgba(130, 200, 255, 0.18)"
            strokeWidth={1}
          />
        );
      })}
      <G opacity={windMode === 'shift' ? 0.58 : 0.36}>
        {Array.from({ length: 7 }).map((_, i) => {
          const x = 28 + i * (width / 6.5);
          const drift = windMode === 'shift' ? Math.sin(windPhase * Math.PI * 2 + i) * 13 : 0;
          return (
            <Line
              key={i}
              x1={x + drift}
              y1={38}
              x2={x + drift + 20}
              y2={84}
              stroke={colors.windColor}
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}
      </G>
      <SvgText x={14} y={28} fill={colors.textSecondary} fontSize={10} fontWeight="800">
        {windText.toUpperCase()}
      </SvgText>
      <G>
        <SvgPath
          d={`M ${sternX} ${waterY - 10} Q ${cx - 38} ${waterY - 34} ${bowX - 6} ${waterY - 26} Q ${bowX + 8} ${waterY - 16} ${bowX - 6} ${waterY - 4} Q ${cx - 12} ${waterY + 18} ${sternX + 12} ${waterY + 8} Z`}
          fill="url(#sideHull)"
          stroke="rgba(232, 244, 248, 0.75)"
          strokeWidth={1.5}
        />
        <SvgPath
          d={`M ${cx - 34} ${waterY + 7} Q ${cx - 12} ${waterY + 70} ${cx + 8} ${waterY + 8} Z`}
          fill="rgba(5, 11, 24, 0.78)"
          stroke="rgba(0, 212, 255, 0.34)"
          strokeWidth={1}
        />
        <SvgPath
          d={`M ${sternX + 34} ${waterY + 4} Q ${sternX + 44} ${waterY + 42} ${sternX + 20} ${waterY + 48} Q ${sternX + 24} ${waterY + 20} ${sternX + 34} ${waterY + 4} Z`}
          fill="rgba(5, 11, 24, 0.78)"
          stroke="rgba(0, 212, 255, 0.28)"
          strokeWidth={1}
        />
        <Line x1={mastX} y1={mastTopY} x2={mastX} y2={waterY - 12} stroke="#e8f4f8" strokeWidth={3} />
        <Line x1={mastX} y1={mastTopY} x2={bowX - 10} y2={waterY - 22} stroke="rgba(232,244,248,0.6)" strokeWidth={1} />
        <Line x1={mastX} y1={mastTopY} x2={sternX + 8} y2={waterY - 8} stroke="rgba(232,244,248,0.45)" strokeWidth={1} />
        <SvgPath
          d={`M ${mastX} ${mastTopY} L ${mastX} ${boomY} Q ${boomEndX - mainBelly} ${(mastTopY + boomEndY) / 2} ${boomEndX} ${boomEndY} Z`}
          fill={showSpinnaker ? 'rgba(255,250,238,0.82)' : 'rgba(255,250,238,0.96)'}
          stroke="rgba(232,244,248,0.9)"
          strokeWidth={1.3}
        />
        {[0.35, 0.55, 0.75].map((t) => (
          <Line
            key={t}
            x1={mastX}
            y1={mastTopY + (boomY - mastTopY) * t}
            x2={mastX + (boomEndX - mastX) * 0.54}
            y2={mastTopY + (boomEndY - mastTopY) * t}
            stroke="rgba(10,22,40,0.34)"
            strokeWidth={1}
          />
        ))}
        <Line x1={mastX} y1={boomY} x2={boomEndX} y2={boomEndY} stroke="rgba(232,244,248,0.78)" strokeWidth={3} strokeLinecap="round" />
        <SvgPath
          d={`M ${mastX} ${mastTopY} L ${bowX - 10} ${waterY - 22} Q ${jibClewX + 28} ${jibClewY - 20} ${jibClewX} ${jibClewY} Z`}
          fill="rgba(234,243,251,0.92)"
          stroke="rgba(232,244,248,0.86)"
          strokeWidth={1.1}
        />
        {showSpinnaker ? (
          <SvgPath
            d={`M ${mastX + 8} ${mastTopY + 26} C ${bowX + 70} ${mastTopY + 72} ${bowX + 76} ${waterY - 80} ${bowX - 2} ${waterY - 36} C ${bowX + 8} ${waterY - 66} ${mastX + 24} ${waterY - 110} ${mastX + 8} ${mastTopY + 26} Z`}
            fill="rgba(0, 212, 255, 0.38)"
            stroke="rgba(0, 229, 255, 0.82)"
            strokeWidth={1.4}
          />
        ) : null}
      </G>
      <Line x1={cx} y1={waterY - 86} x2={cx + 86 + speedKn * 5} y2={waterY - 86} stroke={colors.success} strokeWidth={3} strokeLinecap="round" />
      <Polygon points={`${cx + 92 + speedKn * 5},${waterY - 86} ${cx + 78 + speedKn * 5},${waterY - 92} ${cx + 78 + speedKn * 5},${waterY - 80}`} fill={colors.success} />
      <SvgText x={cx + 8} y={waterY - 94} fill={colors.success} fontSize={10} fontWeight="800">
        {labels.drive.toUpperCase()}
      </SvgText>
      {Math.abs(leewayDeg) > 1 ? (
        <G>
          <Line
            x1={cx}
            y1={waterY + 56}
            x2={cx + Math.sin((leewayDeg * Math.PI) / 180) * 70}
            y2={waterY + 56 + Math.cos((leewayDeg * Math.PI) / 180) * 36}
            stroke={colors.warning}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Line
            x1={cx}
            y1={waterY + 56}
            x2={cx}
            y2={waterY + 92}
            stroke="rgba(232,244,248,0.46)"
            strokeWidth={1}
            strokeLinecap="round"
          />
          <SvgText
            x={cx + 12}
            y={waterY + 88}
            fill={colors.warning}
            fontSize={10}
            fontWeight="800"
          >
            {`${labels.leeway.toUpperCase()} ${Math.abs(Math.round(leewayDeg))}°`}
          </SvgText>
        </G>
      ) : null}
      <SvgText x={14} y={height - 44} fill={colors.textPrimary} fontSize={11} fontWeight="800">
        {`TWA ${Math.abs(twaDeg)}°  ${labels.apparentWind.toUpperCase()} ${Math.abs(awaDeg)}°`}
      </SvgText>
      <SvgText x={14} y={height - 24} fill={Math.abs(heelDeg) > 24 ? colors.warning : colors.textSecondary} fontSize={11} fontWeight="800">
        {`${heelText.toUpperCase()}  ${reefText.toUpperCase()}  ${twistText.toUpperCase()}`}
      </SvgText>
    </Svg>
  );
}

function RearScene({
  width,
  height,
  twaDeg,
  awaDeg,
  heelDeg,
  leewayDeg,
  trimScore,
  mainSheet,
  jibSheet,
  reef,
  windDisplayLabel,
  windMode,
  showSpinnaker,
  tickN,
  labels,
}: {
  width: number;
  height: number;
  twaDeg: number;
  awaDeg: number;
  heelDeg: number;
  leewayDeg: number;
  trimScore: number;
  mainSheet: number;
  jibSheet: number;
  reef: number;
  /** Pre-formatted wind label, e.g. "12.0 kt" / "6.2 m/s" / "F4". */
  windDisplayLabel: string;
  windMode: WindMapMode;
  showSpinnaker: boolean;
  tickN: number;
  labels: SceneLabels;
}) {
  const cx = width / 2;
  const baseY = height * 0.64;
  const mastH = Math.min(height * 0.48, 220) * (1 - reef * 0.2);
  const heel = clampNum(heelDeg, -32, 32);
  const sailSide = twaDeg >= 0 ? -1 : 1;
  const mainSpread = 34 + (1 - mainSheet) * 54;
  const jibSpread = 24 + (1 - jibSheet) * 42;
  const gustX = width * (0.18 + ((tickN % 150) / 150) * 0.62);
  const sideArrowLen = 44 + Math.min(46, Math.abs(heelDeg) * 1.4);
  const trimColor = scoreColor(trimScore);
  const windText =
    windMode === 'gust'
      ? `${labels.gust} ${windDisplayLabel}`
      : windMode === 'shift'
      ? labels.shift
      : `${labels.trueWind} ${windDisplayLabel}`;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <SvgLinearGradient id="rearBg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#09203d" />
          <Stop offset="1" stopColor="#061428" />
        </SvgLinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#rearBg)" />
      {windMode === 'gust' ? (
        <Rect x={gustX} y={0} width={width * 0.2} height={height} fill="rgba(68,255,136,0.12)" />
      ) : null}
      <Line x1={0} y1={baseY} x2={width} y2={baseY} stroke="rgba(0,212,255,0.22)" strokeWidth={1} />
      {Array.from({ length: 5 }).map((_, i) => {
        // Animated swell below the waterline so the rear view reads as moving sea.
        const ph = ((tickN % 90) / 90) * Math.PI * 2 + i * 0.9;
        const wy = baseY + 12 + i * 16 + Math.sin(ph) * 1.6;
        const bump = 2.2 * (0.5 + 0.5 * Math.sin(ph + 0.5));
        return (
          <SvgPath
            key={`w${i}`}
            d={`M -10 ${wy} Q ${width * 0.27} ${wy - bump} ${width * 0.5} ${wy} T ${width + 10} ${wy}`}
            fill="none"
            stroke="rgba(130, 200, 255, 0.16)"
            strokeWidth={1}
          />
        );
      })}
      <G opacity={windMode === 'shift' ? 0.62 : 0.34}>
        {Array.from({ length: 6 }).map((_, i) => {
          const x = 35 + i * (width / 5.8);
          const nudge = windMode === 'shift' ? Math.sin(tickN / 24 + i) * 14 : 0;
          return (
            <Line
              key={i}
              x1={x + nudge}
              y1={34}
              x2={x + nudge + sailSide * 22}
              y2={82}
              stroke={colors.windColor}
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}
      </G>
      <SvgText x={14} y={28} fill={colors.textSecondary} fontSize={10} fontWeight="800">
        {windText.toUpperCase()}
      </SvgText>
      <G transform={`translate(${cx} ${baseY}) rotate(${heel * 0.7})`}>
        <Ellipse cx={0} cy={16} rx={58} ry={18} fill="rgba(0,0,0,0.32)" />
        <SvgPath
          d="M -72 -6 Q -44 -30 0 -34 Q 44 -30 72 -6 L 48 26 Q 0 42 -48 26 Z"
          fill="#f4f8fb"
          stroke="rgba(232,244,248,0.78)"
          strokeWidth={1.4}
        />
        <SvgPath
          d="M -40 0 Q 0 18 40 0 Q 18 22 -18 22 Z"
          fill="rgba(10,22,40,0.48)"
        />
        <Line x1={0} y1={-mastH} x2={0} y2={-18} stroke="#e8f4f8" strokeWidth={4} strokeLinecap="round" />
        <SvgPath
          d={`M 0 ${-mastH} L 0 -34 Q ${sailSide * mainSpread} ${-mastH * 0.46} ${sailSide * (mainSpread * 0.72)} 14 Z`}
          fill={showSpinnaker ? 'rgba(255,250,238,0.78)' : 'rgba(255,250,238,0.96)'}
          stroke="rgba(232,244,248,0.9)"
          strokeWidth={1.2}
        />
        <SvgPath
          d={`M 0 ${-mastH * 0.88} L ${sailSide * jibSpread} -8 Q ${sailSide * (jibSpread * 1.34)} ${-mastH * 0.42} 0 ${-mastH * 0.88} Z`}
          fill="rgba(234,243,251,0.9)"
          stroke="rgba(232,244,248,0.82)"
          strokeWidth={1}
        />
        {showSpinnaker ? (
          <SvgPath
            d={`M 0 ${-mastH * 0.9} C ${-sailSide * 98} ${-mastH * 0.72} ${-sailSide * 106} ${-mastH * 0.18} ${-sailSide * 26} -4 C ${-sailSide * 56} ${-mastH * 0.36} ${-sailSide * 38} ${-mastH * 0.68} 0 ${-mastH * 0.9} Z`}
            fill="rgba(0,212,255,0.42)"
            stroke="rgba(0,229,255,0.84)"
            strokeWidth={1.3}
          />
        ) : null}
      </G>
      <Line
        x1={cx}
        y1={baseY + 66}
        x2={cx + sailSide * sideArrowLen}
        y2={baseY + 66}
        stroke={colors.warning}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Polygon
        points={`${cx + sailSide * (sideArrowLen + 8)},${baseY + 66} ${cx + sailSide * (sideArrowLen - 6)},${baseY + 59} ${cx + sailSide * (sideArrowLen - 6)},${baseY + 73}`}
        fill={colors.warning}
      />
      {Math.abs(leewayDeg) > 1 ? (
        <G>
          <Line
            x1={cx}
            y1={baseY + 92}
            x2={cx + Math.sin((leewayDeg * Math.PI) / 180) * (38 + Math.abs(leewayDeg) * 3)}
            y2={baseY + 92}
            stroke={colors.danger}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.85}
          />
          <Line
            x1={cx - 8}
            y1={baseY + 92}
            x2={cx + 8}
            y2={baseY + 92}
            stroke="rgba(232,244,248,0.40)"
            strokeWidth={1}
          />
          <SvgText
            x={cx + (leewayDeg >= 0 ? 22 : -78)}
            y={baseY + 108}
            fill={colors.danger}
            fontSize={9}
            fontWeight="800"
          >
            {`${labels.leeway.toUpperCase()} ${Math.abs(Math.round(leewayDeg))}°`}
          </SvgText>
        </G>
      ) : null}
      <SvgText x={14} y={height - 45} fill={colors.textPrimary} fontSize={11} fontWeight="800">
        {`${labels.apparentWind.toUpperCase()} ${Math.abs(awaDeg)}°  ${labels.heel.toUpperCase()} ${heelDeg}°`}
      </SvgText>
      <SvgText x={14} y={height - 25} fill={Math.abs(heelDeg) > 24 ? colors.warning : colors.textSecondary} fontSize={11} fontWeight="800">
        {`${labels.sideForce.toUpperCase()}  TRIM ${trimScore}`}
      </SvgText>
      <SvgCircle cx={width - 24} cy={height - 28} r={8} fill={trimColor} />
    </Svg>
  );
}

function SailBadge({
  state,
  label,
  left,
  top,
}: {
  state: SailState;
  label: string;
  left: number;
  top: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const visible = state !== 'idle';
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);
  const bg = sailStateColor(state);
  return (
    <Animated.View
      pointerEvents="none"
      accessible={visible}
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[
        styles.sailBadge,
        {
          left,
          top,
          opacity,
          borderColor: bg,
          backgroundColor: 'rgba(10, 22, 40, 0.78)',
        },
      ]}
    >
      <View style={[styles.sailBadgeDot, { backgroundColor: bg }]} />
      <Text allowFontScaling={false} style={[styles.sailBadgeText, { color: bg }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerSpacer: {
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderColor: 'rgba(0, 212, 255, 0.36)',
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentCyan,
    marginRight: 7,
  },
  badgeText: {
    color: colors.accentCyan,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  resetButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    minHeight: 44,
    borderRadius: radii.sm,
    borderColor: 'rgba(232, 244, 248, 0.20)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetPressed: {
    backgroundColor: colors.bgCard,
    borderColor: 'rgba(232, 244, 248, 0.40)',
  },
  resetText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  canvasWrap: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderColor: 'rgba(0, 212, 255, 0.16)',
    borderWidth: 1,
    alignSelf: 'center',
    position: 'relative',
    ...shadow.card,
  },
  windSpeedButton: {
    position: 'absolute',
    right: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(15, 32, 53, 0.90)',
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
    alignItems: 'flex-end',
    minWidth: 62,
  },
  windSpeedValue: {
    color: colors.windColor,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    lineHeight: 17,
  },
  windSpeedLabel: {
    color: colors.textMuted,
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: '800',
    marginTop: 1,
  },
  windSpeedTwd: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  cockpitPill: {
    color: colors.textPrimary,
    backgroundColor: 'rgba(8, 18, 32, 0.9)',
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
    borderRadius: radii.sm,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sceneReadout: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    alignItems: 'flex-start',
    gap: 5,
  },
  sceneReadoutRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  sceneReadoutPos: {
    color: colors.accentCyan,
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
    borderRadius: radii.sm,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sceneReadoutText: {
    color: colors.textSecondary,
    backgroundColor: 'rgba(15, 32, 53, 0.78)',
    borderColor: 'rgba(232, 244, 248, 0.10)',
    borderWidth: 1,
    borderRadius: radii.sm,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  mapLegend: {
    position: 'absolute',
    left: 10,
    top: 10,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(15, 32, 53, 0.72)',
    borderColor: 'rgba(232, 244, 248, 0.10)',
    borderWidth: 1,
  },
  mapLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapLegendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mapLegendText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0,
  },
  hud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  hudCell: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 74,
    backgroundColor: 'rgba(21, 37, 64, 0.72)',
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  hudLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  hudValue: {
    color: colors.accentCyan,
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  hudValueMuted: {
    color: colors.textSecondary,
  },
  trimPanel: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(21, 37, 64, 0.70)',
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  trimHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  trimHeaderTitle: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  autoButton: {
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 212, 255, 0.04)',
  },
  autoButtonActive: {
    backgroundColor: colors.surfaceCyanSoft,
    borderColor: colors.borderCyanStrong,
  },
  autoButtonPressed: {
    opacity: 0.82,
  },
  autoButtonText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  autoButtonTextActive: {
    color: colors.accentCyan,
  },
  sliderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  modeBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 32, 53, 0.78)',
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
    borderRadius: radii.pill,
    padding: 3,
    marginBottom: spacing.sm,
    alignSelf: 'center',
    gap: 2,
  },
  modeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    minWidth: 76,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipActive: {
    backgroundColor: colors.surfaceCyanSoft,
  },
  modeChipPressed: {
    opacity: 0.78,
  },
  modeChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modeChipTextActive: {
    color: colors.accentCyan,
  },
  viewBar: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  viewChip: {
    minWidth: 82,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(15, 32, 53, 0.62)',
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewChipActive: {
    backgroundColor: 'rgba(232, 244, 248, 0.10)',
    borderColor: 'rgba(232, 244, 248, 0.32)',
  },
  viewChipPressed: {
    opacity: 0.78,
  },
  viewChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
  },
  viewChipTextActive: {
    color: colors.textPrimary,
  },
  windModeBar: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  windModeChip: {
    minWidth: 76,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(15, 32, 53, 0.46)',
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  windModeChipActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.10)',
    borderColor: colors.borderCyanSoft,
  },
  windModeChipPressed: {
    opacity: 0.78,
  },
  windModeChipText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0,
  },
  windModeChipTextActive: {
    color: colors.windColor,
  },
  liveWind: {
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(15, 32, 53, 0.62)',
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  liveWindHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liveWindDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.windColor,
  },
  liveWindTitle: {
    color: colors.windColor,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  liveWindSubtitle: {
    color: colors.textMuted,
    marginTop: 1,
  },
  liveWindChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  liveWindChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(15, 32, 53, 0.46)',
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
  },
  liveWindChipActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.10)',
    borderColor: colors.borderCyanSoft,
  },
  liveWindChipPressed: {
    opacity: 0.78,
  },
  liveWindChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  liveWindChipTextActive: {
    color: colors.windColor,
  },
  liveWindStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  liveWindStatusText: {
    color: colors.textSecondary,
  },
  liveWindError: {
    color: colors.warning,
  },
  liveWindRetry: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.sm,
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
    backgroundColor: colors.bgCard,
  },
  liveWindRetryPressed: {
    backgroundColor: colors.bgCardHover,
  },
  liveWindRetryText: {
    color: colors.accentCyan,
    fontSize: 12,
    fontWeight: '700',
  },
  liveWindReadout: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  liveWindFooter: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  missionHud: {
    backgroundColor: 'rgba(21, 37, 64, 0.74)',
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 4,
  },
  missionHudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  missionHudKicker: {
    color: colors.accentCyan,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  missionHudClock: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  missionHudTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  missionHudHint: {
    color: colors.textSecondary,
    marginTop: 1,
  },
  missionHudMeta: {
    marginTop: spacing.xs,
    gap: 4,
  },
  missionHudMetaLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  missionHudMetaValue: {
    color: colors.accentCyan,
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  drillBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(232, 244, 248, 0.10)',
    overflow: 'hidden',
  },
  drillBarFill: {
    height: 6,
    borderRadius: 3,
  },
  pickerRow: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(15, 32, 53, 0.62)',
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  pickerLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  pickerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pickerChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    minHeight: 44,
    borderRadius: radii.sm,
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
    backgroundColor: 'rgba(10, 22, 40, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerChipActive: {
    borderColor: colors.borderCyanStrong,
    backgroundColor: colors.surfaceCyanSoft,
  },
  pickerChipPressed: {
    opacity: 0.82,
  },
  pickerChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  pickerChipTextActive: {
    color: colors.accentCyan,
  },
  sailBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    minWidth: 56,
  },
  sailBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  sailBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  resultPanel: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: '22%',
    backgroundColor: 'rgba(15, 32, 53, 0.96)',
    borderColor: colors.borderCyanStrong,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.lift,
  },
  resultKicker: {
    color: colors.accentCyan,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  resultKickerFail: {
    color: colors.warning,
  },
  resultTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  resultRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  resultStat: {
    flex: 1,
    backgroundColor: 'rgba(10, 22, 40, 0.66)',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  resultStatLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  resultStatValue: {
    color: colors.accentCyan,
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  resultActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  resultButton: {
    flex: 1,
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  resultButtonPrimary: {
    backgroundColor: colors.surfaceCyanSoft,
    borderColor: colors.borderCyanStrong,
  },
  resultButtonPressed: {
    opacity: 0.82,
  },
  resultButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  resultButtonTextPrimary: {
    color: colors.accentCyan,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  commentary: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(10, 22, 40, 0.74)',
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  commentaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    marginRight: spacing.sm,
  },
  commentaryText: {
    flex: 1,
    color: colors.textPrimary,
    lineHeight: 19,
  },
  note: {
    marginTop: spacing.md,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
