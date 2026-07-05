import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { useI18n } from '../../src/i18n/context';
import { legacyPick } from '../../src/i18n/languages';
import { Button, Screen, Text } from '../../src/design-system/components';
import { colors, radii, shadow, spacing } from '../../src/design-system/tokens';
import {
  NO_GO_HALF_DEG,
  angleToWind,
  bandFor,
  boomAngleDeg,
  normalize360,
  speedPotential,
  tackOf,
} from '../../src/simulator-basics/logic';

// ============================================================================
// Basics simulator - Step 1 for complete beginners. Mobile twin of the web
// `/simulator` page: fixed wind from the top, one boat, one control (turn).
// No trim, no physics loop - the point of sail and speed potential derive
// purely from the angle between the bow and the wind.
// ============================================================================

const HINT_KEY = 'regatta.basics.hint.v1';

/** Point on a circle. 0 deg = screen top (where the wind comes from), +CW. */
function ringPoint(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

export default function SimulatorBasicsScreen() {
  const { tp, lang } = useI18n();
  const { width: winW, height: winH } = useWindowDimensions();

  const [heading, setHeading] = useState(90);
  const [showHint, setShowHint] = useState(false);

  // ---- derived state ------------------------------------------------------
  const twa = angleToWind(heading);
  const twaRound = Math.round(twa);
  const band = bandFor(twa);
  const tack = tackOf(heading);
  const speedPct = Math.round(speedPotential(twa) * 100);
  const bandName = legacyPick(band, 'name', lang);
  const bandDescription = legacyPick(band, 'description', lang);

  // ---- scene geometry -----------------------------------------------------
  const size = Math.min(winW - spacing.lg * 2, Math.max(240, winH * 0.42), 380);
  const cx = size / 2;
  const cy = size / 2;
  const ringR = size * 0.33;

  const noGoPath = useMemo(() => {
    const a = ringPoint(cx, cy, ringR, -NO_GO_HALF_DEG);
    const b = ringPoint(cx, cy, ringR, NO_GO_HALF_DEG);
    return `M ${cx} ${cy} L ${a.x} ${a.y} A ${ringR} ${ringR} 0 0 1 ${b.x} ${b.y} Z`;
  }, [cx, cy, ringR]);

  const ticksPath = useMemo(() => {
    let d = '';
    for (let deg = 0; deg < 360; deg += 30) {
      const len = deg % 90 === 0 ? 12 : 6;
      const a = ringPoint(cx, cy, ringR - len, deg);
      const b = ringPoint(cx, cy, ringR, deg);
      d += `M ${a.x} ${a.y} L ${b.x} ${b.y} `;
    }
    return d;
  }, [cx, cy, ringR]);

  const windArrowPath = useMemo(() => {
    const top = cy - ringR - 30;
    const tip = cy - ringR - 8;
    return `M ${cx} ${top} L ${cx} ${tip} M ${cx - 7} ${tip - 9} L ${cx} ${tip} L ${cx + 7} ${tip - 9}`;
  }, [cx, cy, ringR]);

  // Hull outline around the scene center, bow up (rotated by `heading`).
  const hullPath = useMemo(
    () =>
      `M ${cx} ${cy - 32} C ${cx + 12} ${cy - 16} ${cx + 13} ${cy + 4} ${cx + 9} ${cy + 22} ` +
      `L ${cx - 9} ${cy + 22} C ${cx - 13} ${cy + 4} ${cx - 12} ${cy - 16} ${cx} ${cy - 32} Z`,
    [cx, cy],
  );

  // Main sail as a curved line from the mast, swung to leeward.
  const luffing = twa <= NO_GO_HALF_DEG;
  const sailPath = useMemo(() => {
    const boom = boomAngleDeg(twa);
    const br = (boom * Math.PI) / 180;
    const side = tack === 'port' ? 1 : -1; // boom opposite the wind side
    const mastX = cx;
    const mastY = cy - 8;
    const ux = side * Math.sin(br);
    const uy = Math.cos(br);
    const nx = side * Math.cos(br);
    const ny = -Math.sin(br);
    const endX = mastX + ux * 28;
    const endY = mastY + uy * 28;
    const ctrlX = mastX + ux * 14 + nx * 5;
    const ctrlY = mastY + uy * 14 + ny * 5;
    return `M ${mastX} ${mastY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
  }, [cx, cy, twa, tack]);

  const headingDot = ringPoint(cx, cy, ringR, heading);
  const noGoLabelL = ringPoint(cx, cy, ringR + 14, -NO_GO_HALF_DEG);
  const noGoLabelR = ringPoint(cx, cy, ringR + 14, NO_GO_HALF_DEG);

  // ---- interaction --------------------------------------------------------
  const steerTo = useCallback(
    (x: number, y: number) => {
      const dx = x - cx;
      const dy = y - cy;
      if (dx === 0 && dy === 0) return;
      setHeading(normalize360((Math.atan2(dx, -dy) * 180) / Math.PI));
    },
    [cx, cy],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin((e) => steerTo(e.x, e.y))
        .onChange((e) => steerTo(e.x, e.y)),
    [steerTo],
  );

  // Light haptic when the point-of-sail band changes (trainer convention).
  const prevBandRef = useRef(band.id);
  useEffect(() => {
    if (prevBandRef.current === band.id) return;
    prevBandRef.current = band.id;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [band.id]);

  // ---- first-open hint ----------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(HINT_KEY)
      .then((v) => {
        if (!cancelled && v == null) setShowHint(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const dismissHint = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setShowHint(false);
    AsyncStorage.setItem(HINT_KEY, '1').catch(() => {});
  }, []);

  // ---- strings ------------------------------------------------------------
  const title = tp('Основы', 'Basics', 'Podstawy', {
    es: 'Basico', fr: 'Bases', de: 'Grundlagen', it: 'Base',
  });
  const windLabel = tp('ВЕТЕР', 'WIND', 'WIATR', {
    es: 'VIENTO', fr: 'VENT', de: 'WIND', it: 'VENTO',
  });
  const angleLabel = tp('Угол к ветру', 'Angle to wind', 'Kat do wiatru', {
    es: 'Angulo al viento', fr: 'Angle au vent', de: 'Winkel zum Wind', it: 'Angolo al vento',
  });
  const speedLabel = tp('Потенциал скорости', 'Speed potential', 'Potencjal predkosci', {
    es: 'Potencial de velocidad', fr: 'Potentiel de vitesse', de: 'Tempo-Potenzial', it: 'Potenziale di velocita',
  });
  const tackLabel =
    tack === 'starboard'
      ? tp('Правый галс', 'Starboard tack', 'Prawy hals', {
          es: 'Amura a estribor', fr: 'Tribord amures', de: 'Steuerbordbug', it: 'Mure a dritta',
        })
      : tp('Левый галс', 'Port tack', 'Lewy hals', {
          es: 'Amura a babor', fr: 'Babord amures', de: 'Backbordbug', it: 'Mure a sinistra',
        });
  const intoWindLabel = tp('В левентик', 'Into wind', 'W lewentyk', {
    es: 'Proa al viento', fr: 'Bout au vent', de: 'In den Wind', it: 'Prua al vento',
  });
  const resetLabel = tp('Сброс (90°)', 'Reset (90°)', 'Reset (90°)');
  const headingWord = tp('Курс', 'Heading', 'Kurs', {
    es: 'Rumbo', fr: 'Cap', de: 'Kurs', it: 'Rotta',
  });
  const dragHint = tp(
    'Тяни по сцене, чтобы повернуть лодку',
    'Drag on the scene to turn the boat',
    'Przeciagnij po scenie, aby obrocic lodke',
    { es: 'Arrastra en la escena para girar el barco', fr: 'Glisse sur la scene pour tourner le bateau', de: 'Ziehe auf der Szene, um das Boot zu drehen', it: 'Trascina sulla scena per girare la barca' },
  );
  const sceneA11yLabel = `${angleLabel}: ${twaRound}°. ${bandName}. ${tackLabel}. ${headingWord} ${Math.round(heading)}°. ${dragHint}.`;

  const hintTitle = tp('Как это работает', 'How it works', 'Jak to dziala', {
    es: 'Como funciona', fr: 'Comment ca marche', de: 'So funktioniert es', it: 'Come funziona',
  });
  const hintSteps = [
    tp(
      'Тяни пальцем по кругу - лодка повернется за ним.',
      'Drag anywhere on the circle - the boat turns toward your finger.',
      'Przeciagnij palcem po kole - lodka obroci sie za nim.',
      { es: 'Arrastra el dedo por el circulo - el barco girara hacia el.', fr: 'Glisse le doigt sur le cercle - le bateau tourne vers lui.', de: 'Ziehe den Finger ueber den Kreis - das Boot dreht sich dorthin.', it: 'Trascina il dito sul cerchio - la barca girera verso di esso.' },
    ),
    tp(
      'Красный сектор - мертвая зона: против ветра паруса не работают.',
      'The red wedge is the no-go zone - sails cannot drive the boat there.',
      'Czerwony sektor to strefa martwa - zagle tam nie pracuja.',
      { es: 'El sector rojo es la zona muerta - las velas no funcionan ahi.', fr: 'Le secteur rouge est la zone morte - les voiles ne portent pas la.', de: 'Der rote Sektor ist die tote Zone - dort ziehen die Segel nicht.', it: 'Il settore rosso e la zona morta - li le vele non spingono.' },
    ),
    tp(
      'Следи за шкалой скорости: галфвинд - самый быстрый курс.',
      'Watch the speed bar - beam reach is the fastest course.',
      'Obserwuj pasek predkosci - polwiatr to najszybszy kurs.',
      { es: 'Observa la barra de velocidad - el traves es el rumbo mas rapido.', fr: 'Regarde la barre de vitesse - le vent de travers est le cap le plus rapide.', de: 'Beobachte den Tempo-Balken - Halbwind ist der schnellste Kurs.', it: 'Guarda la barra della velocita - il traverso e la rotta piu veloce.' },
    ),
  ];
  const gotItLabel = tp('Понятно', 'Got it', 'Rozumiem', {
    es: 'Entendido', fr: 'Compris', de: 'Verstanden', it: 'Capito',
  });

  // ---- render --------------------------------------------------------------
  return (
    <Screen noTopInset>
      <Stack.Screen options={{ title }} />
      <View style={styles.content}>
        <GestureDetector gesture={pan}>
          <View
            style={{ width: size, height: size, alignSelf: 'center' }}
            accessible
            accessibilityLabel={sceneA11yLabel}
          >
            <Svg width={size} height={size}>
              {/* water disc + compass ring */}
              <Circle cx={cx} cy={cy} r={ringR} fill={colors.waterLight} fillOpacity={0.55} />
              <Circle cx={cx} cy={cy} r={ringR * 0.62} stroke={colors.borderCyanFaint} strokeWidth={1} fill="none" />
              <Circle cx={cx} cy={cy} r={ringR} stroke={colors.borderCyanSoft} strokeWidth={1.5} fill="none" />
              <Path d={ticksPath} stroke={colors.borderCyanSoft} strokeWidth={1} />
              {/* no-go wedge, +-NO_GO_HALF_DEG around the wind */}
              <Path d={noGoPath} fill="rgba(255, 68, 68, 0.15)" stroke="rgba(255, 68, 68, 0.5)" strokeWidth={1} />
              <SvgText x={noGoLabelL.x} y={noGoLabelL.y} fill={colors.danger} fontSize={10} textAnchor="middle">
                {`${NO_GO_HALF_DEG}°`}
              </SvgText>
              <SvgText x={noGoLabelR.x} y={noGoLabelR.y} fill={colors.danger} fontSize={10} textAnchor="middle">
                {`${NO_GO_HALF_DEG}°`}
              </SvgText>
              {/* wind arrow blowing from the top */}
              <SvgText
                x={cx}
                y={cy - ringR - 38}
                fill={colors.windColor}
                fontSize={11}
                fontWeight="700"
                letterSpacing={2}
                textAnchor="middle"
              >
                {windLabel}
              </SvgText>
              <Path d={windArrowPath} stroke={colors.windColor} strokeWidth={2.5} strokeLinecap="round" fill="none" />
              {/* heading marker on the rim */}
              <Circle cx={headingDot.x} cy={headingDot.y} r={9} fill={colors.accentCyan} fillOpacity={0.25} />
              <Circle cx={headingDot.x} cy={headingDot.y} r={4.5} fill={colors.accentCyan} />
              {/* the boat */}
              <G rotation={heading} originX={cx} originY={cy}>
                <Path d={hullPath} fill={colors.bgCardHover} stroke={colors.accentCyan} strokeWidth={1.5} />
                <Path
                  d={sailPath}
                  stroke={luffing ? colors.textMuted : colors.sailColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeDasharray={luffing ? '3,3' : undefined}
                  fill="none"
                />
                <Circle cx={cx} cy={cy - 8} r={2.5} fill={colors.sailColor} />
              </G>
            </Svg>
          </View>
        </GestureDetector>

        {/* readouts */}
        <View style={styles.readoutRow}>
          <View>
            <Text style={styles.bigAngle}>{`${twaRound}°`}</Text>
            <Text variant="caption">{angleLabel}</Text>
          </View>
          <View style={styles.readoutRight}>
            <View style={styles.tackPill}>
              <Text variant="caption" style={styles.tackText}>{tackLabel}</Text>
            </View>
            <View style={styles.speedTrack}>
              <View style={[styles.speedFill, { width: `${speedPct}%` }]} />
            </View>
            <Text variant="caption">{`${speedLabel}: ${speedPct}%`}</Text>
          </View>
        </View>

        {/* point of sail card */}
        <View style={styles.posCard}>
          <View style={styles.posHeader}>
            <View style={[styles.posDot, { backgroundColor: band.color }]} />
            <Text variant="subtitle">{bandName}</Text>
          </View>
          <Text variant="caption">{bandDescription}</Text>
        </View>

        {/* actions */}
        <View style={styles.buttonRow}>
          <View style={styles.buttonCell}>
            <Button
              variant="secondary"
              accessibilityLabel={intoWindLabel}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setHeading(0);
              }}
            >
              {intoWindLabel}
            </Button>
          </View>
          <View style={styles.buttonCell}>
            <Button
              variant="secondary"
              accessibilityLabel={resetLabel}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setHeading(90);
              }}
            >
              {resetLabel}
            </Button>
          </View>
        </View>
      </View>

      {/* first-open hint overlay */}
      {showHint && (
        <View style={styles.hintBackdrop}>
          <View style={styles.hintCard}>
            <Text variant="subtitle" style={styles.hintTitle}>{hintTitle}</Text>
            {hintSteps.map((step, i) => (
              <View key={i} style={styles.hintRow}>
                <View style={styles.hintBadge}>
                  <Text variant="caption" style={styles.hintBadgeText}>{i + 1}</Text>
                </View>
                <Text variant="caption" style={styles.hintStepText}>{step}</Text>
              </View>
            ))}
            <Button onPress={dismissHint} accessibilityLabel={gotItLabel}>
              {gotItLabel}
            </Button>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  readoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  bigAngle: {
    color: colors.accentCyan,
    fontSize: 46,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  readoutRight: {
    flex: 1,
    gap: spacing.xs,
    alignItems: 'flex-end',
  },
  tackPill: {
    backgroundColor: colors.surfaceCyanFaint,
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tackText: {
    color: colors.accentCyan,
    fontWeight: '600',
  },
  speedTrack: {
    alignSelf: 'stretch',
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.borderCyanFaint,
    overflow: 'hidden',
  },
  speedFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.accentCyan,
  },
  posCard: {
    backgroundColor: colors.bgCard,
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    minHeight: 104,
    ...shadow.card,
  },
  posHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  posDot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 'auto',
  },
  buttonCell: {
    flex: 1,
  },
  hintBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 22, 40, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  hintCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.bgCard,
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadow.sheet,
  },
  hintTitle: {
    textAlign: 'center',
  },
  hintRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  hintBadge: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceCyanSoft,
    borderColor: colors.borderCyanStrong,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintBadgeText: {
    color: colors.accentCyan,
    fontWeight: '700',
    lineHeight: 15,
  },
  hintStepText: {
    flex: 1,
  },
});
