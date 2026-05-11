import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useI18n } from '../../src/i18n/context';
import { Screen, Text } from '../../src/design-system/components';
import { useSimLoop } from '../../src/simulator/use-sim-loop';
import type { TrailPoint } from '../../src/simulator/use-sim-loop';
import { colors, radii, spacing } from '../../src/design-system/tokens';

/**
 * Simulator route. Phase 2 preview: live Skia top-down scene driven by
 * the stub physics in `src/simulator/tick.ts`. Pan anywhere on the
 * canvas to set the heading target; the boat turns toward it at
 * `turnRate`, position integrates forward, the playfield wraps at the
 * edges, and a fading wake renders the last 60 positions.
 *
 * What this preview demonstrates:
 *   1. Skia toolchain works end-to-end on the user's device.
 *   2. Render-loop pattern (use-sim-loop hook + Skia Group transform).
 *   3. Gesture integration (`react-native-gesture-handler` v2 Pan).
 *   4. The HUD-over-canvas layout that Phase 2 proper will keep.
 *
 * What it does NOT yet do:
 *   - Real physics. The tick is a heading + speed integrator, not the
 *     full VPP from `src/lib/sailing-physics/*`.
 *   - Wind dynamics, sail trim, heel, leeway, missions, replay.
 *
 * Phase 2 proper (after ADR-0003 lands) replaces the stub with the
 * shared physics package and adds missions + wind variation per
 * ROADMAP §3.
 */

const CANVAS_W = 320;
const CANVAS_H = 240;
const CENTER_X = CANVAS_W / 2;
const CENTER_Y = CANVAS_H / 2;

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

// Wind reference at top of the canvas: fixed wind from the north, pointing south.
const windArrowPath = (() => {
  const p = Skia.Path.Make();
  p.moveTo(160, 22);
  p.lineTo(160, 56);
  p.moveTo(154, 48);
  p.lineTo(160, 58);
  p.lineTo(166, 48);
  return p;
})();

/**
 * Build a Skia path from trail points, breaking the line at any segment
 * that crosses the playfield wrap (heuristic: large jump > half-canvas).
 */
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

  // Pan gesture: target heading = angle from canvas center to the touch
  // point. Pan up = head north, pan right = head east, etc. `runOnJS(true)`
  // keeps the worklet boundary simple; the hook setter is JS-thread.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin((e) => {
          // Subtle "touch registered" tap on the device. Once per gesture.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
            /* ignore on devices without taptic engine. */
          });
          const dx = e.x - CENTER_X;
          const dy = e.y - CENTER_Y;
          if (dx === 0 && dy === 0) return;
          sim.setTargetHeading(Math.atan2(dx, -dy));
        })
        .onChange((e) => {
          const dx = e.x - CENTER_X;
          const dy = e.y - CENTER_Y;
          if (dx === 0 && dy === 0) return;
          sim.setTargetHeading(Math.atan2(dx, -dy));
        }),
    // sim is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const trailPath = useMemo(
    () => buildTrailPath(sim.trail),
    // Trail array reference changes on every tick.
    [sim.trail, sim.tickN],
  );

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
    'Тяни пальцем по полю - задаёшь курс яхте. Кнопка справа сбрасывает позицию.',
    'Drag a finger across the field to steer the boat. The button on the right resets the position.',
    'Przeciagaj palcem po polu by sterowac jachtem. Przycisk po prawej resetuje pozycje.',
    {
      es: 'Arrastra el dedo por el campo para gobernar el barco. El boton de la derecha reinicia la posicion.',
      fr: 'Fais glisser le doigt sur le terrain pour barrer le bateau. Le bouton a droite reinitialise la position.',
      de: 'Mit dem Finger uber das Feld ziehen, um das Boot zu steuern. Der Knopf rechts setzt die Position zurueck.',
      it: 'Trascina il dito sul campo per timonare la barca. Il pulsante a destra reimposta la posizione.',
    },
  );

  const headingLabel = tp('КУРС', 'HEADING', 'KURS', {
    es: 'RUMBO',
    fr: 'CAP',
    de: 'KURS',
    it: 'ROTTA',
  });
  const speedLabel = tp('СКОРОСТЬ', 'SPEED', 'PREDKOSC', {
    es: 'VELOCIDAD',
    fr: 'VITESSE',
    de: 'SPEED',
    it: 'VELOCITA',
  });
  const targetLabel = tp('ЦЕЛЬ', 'TARGET', 'CEL', {
    es: 'OBJETIVO',
    fr: 'CIBLE',
    de: 'ZIEL',
    it: 'TARGET',
  });

  const headingDeg = Math.round(
    (((sim.boat.heading * 180) / Math.PI) % 360 + 360) % 360,
  );
  const targetDeg = Math.round(
    (((sim.controls.targetHeading * 180) / Math.PI) % 360 + 360) % 360,
  );
  const speed = Math.round(sim.boat.speed);

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
                () => {/* ignore */},
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

        <GestureDetector gesture={pan}>
          <View style={styles.canvasWrap}>
            <Canvas style={styles.canvas}>
              <Group>
                <Path
                  path={windArrowPath}
                  color={colors.windColor}
                  style="stroke"
                  strokeWidth={2}
                  strokeCap="round"
                />
                <Path
                  path={trailPath}
                  color={colors.accentCyan}
                  style="stroke"
                  strokeWidth={1.5}
                  strokeCap="round"
                  strokeJoin="round"
                  opacity={0.4}
                />
                <Group
                  transform={[
                    { translateX: sim.boat.x },
                    { translateY: sim.boat.y },
                    { rotate: sim.boat.heading },
                  ]}
                >
                  <Path path={boatPath} color={colors.sailColor} />
                </Group>
              </Group>
            </Canvas>
          </View>
        </GestureDetector>

        <View style={styles.hud}>
          <HudCell label={headingLabel} value={`${headingDeg}°`} />
          <HudCell label={targetLabel} value={`${targetDeg}°`} muted />
          <HudCell label={speedLabel} value={String(speed)} />
        </View>

        <Text variant="caption" style={styles.note}>{previewNote}</Text>
      </View>
    </Screen>
  );
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
  },
  canvas: {
    width: CANVAS_W,
    height: CANVAS_H,
  },
  hud: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.lg,
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
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  hudValueMuted: {
    color: colors.textSecondary,
  },
  note: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
