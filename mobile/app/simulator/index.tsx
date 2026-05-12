import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { colors, radii, spacing } from '../../src/design-system/tokens';

/**
 * Sprint 3 simulator: real VPP physics + interactive wind.
 *
 * Drag the canvas to steer. The wind compass (top-right) rotates the
 * true wind direction (snap to 15 deg). Tap the compass label to cycle
 * through 6 / 10 / 14 / 20 kt presets. Boat speed responds to wind
 * angle: head into the no-go zone and the sails luff, fall off to a
 * reach and the boat fills in.
 */

const CANVAS_W = 320;
const CANVAS_H = 260;
const CENTER_X = CANVAS_W / 2;
const CENTER_Y = CANVAS_H / 2;

const COMPASS_R = 28;
const COMPASS_CX = CANVAS_W - COMPASS_R - 16;
const COMPASS_CY = COMPASS_R + 16;

// Top-down boat silhouette, centered at origin, pointing up (heading 0 = north).
const boatPath = (() => {
  const p = Skia.Path.Make();
  p.moveTo(0, -18);
  p.lineTo(12, 18);
  p.lineTo(0, 13);
  p.lineTo(-12, 18);
  p.close();
  return p;
})();

const compassArrowPath = buildCompassArrowPath();

const SNAP_DEG = 15;
const SNAP_RAD = (SNAP_DEG * Math.PI) / 180;

function snapToStep(rad: number, step: number): number {
  return Math.round(rad / step) * step;
}

/** Build a Skia path from trail points, breaking the line at any segment
 * that crosses the playfield wrap (heuristic: large jump > half-canvas). */
function buildTrailPath(trail: TrailPoint[]) {
  const p = Skia.Path.Make();
  if (trail.length === 0) return p;
  p.moveTo(trail[0]!.x, trail[0]!.y);
  for (let i = 1; i < trail.length; i++) {
    const prev = trail[i - 1]!;
    const curr = trail[i]!;
    const wrappedX = Math.abs(curr.x - prev.x) > CANVAS_W / 2;
    const wrappedY = Math.abs(curr.y - prev.y) > CANVAS_H / 2;
    if (wrappedX || wrappedY) {
      p.moveTo(curr.x, curr.y);
    } else {
      p.lineTo(curr.x, curr.y);
    }
  }
  return p;
}

export default function Simulator() {
  const { tp } = useI18n();
  const sim = useSimLoop({ bounds: { width: CANVAS_W, height: CANVAS_H } });

  // ---- Pan-to-steer (whole canvas except the compass corner) -----------
  const steer = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin((e) => {
          if (insideCompass(e.x, e.y)) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
            () => {},
          );
          const dx = e.x - CENTER_X;
          const dy = e.y - CENTER_Y;
          if (dx === 0 && dy === 0) return;
          sim.setTargetHeading(Math.atan2(dx, -dy));
        })
        .onChange((e) => {
          if (insideCompass(e.x, e.y)) return;
          const dx = e.x - CENTER_X;
          const dy = e.y - CENTER_Y;
          if (dx === 0 && dy === 0) return;
          sim.setTargetHeading(Math.atan2(dx, -dy));
        }),
    // sim is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ---- Wind compass drag (snap to 15 deg) ------------------------------
  const windDrag = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin((e) => {
          if (!insideCompass(e.x, e.y)) return;
          const dx = e.x - COMPASS_CX;
          const dy = e.y - COMPASS_CY;
          const raw = Math.atan2(dx, -dy);
          sim.setWindDir(snapToStep(raw, SNAP_RAD));
        })
        .onChange((e) => {
          if (!insideCompass(e.x, e.y)) return;
          const dx = e.x - COMPASS_CX;
          const dy = e.y - COMPASS_CY;
          const raw = Math.atan2(dx, -dy);
          sim.setWindDir(snapToStep(raw, SNAP_RAD));
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const composedGesture = useMemo(
    () => Gesture.Simultaneous(windDrag, steer),
    [windDrag, steer],
  );

  // ---- Memoised Skia paths --------------------------------------------
  const arrowGrid = useMemo(
    () => buildArrowGrid(CANVAS_W, CANVAS_H, 56),
    [],
  );
  const windArrowsPath = useMemo(
    () => buildWindArrowsPath(arrowGrid, sim.wind.trueWindDirRad),
    [arrowGrid, sim.wind.trueWindDirRad],
  );

  const trailPath = useMemo(
    () => buildTrailPath(sim.trail),
    // Trail array reference changes on every tick.
    [sim.trail, sim.tickN],
  );

  const noGoPath = useMemo(() => {
    // No-go opens around the apparent wind FROM-direction, in screen-space.
    // Boat heading is in screen-space (rad). AWA is signed degrees from bow.
    const awaScreenRad =
      sim.boat.heading + (sim.boatExt.awaDeg * Math.PI) / 180;
    return buildNoGoPath(sim.boat.x, sim.boat.y, awaScreenRad, 90);
  }, [sim.boat.x, sim.boat.y, sim.boat.heading, sim.boatExt.awaDeg, sim.tickN]);

  const apparentArrowPath = useMemo(() => {
    const awaScreenRad =
      sim.boat.heading + (sim.boatExt.awaDeg * Math.PI) / 180;
    // Anchor at the bow (a bit forward of boat center).
    const bowX = sim.boat.x + Math.sin(sim.boat.heading) * -16;
    const bowY = sim.boat.y - Math.cos(sim.boat.heading) * -16;
    return buildApparentArrowPath(bowX, bowY, awaScreenRad);
  }, [sim.boat.x, sim.boat.y, sim.boat.heading, sim.boatExt.awaDeg, sim.tickN]);

  // ---- Labels ----------------------------------------------------------
  const title = tp('Симулятор', 'Simulator', 'Symulator', {
    es: 'Simulador',
    fr: 'Simulateur',
    de: 'Simulator',
    it: 'Simulatore',
  });

  const previewBadge = tp('Тяни чтобы рулить', 'Drag to steer', 'Przeciagnij by sterowac', {
    es: 'Arrastra para gobernar',
    fr: 'Glisse pour barrer',
    de: 'Ziehen zum Steuern',
    it: 'Trascina per timonare',
  });

  const previewNote = tp(
    'Тяни пальцем чтобы рулить. Вращай компас справа чтобы менять ветер. Тапни кнопку kt чтобы переключить силу.',
    'Drag a finger to steer. Rotate the compass on the right to change wind. Tap the kt button to cycle wind speed.',
    'Przeciagaj palcem by sterowac. Obracaj kompas po prawej by zmieniac wiatr. Stuknij przycisk kt by przelaczyc sile.',
    {
      es: 'Arrastra el dedo para gobernar. Gira la brujula a la derecha para cambiar el viento. Toca el boton kt para cambiar la fuerza.',
      fr: 'Glisse le doigt pour barrer. Tourne la boussole a droite pour changer le vent. Touche le bouton kt pour cycler la force.',
      de: 'Ziehe den Finger zum Steuern. Drehe den Kompass rechts, um den Wind zu aendern. Tippe auf kt, um die Staerke umzuschalten.',
      it: 'Trascina il dito per timonare. Ruota la bussola a destra per cambiare il vento. Tocca il pulsante kt per cambiare la forza.',
    },
  );

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
  const twaLabel = 'TWA';
  const awaLabel = 'AWA';
  const twdLabel = 'TWD';

  // ---- Derived values --------------------------------------------------
  const headingDeg = Math.round(
    (((sim.boat.heading * 180) / Math.PI) % 360 + 360) % 360,
  );
  const twdDeg = Math.round(
    (((sim.wind.trueWindDirRad * 180) / Math.PI) % 360 + 360) % 360,
  );
  const speedKn = sim.boatExt.boatSpeedKn.toFixed(1);
  const twaDeg = Math.round(sim.boatExt.twaDeg);
  const awaDeg = Math.round(sim.boatExt.awaDeg);
  const windKts = Math.round(sim.wind.trueWindSpeedKts);

  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>
              {previewBadge.toUpperCase()}
            </Text>
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
            <Text style={styles.resetText}>
              {tp('СБРОС', 'RESET', 'RESET', {
                es: 'RESET',
                fr: 'RESET',
                de: 'RESET',
                it: 'RESET',
              })}
            </Text>
          </Pressable>
        </View>

        <View style={styles.canvasWrap}>
          <GestureDetector gesture={composedGesture}>
            <Canvas style={styles.canvas}>
              <Group>
                {/* Ambient wind arrows. */}
                <Path
                  path={windArrowsPath}
                  color={colors.windColor}
                  style="stroke"
                  strokeWidth={1}
                  strokeCap="round"
                  opacity={0.32}
                />

                {/* Wake. */}
                <Path
                  path={trailPath}
                  color={colors.accentCyan}
                  style="stroke"
                  strokeWidth={1.5}
                  strokeCap="round"
                  strokeJoin="round"
                  opacity={0.4}
                />

                {/* No-go zone triangle. */}
                <Path
                  path={noGoPath}
                  color={colors.danger}
                  style="fill"
                  opacity={0.12}
                />
                <Path
                  path={noGoPath}
                  color={colors.danger}
                  style="stroke"
                  strokeWidth={1}
                  opacity={0.35}
                />

                {/* Apparent wind arrow at the bow. */}
                <Path
                  path={apparentArrowPath}
                  color={colors.windColor}
                  style="stroke"
                  strokeWidth={2}
                  strokeCap="round"
                  opacity={0.95}
                />

                {/* Boat icon. */}
                <Group
                  transform={[
                    { translateX: sim.boat.x },
                    { translateY: sim.boat.y },
                    { rotate: sim.boat.heading },
                  ]}
                >
                  <Path path={boatPath} color={colors.sailColor} />
                </Group>

                {/* Wind compass dial. */}
                <Group
                  transform={[
                    { translateX: COMPASS_CX },
                    { translateY: COMPASS_CY },
                  ]}
                >
                  <Circle
                    cx={0}
                    cy={0}
                    r={COMPASS_R}
                    color={colors.bgCard}
                    opacity={0.85}
                  />
                  <Circle
                    cx={0}
                    cy={0}
                    r={COMPASS_R}
                    color={colors.windColor}
                    style="stroke"
                    strokeWidth={1}
                    opacity={0.5}
                  />
                  <Group transform={[{ rotate: sim.wind.trueWindDirRad }]}>
                    <Path
                      path={compassArrowPath}
                      color={colors.windColor}
                      style="stroke"
                      strokeWidth={2}
                      strokeCap="round"
                    />
                  </Group>
                </Group>
              </Group>
            </Canvas>
          </GestureDetector>

          {/* Wind speed cycler overlaid on the canvas, just under the compass. */}
          <Pressable
            style={styles.windSpeedButton}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              sim.cycleWindSpeed();
            }}
          >
            <Text style={styles.windSpeedValue}>{`${windKts} kt`}</Text>
            <Text style={styles.windSpeedLabel}>{twdLabel}</Text>
            <Text style={styles.windSpeedTwd}>{`${twdDeg}°`}</Text>
          </Pressable>
        </View>

        <View style={styles.hud}>
          <HudCell label={headingLabel} value={`${headingDeg}°`} />
          <HudCell label={speedLabel} value={speedKn} />
          <HudCell label={twaLabel} value={`${twaDeg}°`} muted />
          <HudCell label={awaLabel} value={`${awaDeg}°`} muted />
        </View>

        <Text variant="caption" style={styles.note}>{previewNote}</Text>
      </View>
    </Screen>
  );
}

function insideCompass(x: number, y: number): boolean {
  const dx = x - COMPASS_CX;
  const dy = y - COMPASS_CY;
  return dx * dx + dy * dy <= (COMPASS_R + 6) * (COMPASS_R + 6);
}

function HudCell({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <View style={styles.hudCell}>
      <Text variant="muted" style={styles.hudLabel}>{label}</Text>
      <Text style={[styles.hudValue, muted && styles.hudValueMuted]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerSpacer: {
    flex: 1,
  },
  previewBadge: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    borderColor: 'rgba(0, 212, 255, 0.40)',
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewBadgeText: {
    color: colors.accentCyan,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  resetButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 4,
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
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  canvasWrap: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderColor: 'rgba(0, 212, 255, 0.10)',
    borderWidth: 1,
    alignSelf: 'center',
    position: 'relative',
  },
  canvas: {
    width: CANVAS_W,
    height: CANVAS_H,
  },
  windSpeedButton: {
    position: 'absolute',
    right: 8,
    top: COMPASS_CY + COMPASS_R + 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(15, 32, 53, 0.85)',
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
    alignItems: 'flex-end',
    minWidth: 56,
  },
  windSpeedValue: {
    color: colors.windColor,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    lineHeight: 16,
  },
  windSpeedLabel: {
    color: colors.textMuted,
    fontSize: 8,
    letterSpacing: 1.2,
    fontWeight: '700',
    marginTop: 1,
  },
  windSpeedTwd: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  hud: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  hudCell: {
    flex: 1,
  },
  hudLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  hudValue: {
    color: colors.accentCyan,
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  hudValueMuted: {
    color: colors.textSecondary,
    fontSize: 18,
  },
  note: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
