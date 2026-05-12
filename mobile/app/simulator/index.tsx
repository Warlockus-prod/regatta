import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import {
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
import { Screen, Text } from '../../src/design-system/components';
import { useSimLoop } from '../../src/simulator/use-sim-loop';
import type { TrailPoint } from '../../src/simulator/use-sim-loop';
import {
  buildArrowGrid,
  buildWindArrowsPath,
  buildNoGoPath,
  buildApparentArrowPath,
  buildCompassArrowPath,
} from '../../src/simulator/skia-wind';
import { colors, radii, shadow, spacing } from '../../src/design-system/tokens';

const COMPASS_R = 34;
const SNAP_DEG = 15;
const SNAP_RAD = (SNAP_DEG * Math.PI) / 180;
const DEG_TO_RAD = Math.PI / 180;

function snapToStep(rad: number, step: number): number {
  return Math.round(rad / step) * step;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function pct(value: number): string {
  return `${Math.round(clamp01(value) * 100)}%`;
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

function buildHullPath() {
  const p = Skia.Path.Make();
  p.moveTo(0, -54);
  p.lineTo(11, -38);
  p.lineTo(15, 10);
  p.lineTo(11, 48);
  p.lineTo(0, 58);
  p.lineTo(-11, 48);
  p.lineTo(-15, 10);
  p.lineTo(-11, -38);
  p.close();
  return p;
}

function buildDeckPath() {
  const p = Skia.Path.Make();
  p.moveTo(0, -38);
  p.lineTo(7, -22);
  p.lineTo(8, 28);
  p.lineTo(0, 42);
  p.lineTo(-8, 28);
  p.lineTo(-7, -22);
  p.close();
  return p;
}

function buildCabinPath() {
  const p = Skia.Path.Make();
  p.moveTo(0, -18);
  p.lineTo(6, -6);
  p.lineTo(5, 18);
  p.lineTo(0, 28);
  p.lineTo(-5, 18);
  p.lineTo(-6, -6);
  p.close();
  return p;
}

function buildMainSailPath(angleRad: number, reef: number) {
  const p = Skia.Path.Make();
  const mastY = -10;
  const boomLen = 48 * (1 - reef * 0.35);
  const boomX = Math.sin(angleRad) * boomLen;
  const boomY = mastY + Math.cos(angleRad) * boomLen;
  p.moveTo(0, mastY - 30);
  p.lineTo(boomX, boomY);
  p.lineTo(0, mastY);
  p.close();
  return p;
}

function buildJibPath(angleRad: number, reef: number) {
  const p = Skia.Path.Make();
  const clewLen = 38 * (1 - reef * 0.25);
  const clewX = Math.sin(angleRad) * clewLen;
  const clewY = -18 + Math.cos(angleRad) * clewLen;
  p.moveTo(0, -48);
  p.lineTo(0, -12);
  p.lineTo(clewX, clewY);
  p.close();
  return p;
}

function buildSpinnakerPath(side: number) {
  const p = Skia.Path.Make();
  p.moveTo(0, -55);
  p.lineTo(side * 34, -22);
  p.lineTo(side * 18, 14);
  p.lineTo(0, -10);
  p.lineTo(side * -18, 14);
  p.lineTo(side * -34, -22);
  p.close();
  return p;
}

function buildBoomPath(angleRad: number, reef: number) {
  const p = Skia.Path.Make();
  const mastY = -10;
  const boomLen = 50 * (1 - reef * 0.35);
  p.moveTo(0, mastY);
  p.lineTo(Math.sin(angleRad) * boomLen, mastY + Math.cos(angleRad) * boomLen);
  return p;
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

  const tackSide = sim.boatExt.twaDeg >= 0 ? -1 : 1;
  const autoTrim = sim.controls.autoTrim !== false;
  const mainSheet = sim.controls.mainSheet ?? 0.5;
  const jibSheet = sim.controls.jibSheet ?? 0.4;
  const twist = sim.controls.twist ?? 0.15;
  const reef = sim.controls.reef ?? 0;
  const mainAngle =
    tackSide * (8 + (1 - mainSheet) * 72) * DEG_TO_RAD;
  const jibAngle =
    tackSide * (12 + (1 - jibSheet) * 58) * DEG_TO_RAD;

  const hullPath = useMemo(() => buildHullPath(), []);
  const deckPath = useMemo(() => buildDeckPath(), []);
  const cabinPath = useMemo(() => buildCabinPath(), []);
  const mainSailPath = useMemo(
    () => buildMainSailPath(mainAngle, reef),
    [mainAngle, reef],
  );
  const jibSailPath = useMemo(
    () => buildJibPath(jibAngle, reef),
    [jibAngle, reef],
  );
  const spinnakerPath = useMemo(
    () => buildSpinnakerPath(tackSide),
    [tackSide],
  );
  const boomPath = useMemo(
    () => buildBoomPath(mainAngle, reef),
    [mainAngle, reef],
  );
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
  const boatScale = sceneW < 360 ? 0.82 : 0.95;
  const heelOffset = Math.max(-8, Math.min(8, sim.boatExt.heelDeg / 4));
  const mainFill = sim.boatExt.mainStalled ? colors.warning : colors.sailColor;
  const jibFill = sim.boatExt.jibStalled ? colors.warning : colors.sailColor;
  const showSpinnaker = sim.boatExt.sailSet === 'spinnaker';
  const commentary = commentaryFor({
    mainStalled: sim.boatExt.mainStalled,
    jibStalled: sim.boatExt.jibStalled,
    heelDeg,
    twaDeg,
    trimScore,
    tp,
  });

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
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.resetPressed,
            ]}
          >
            <Text style={styles.resetText}>{resetLabel}</Text>
          </Pressable>
        </View>

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

                <Group
                  transform={[
                    { translateX: sim.boat.x },
                    { translateY: sim.boat.y },
                    { rotate: sim.boat.heading },
                    { scale: boatScale },
                  ]}
                >
                  <Circle
                    cx={heelOffset}
                    cy={8}
                    r={46}
                    color="rgba(0, 0, 0, 0.30)"
                  />
                  {showSpinnaker ? (
                    <Path
                      path={spinnakerPath}
                      color="rgba(68, 255, 136, 0.36)"
                      style="fill"
                    />
                  ) : null}
                  <Path
                    path={jibSailPath}
                    color={jibFill}
                    opacity={showSpinnaker ? 0.18 : 0.58}
                  />
                  <Path
                    path={mainSailPath}
                    color={mainFill}
                    opacity={0.68}
                  />
                  <Path
                    path={boomPath}
                    color="rgba(232, 244, 248, 0.88)"
                    style="stroke"
                    strokeWidth={2}
                    strokeCap="round"
                  />
                  <Path path={hullPath} color="rgba(232, 244, 248, 0.96)" />
                  <Path path={deckPath} color="rgba(10, 22, 40, 0.82)" />
                  <Path path={cabinPath} color="rgba(0, 212, 255, 0.26)" />
                  <Circle cx={0} cy={-10} r={3} color={colors.accentCyan} />
                </Group>

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
          >
            <Text style={styles.windSpeedValue}>{`${windKts} kt`}</Text>
            <Text style={styles.windSpeedLabel}>TWD</Text>
            <Text style={styles.windSpeedTwd}>{`${twdDeg}°`}</Text>
          </Pressable>

          <View style={styles.sceneReadout}>
            <Text style={styles.sceneReadoutText}>{`TWA ${twaDeg}°`}</Text>
            <Text style={styles.sceneReadoutText}>{`AWA ${awaDeg}°`}</Text>
            <Text style={styles.sceneReadoutText}>{`VMG ${vmgKn}`}</Text>
          </View>
        </View>

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
              style={({ pressed }) => [
                styles.autoButton,
                autoTrim && styles.autoButtonActive,
                pressed && styles.autoButtonPressed,
              ]}
            >
              <Text style={[
                styles.autoButtonText,
                autoTrim && styles.autoButtonTextActive,
              ]}
              >
                {autoTrim ? 'ON' : 'OFF'}
              </Text>
            </Pressable>
          </View>

          <TrimStepper
            label={mainLabel}
            value={mainSheet}
            onChange={sim.setMainSheet}
            step={0.1}
          />
          <TrimStepper
            label={jibLabel}
            value={jibSheet}
            onChange={sim.setJibSheet}
            step={0.1}
          />
          <View style={styles.trimTwoCol}>
            <TrimStepper
              compact
              label={twistLabel}
              value={twist}
              onChange={sim.setTwist}
              step={0.1}
            />
            <TrimStepper
              compact
              label={reefLabel}
              value={reef}
              onChange={sim.setReef}
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

function TrimStepper({
  label,
  value,
  onChange,
  step,
  compact = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  compact?: boolean;
}) {
  const nextDown = () => {
    Haptics.selectionAsync().catch(() => {});
    onChange(clamp01(value - step));
  };
  const nextUp = () => {
    Haptics.selectionAsync().catch(() => {});
    onChange(clamp01(value + step));
  };
  return (
    <View style={[styles.trimRow, compact && styles.trimRowCompact]}>
      <View style={styles.trimLabelWrap}>
        <Text style={styles.trimLabel}>{label}</Text>
        <Text style={styles.trimValue}>{pct(value)}</Text>
      </View>
      <Pressable
        onPress={nextDown}
        style={({ pressed }) => [
          styles.trimButton,
          pressed && styles.trimButtonPressed,
        ]}
      >
        <Text style={styles.trimButtonText}>-</Text>
      </Pressable>
      <View style={styles.trimTrack}>
        <View style={[styles.trimFill, { flex: clamp01(value) }]} />
        <View style={{ flex: 1 - clamp01(value) }} />
      </View>
      <Pressable
        onPress={nextUp}
        style={({ pressed }) => [
          styles.trimButton,
          pressed && styles.trimButtonPressed,
        ]}
      >
        <Text style={styles.trimButtonText}>+</Text>
      </Pressable>
    </View>
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
  trimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 36,
  },
  trimRowCompact: {
    flex: 1,
  },
  trimTwoCol: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  trimLabelWrap: {
    width: 74,
  },
  trimLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  trimValue: {
    color: colors.accentCyan,
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  trimButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
  },
  trimButtonPressed: {
    backgroundColor: 'rgba(0, 212, 255, 0.18)',
  },
  trimButtonText: {
    color: colors.accentCyan,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 20,
  },
  trimTrack: {
    flex: 1,
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(232, 244, 248, 0.10)',
  },
  trimFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentCyan,
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
