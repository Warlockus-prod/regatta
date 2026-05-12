import { Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useI18n } from '../../src/i18n/context';
import {
  Card,
  PointsOfSailDiagram,
  Screen,
  Text,
} from '../../src/design-system/components';
import { pointsOfSail } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { colors, radii, spacing } from '../../src/design-system/tokens';
import {
  getPolar,
  midAngleFor,
  pointOfSailAt,
  speedAtAngle,
} from '../../src/courses/polar';

const WIND_SPEED_OPTIONS = [6, 10, 14, 20] as const;
type WindSpeed = (typeof WIND_SPEED_OPTIONS)[number];

export default function Courses() {
  const { tp, lang } = useI18n();

  const [windSpeed, setWindSpeed] = useState<WindSpeed>(10);
  const [heading, setHeading] = useState(90);
  const tweenRef = useRef<{ raf: number | null }>({ raf: null });

  useEffect(() => {
    return () => {
      if (tweenRef.current.raf !== null) {
        cancelAnimationFrame(tweenRef.current.raf);
      }
    };
  }, []);

  const polar = useMemo(() => getPolar(windSpeed), [windSpeed]);
  const boatSpeed = useMemo(() => speedAtAngle(polar, heading), [polar, heading]);
  const activeId = pointOfSailAt(heading);

  const headerTitle = tp(
    'Курсы относительно ветра',
    'Points of sail',
    'Kursy wzgledem wiatru',
    {
      es: 'Rumbos',
      fr: 'Allures',
      de: 'Kurse zum Wind',
      it: 'Andature',
    },
  );

  const sailLabel = tp('Работа парусов', 'Sail work', 'Praca zagli', {
    es: 'Trabajo de velas',
    fr: 'Reglage des voiles',
    de: 'Segelfuehrung',
    it: 'Lavoro delle vele',
  });

  const angleLabel = tp('Угол', 'Angle', 'Kat', {
    es: 'Angulo',
    fr: 'Angle',
    de: 'Winkel',
    it: 'Angolo',
  });

  const speedLabel = tp('Скорость', 'Speed', 'Predkosc', {
    es: 'Velocidad',
    fr: 'Vitesse',
    de: 'Geschwindigkeit',
    it: 'Velocita',
  });

  const windLabel = tp('Ветер', 'Wind', 'Wiatr', {
    es: 'Viento',
    fr: 'Vent',
    de: 'Wind',
    it: 'Vento',
  });

  const headingReadoutLabel = tp('Курс', 'Heading', 'Kurs', {
    es: 'Rumbo',
    fr: 'Cap',
    de: 'Kurs',
    it: 'Rotta',
  });

  const boatSpeedLabel = tp('Скорость лодки', 'Boat speed', 'Predkosc lodzi', {
    es: 'Vel. del barco',
    fr: 'Vitesse bateau',
    de: 'Bootsgeschwindigkeit',
    it: 'Velocita barca',
  });

  const knotsAbbr = tp('уз', 'kt', 'w', {
    es: 'nd',
    fr: 'nd',
    de: 'kn',
    it: 'nd',
  });

  const windSpeedLabel = tp('Сила ветра', 'Wind speed', 'Sila wiatru', {
    es: 'Velocidad del viento',
    fr: 'Vitesse du vent',
    de: 'Windstaerke',
    it: 'Velocita del vento',
  });

  const dragHint = tp(
    'Тяните по диаграмме чтобы развернуть лодку. Карты ниже снэпят на нужный курс.',
    'Drag inside the polar to turn the boat. Tap a card below to snap to that point of sail.',
    'Przeciagnij po diagramie aby obrocic lodz. Stuknij karte aby skoczyc na ten kurs.',
    {
      es: 'Arrastra dentro del polar para girar el barco. Toca una tarjeta para ir a ese rumbo.',
      fr: 'Glissez dans le polaire pour tourner. Tapez une carte pour basculer sur cette allure.',
      de: 'Im Polardiagramm ziehen um zu wenden. Karte tippen um auf diesen Kurs zu springen.',
      it: 'Trascina nel polare per virare. Tocca una scheda per saltare a quella andatura.',
    },
  );

  const cardinalLabels = useMemo(
    () => ({ N: 'N', E: 'E', S: 'S', W: 'W' }),
    [],
  );

  const polarA11y = tp(
    'Полярная диаграмма ходкости. Тяните чтобы развернуть лодку.',
    'Polar performance diagram. Drag to turn the boat.',
    'Diagram polarny. Przeciagnij aby obrocic lodz.',
    {
      es: 'Diagrama polar. Arrastra para girar el barco.',
      fr: 'Diagramme polaire. Glissez pour tourner le bateau.',
      de: 'Polardiagramm. Ziehen, um das Boot zu wenden.',
      it: 'Diagramma polare. Trascina per virare la barca.',
    },
  );

  const windChipA11y = (knots: number) =>
    tp(
      `Ветер ${knots} узлов`,
      `Wind ${knots} knots`,
      `Wiatr ${knots} wezlow`,
      {
        es: `Viento ${knots} nudos`,
        fr: `Vent ${knots} noeuds`,
        de: `Wind ${knots} Knoten`,
        it: `Vento ${knots} nodi`,
      },
    );

  const courseCardA11y = (name: string, pct: number) =>
    tp(
      `Курс ${name}, скорость ${pct} процентов от целевой`,
      `Point of sail ${name}, ${pct} percent of target speed`,
      `Kurs ${name}, ${pct} procent predkosci`,
      {
        es: `Rumbo ${name}, ${pct} por ciento de velocidad`,
        fr: `Allure ${name}, ${pct} pour cent de vitesse`,
        de: `Kurs ${name}, ${pct} Prozent Geschwindigkeit`,
        it: `Andatura ${name}, ${pct} per cento di velocita`,
      },
    );

  const animateTo = useCallback((target: number) => {
    if (tweenRef.current.raf !== null) {
      cancelAnimationFrame(tweenRef.current.raf);
    }
    const start = performance.now();
    const duration = 200;
    setHeading((current) => {
      const from = current;
      const delta = shortestArc(from, target);
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const next = (from + delta * eased + 360) % 360;
        setHeading(next);
        if (t < 1) {
          tweenRef.current.raf = requestAnimationFrame(tick);
        } else {
          tweenRef.current.raf = null;
          setHeading(((target % 360) + 360) % 360);
        }
      };
      tweenRef.current.raf = requestAnimationFrame(tick);
      return from;
    });
  }, []);

  const handleHeadingChange = useCallback(
    (value: number, commit: boolean) => {
      if (!commit) {
        if (tweenRef.current.raf !== null) {
          cancelAnimationFrame(tweenRef.current.raf);
          tweenRef.current.raf = null;
        }
        setHeading(value);
        return;
      }
      animateTo(value);
    },
    [animateTo],
  );

  const snapToCard = useCallback(
    (id: string) => {
      Haptics.selectionAsync().catch(() => {});
      animateTo(midAngleFor(id));
    },
    [animateTo],
  );

  const cycleWind = useCallback((value: WindSpeed) => {
    Haptics.selectionAsync().catch(() => {});
    setWindSpeed(value);
  }, []);

  const activePoint = pointsOfSail.find((p) => p.id === activeId);
  const activeName = activePoint ? legacyPick(activePoint, 'name', lang) : '';

  const headingDisplay = String(Math.round(heading)).padStart(3, '0');
  const speedDisplay = boatSpeed.toFixed(1);

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View
          style={styles.diagramArea}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={polarA11y}
          accessibilityValue={{ text: `${Math.round(heading)}°` }}
        >
          <PointsOfSailDiagram
            windLabel={windLabel}
            windSpeedKn={windSpeed}
            heading={heading}
            onHeadingChange={handleHeadingChange}
            cardinalLabels={cardinalLabels}
          />
        </View>

        <View style={styles.readoutRow}>
          <ReadoutCell label={headingReadoutLabel} value={`${headingDisplay} °`} />
          <ReadoutCell label={boatSpeedLabel} value={`${speedDisplay} ${knotsAbbr}`} />
          <ReadoutCell label={windLabel} value={`${windSpeed} ${knotsAbbr}`} muted />
        </View>

        {activeName ? (
          <View style={styles.activeRow}>
            <View style={[styles.activeDot, { backgroundColor: activePoint?.color ?? colors.accentCyan }]} />
            <Text variant="body" style={styles.activeName}>
              {activeName}
            </Text>
          </View>
        ) : null}

        <View style={styles.windControl}>
          <Text variant="muted" style={styles.windControlLabel}>
            {windSpeedLabel.toUpperCase()}
          </Text>
          <View style={styles.windChips}>
            {WIND_SPEED_OPTIONS.map((value) => {
              const active = value === windSpeed;
              return (
                <Pressable
                  key={value}
                  onPress={() => cycleWind(value)}
                  accessibilityRole="button"
                  accessibilityLabel={windChipA11y(value)}
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.windChip,
                    active && styles.windChipActive,
                    pressed && styles.windChipPressed,
                  ]}
                >
                  <Text
                    variant="body"
                    style={[styles.windChipText, active && styles.windChipTextActive]}
                  >
                    {`${value} ${knotsAbbr}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text variant="muted" style={styles.hint}>
          {dragHint}
        </Text>

        {pointsOfSail.map((point) => {
          const name = legacyPick(point, 'name', lang);
          const description = legacyPick(point, 'description', lang);
          const sailWork = legacyPick(point, 'sailWork', lang);
          const speedPct = Math.round(point.speedFactor * 100);
          const isActive = point.id === activeId;
          return (
            <Pressable
              key={point.id}
              onPress={() => snapToCard(point.id)}
              accessibilityRole="button"
              accessibilityLabel={courseCardA11y(name, speedPct)}
              accessibilityState={{ selected: isActive }}
            >
              <Card
                style={[
                  styles.card,
                  { borderLeftColor: point.color, borderLeftWidth: 4 },
                  isActive && styles.cardActive,
                ]}
              >
                <Text variant="subtitle">{name}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaCell}>
                    <Text variant="muted" style={styles.metaLabel}>
                      {angleLabel.toUpperCase()}
                    </Text>
                    <Text variant="body" style={styles.metaValue}>
                      {`${point.angleMin}-${point.angleMax}°`}
                    </Text>
                  </View>
                  <View style={styles.metaCell}>
                    <Text variant="muted" style={styles.metaLabel}>
                      {speedLabel.toUpperCase()}
                    </Text>
                    <Text variant="body" style={styles.metaValue}>{`${speedPct}%`}</Text>
                  </View>
                </View>
                <Text variant="body" style={styles.desc}>{description}</Text>
                {sailWork ? (
                  <View style={styles.sailBlock}>
                    <Text variant="muted" style={styles.sailLabel}>
                      {sailLabel.toUpperCase()}
                    </Text>
                    <Text variant="body" style={styles.sailText}>{sailWork}</Text>
                  </View>
                ) : null}
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

function shortestArc(from: number, to: number): number {
  let d = (to - from) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

function ReadoutCell({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <View style={styles.readoutCell}>
      <Text variant="muted" style={styles.readoutLabel}>
        {label.toUpperCase()}
      </Text>
      <Text
        variant="body"
        style={[styles.readoutValue, muted && styles.readoutValueMuted]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  diagramArea: {
    paddingHorizontal: spacing.lg,
  },
  readoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderCyanFaint,
  },
  readoutCell: {
    flex: 1,
    alignItems: 'center',
  },
  readoutLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  readoutValue: {
    fontWeight: '700',
    color: colors.accentCyan,
    fontVariant: ['tabular-nums'],
  },
  readoutValueMuted: {
    color: colors.textSecondary,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeName: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  windControl: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  windControlLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
    color: colors.textSecondary,
  },
  windChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  windChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderCyanSoft,
    backgroundColor: 'transparent',
  },
  windChipActive: {
    borderColor: colors.accentCyan,
    backgroundColor: colors.surfaceCyanSoft,
  },
  windChipPressed: {
    opacity: 0.7,
  },
  windChipText: {
    fontWeight: '600',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  windChipTextActive: {
    color: colors.accentCyan,
  },
  hint: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  cardActive: {
    borderColor: colors.borderCyanStrong,
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.xl,
  },
  metaCell: {},
  metaLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 2,
  },
  metaValue: {
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  desc: {
    marginTop: spacing.md,
    lineHeight: 22,
  },
  sailBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 212, 255, 0.10)',
  },
  sailLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: spacing.xs,
    color: colors.textSecondary,
  },
  sailText: {
    lineHeight: 20,
  },
});
