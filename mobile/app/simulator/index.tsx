import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef } from 'react';
import {
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
  Group,
  Path,
  Skia,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useI18n } from '../../src/i18n/context';
import { Screen, Slider, SkiaYacht, Text } from '../../src/design-system/components';
import { useSimLoop } from '../../src/simulator/use-sim-loop';
import type { TrailPoint } from '../../src/simulator/use-sim-loop';
import {
  buildArrowGrid,
  buildWindArrowsPath,
  buildNoGoPath,
  buildApparentArrowPath,
  buildCompassArrowPath,
} from '../../src/simulator/skia-wind';
import { DRILLS, MISSIONS, type SimMode } from '../../src/simulator/missions';
import type { SailState } from '../../src/simulator/sail-feedback';
import { colors, radii, shadow, spacing } from '../../src/design-system/tokens';

const COMPASS_R = 34;
const SNAP_DEG = 15;
const SNAP_RAD = (SNAP_DEG * Math.PI) / 180;

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

function buildWavePath(width: number, height: number, tickN: number) {
  const p = Skia.Path.Make();
  const phase = (tickN % 90) / 90;
  for (let y = 34; y < height; y += 42) {
    let first = true;
    for (let x = -20; x <= width + 20; x += 24) {
      const yy = y + Math.sin(x / 28 + phase * Math.PI * 2) * 4;
      if (first) {
        p.moveTo(x, yy);
        first = false;
      } else {
        p.lineTo(x, yy);
      }
    }
  }
  return p;
}

function buildCoursePath(width: number, height: number) {
  const p = Skia.Path.Make();
  const x = width / 2;
  p.moveTo(x - 8, height - 34);
  p.lineTo(x - 64, height * 0.68);
  p.lineTo(x + 54, height * 0.47);
  p.lineTo(x - 32, height * 0.28);
  p.lineTo(x, 54);
  return p;
}

function sailStateColor(state: SailState): string {
  switch (state) {
    case 'luff': return colors.danger;
    case 'stall': return colors.warning;
    case 'overtrim': return '#f5e26b';
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
  const { tp } = useI18n();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const sceneW = Math.min(Math.max(windowWidth - spacing.lg * 2, 320), 440);
  const sceneH = Math.min(Math.max(windowHeight * 0.43, 320), 500);
  const centerX = sceneW / 2;
  const centerY = sceneH / 2;
  const compassCx = sceneW - COMPASS_R - 18;
  const compassCy = COMPASS_R + 18;
  const sim = useSimLoop({ bounds: { width: sceneW, height: sceneH } });

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
          sim.setWindDir(snapToStep(Math.atan2(dx, -dy), SNAP_RAD));
        })
        .onChange((e) => {
          if (!insideCompassAt(e.x, e.y, compassCx, compassCy)) return;
          const dx = e.x - compassCx;
          const dy = e.y - compassCy;
          sim.setWindDir(snapToStep(Math.atan2(dx, -dy), SNAP_RAD));
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compassCx, compassCy],
  );

  const composedGesture = useMemo(
    () => Gesture.Simultaneous(windDrag, steer),
    [windDrag, steer],
  );

  const arrowGrid = useMemo(
    () => buildArrowGrid(sceneW, sceneH, 58),
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
  const coursePath = useMemo(
    () => buildCoursePath(sceneW, sceneH),
    [sceneW, sceneH],
  );
  const trailPath = useMemo(
    () => buildTrailPath(sim.trail, sceneW, sceneH),
    [sim.trail, sim.tickN, sceneW, sceneH],
  );

  const noGoPath = useMemo(() => {
    const awaScreenRad =
      sim.boat.heading + (sim.boatExt.awaDeg * Math.PI) / 180;
    return buildNoGoPath(sim.boat.x, sim.boat.y, awaScreenRad, 112);
  }, [sim.boat.x, sim.boat.y, sim.boat.heading, sim.boatExt.awaDeg, sim.tickN]);

  const apparentArrowPath = useMemo(() => {
    const awaScreenRad =
      sim.boat.heading + (sim.boatExt.awaDeg * Math.PI) / 180;
    const bowX = sim.boat.x + Math.sin(sim.boat.heading) * 36;
    const bowY = sim.boat.y - Math.cos(sim.boat.heading) * 36;
    return buildApparentArrowPath(bowX, bowY, awaScreenRad);
  }, [sim.boat.x, sim.boat.y, sim.boat.heading, sim.boatExt.awaDeg, sim.tickN]);

  const autoTrim = sim.controls.autoTrim !== false;
  const mainSheet = sim.controls.mainSheet ?? 0.5;
  const jibSheet = sim.controls.jibSheet ?? 0.4;
  const twist = sim.controls.twist ?? 0.15;
  const reef = sim.controls.reef ?? 0;

  const compassArrowPath = useMemo(() => buildCompassArrowPath(), []);

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
  const speedLabel = tp('УЗЛЫ', 'SPEED', 'WEZLY', {
    es: 'NUDOS',
    fr: 'NOEUDS',
    de: 'KNOTEN',
    it: 'NODI',
  });
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
  const speedKn = sim.boatExt.boatSpeedKn.toFixed(1);
  const heelDeg = Math.round(sim.boatExt.heelDeg);
  const twaDeg = Math.round(sim.boatExt.twaDeg);
  const awaDeg = Math.round(sim.boatExt.awaDeg);
  const vmgKn = sim.boatExt.vmgKn.toFixed(1);
  const windKts = Math.round(sim.wind.trueWindSpeedKts);
  const trimScore = sim.boatExt.trimScore;
  const trimColor = scoreColor(trimScore);
  const boatLength = sceneW < 360 ? 30 : 36;
  const heelOffset = Math.max(-8, Math.min(8, sim.boatExt.heelDeg / 4));
  const showSpinnaker = sim.boatExt.sailSet === 'spinnaker';
  const commentary = commentaryFor({
    mainStalled: sim.boatExt.mainStalled,
    jibStalled: sim.boatExt.jibStalled,
    heelDeg,
    twaDeg,
    trimScore,
    tp,
  });

  const mode: SimMode = sim.mode;
  const drillState = sim.drill;
  const missionState = sim.mission;
  const activeDrill = drillState
    ? DRILLS.find((d) => d.id === drillState.drillId)
    : undefined;
  const activeMission = missionState
    ? MISSIONS.find((m) => m.id === missionState.missionId)
    : undefined;

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
          <GestureDetector gesture={composedGesture}>
            <Canvas style={{ width: sceneW, height: sceneH }}>
              <Group>
                <Path
                  path={wavePath}
                  color="rgba(232, 244, 248, 0.10)"
                  style="stroke"
                  strokeWidth={1}
                  strokeCap="round"
                />
                <Path
                  path={windArrowsPath}
                  color={colors.windColor}
                  style="stroke"
                  strokeWidth={1}
                  strokeCap="round"
                  opacity={0.34}
                />
                {mode === 'free' ? (
                  <>
                    <Path
                      path={coursePath}
                      color="rgba(68, 255, 136, 0.55)"
                      style="stroke"
                      strokeWidth={1.5}
                      strokeCap="round"
                      opacity={0.7}
                    />
                    <Circle cx={centerX} cy={54} r={8} color={colors.warning} />
                    <Circle cx={centerX - 8} cy={sceneH - 34} r={7} color={colors.warning} />
                    <Circle cx={centerX + 30} cy={sceneH - 34} r={7} color={colors.warning} />
                  </>
                ) : null}
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
                  color={colors.accentCyan}
                  style="stroke"
                  strokeWidth={2}
                  strokeCap="round"
                  strokeJoin="round"
                  opacity={0.45}
                />

                <Path
                  path={noGoPath}
                  color={colors.danger}
                  style="fill"
                  opacity={0.13}
                />
                <Path
                  path={noGoPath}
                  color={colors.danger}
                  style="stroke"
                  strokeWidth={1}
                  opacity={0.38}
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
                  sailSet={sim.boatExt.sailSet}
                  luffMain={sim.sailFeedback.main === 'luff'}
                  luffJib={sim.sailFeedback.jib === 'luff'}
                  length={boatLength}
                  heelOffsetPx={heelOffset}
                  tickN={sim.tickN}
                />

                <Group
                  transform={[
                    { translateX: compassCx },
                    { translateY: compassCy },
                  ]}
                >
                  <Circle
                    cx={0}
                    cy={0}
                    r={COMPASS_R}
                    color="rgba(15, 32, 53, 0.92)"
                  />
                  <Circle
                    cx={0}
                    cy={0}
                    r={COMPASS_R}
                    color={colors.windColor}
                    style="stroke"
                    strokeWidth={1.2}
                    opacity={0.6}
                  />
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

          <Pressable
            style={[styles.windSpeedButton, { top: compassCy + COMPASS_R + 8 }]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              sim.cycleWindSpeed();
            }}
            accessibilityRole="button"
            accessibilityLabel={`${tp('Ветер', 'Wind', 'Wiatr', { es: 'Viento', fr: 'Vent', de: 'Wind', it: 'Vento' })}: ${windKts} kt, ${twdDeg}°`}
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
            <Text allowFontScaling={false} style={styles.windSpeedValue}>{`${windKts} kt`}</Text>
            <Text allowFontScaling={false} style={styles.windSpeedLabel}>TWD</Text>
            <Text allowFontScaling={false} style={styles.windSpeedTwd}>{`${twdDeg}°`}</Text>
          </Pressable>

          <View style={styles.sceneReadout}>
            <Text allowFontScaling={false} style={styles.sceneReadoutText}>{`TWA ${twaDeg}°`}</Text>
            <Text allowFontScaling={false} style={styles.sceneReadoutText}>{`AWA ${awaDeg}°`}</Text>
            <Text allowFontScaling={false} style={styles.sceneReadoutText}>{`VMG ${vmgKn}`}</Text>
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
              <Text style={styles.resultKicker}>{drillDoneLabel}</Text>
              <Text style={styles.resultTitle} numberOfLines={3}>
                {activeDrill.title(tp)}
              </Text>
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
          <HudCell label={speedLabel} value={speedKn} />
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
    borderRadius: radii.sm,
    borderColor: 'rgba(232, 244, 248, 0.20)',
    borderWidth: 1,
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
  sceneReadout: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    maxWidth: 240,
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
    alignItems: 'center',
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
    borderRadius: radii.sm,
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
    backgroundColor: 'rgba(10, 22, 40, 0.62)',
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
