import { Stack } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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

export default function Courses() {
  const { tp, lang } = useI18n();

  // Selected point of sail. Defaults to beam reach (the fastest, "hero" course -
  // matches the web, where Polwiatr is highlighted on load).
  const [activeId, setActiveId] = useState<string>('beam-reach');

  const headerTitle = tp(
    'Курсы относительно ветра',
    'Points of sail',
    'Kursy wzgledem wiatru',
    { es: 'Rumbos', fr: 'Allures', de: 'Kurse zum Wind', it: 'Andature' },
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

  const tapHint = tp(
    'Нажми на сектор диаграммы или карту ниже, чтобы узнать подробности курса.',
    'Tap a sector of the diagram or a card below to see course details.',
    'Stuknij sektor diagramu lub karte ponizej, aby poznac szczegoly kursu.',
    {
      es: 'Toca un sector del diagrama o una tarjeta para ver los detalles del rumbo.',
      fr: 'Touchez un secteur du diagramme ou une carte pour voir les details.',
      de: 'Tippe einen Sektor des Diagramms oder eine Karte fuer Details an.',
      it: 'Tocca un settore del diagramma o una scheda per i dettagli.',
    },
  );

  const diagramA11y = tp(
    'Диаграмма курсов относительно ветра. Нажми на сектор, чтобы выбрать курс.',
    'Points-of-sail diagram. Tap a sector to select a course.',
    'Diagram kursow wzgledem wiatru. Stuknij sektor, aby wybrac kurs.',
    {
      es: 'Diagrama de rumbos. Toca un sector para elegir un rumbo.',
      fr: 'Diagramme des allures. Touchez un secteur pour choisir une allure.',
      de: 'Kursdiagramm. Tippe einen Sektor an, um einen Kurs zu waehlen.',
      it: 'Diagramma delle andature. Tocca un settore per scegliere.',
    },
  );

  // Short localized course names for the rim (drop the "/ alias" tail).
  const sectorLabels = useMemo(
    () =>
      pointsOfSail.map((p) => ({
        id: p.id,
        name: (legacyPick(p, 'name', lang).split('/')[0] ?? '').trim(),
      })),
    [lang],
  );

  const tackLabels = useMemo(
    () => ({
      port: tp('Левый галс', 'Port tack', 'Lewy hals', {
        es: 'Amura de babor',
        fr: 'Bord babord',
        de: 'Backbordbug',
        it: 'Mure a sinistra',
      }),
      starboard: tp('Правый галс', 'Starboard tack', 'Prawy hals', {
        es: 'Amura de estribor',
        fr: 'Bord tribord',
        de: 'Steuerbordbug',
        it: 'Mure a dritta',
      }),
    }),
    [lang], // eslint-disable-line react-hooks/exhaustive-deps
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

  const select = useCallback((id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setActiveId(id);
  }, []);

  const activePoint = pointsOfSail.find((p) => p.id === activeId);
  const activeName = activePoint ? legacyPick(activePoint, 'name', lang) : '';
  const activeDesc = activePoint ? legacyPick(activePoint, 'description', lang) : '';

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View
          style={styles.diagramArea}
          accessible
          accessibilityRole="image"
          accessibilityLabel={diagramA11y}
          accessibilityValue={{ text: activeName }}
        >
          <PointsOfSailDiagram
            windLabel={windLabel}
            activeId={activeId}
            onSelect={select}
            sectorLabels={sectorLabels}
            tackLabels={tackLabels}
          />
        </View>

        {activePoint ? (
          <View style={[styles.activeBanner, { borderLeftColor: activePoint.color }]}>
            <View style={styles.activeRow}>
              <View style={[styles.activeDot, { backgroundColor: activePoint.color }]} />
              <Text variant="subtitle" style={styles.activeName}>
                {activeName}
              </Text>
            </View>
            {activeDesc ? (
              <Text variant="body" style={styles.activeDesc}>
                {activeDesc}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text variant="muted" style={styles.hint}>
          {tapHint}
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
              onPress={() => select(point.id)}
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

const styles = StyleSheet.create({
  scroll: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  diagramArea: {
    paddingHorizontal: spacing.lg,
  },
  activeBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderLeftWidth: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderCyanFaint,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activeName: {
    fontWeight: '700',
  },
  activeDesc: {
    marginTop: spacing.sm,
    lineHeight: 22,
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
