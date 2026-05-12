import { Stack } from 'expo-router';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import Svg, {
  Circle as SvgCircle,
  Defs,
  LinearGradient,
  Path as SvgPath,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useI18n } from '../../src/i18n/context';
import { Card } from '../../src/design-system/components/Card';
import { Screen } from '../../src/design-system/components/Screen';
import { Text } from '../../src/design-system/components/Text';
import { anatomyParts, type AnatomyPart } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { colors, motion, radii, spacing } from '../../src/design-system/tokens';
import { HOTSPOTS } from '../../src/anatomy/hotspots';
import { YACHT_PATHS, YACHT_VIEWBOX } from '../../src/anatomy/yacht-svg';

const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);

const POSTER_HORIZONTAL_PADDING = spacing.lg * 2;

export default function Anatomy() {
  const { tp, lang } = useI18n();
  const { width: screenWidth } = useWindowDimensions();
  const [activeId, setActiveId] = useState<string | null>(null);

  const headerTitle = tp('Анатомия яхты', 'Yacht anatomy', 'Anatomia jachtu', {
    es: 'Anatomia del yate',
    fr: 'Anatomie du yacht',
    de: 'Yacht-Anatomie',
    it: 'Anatomia dello yacht',
  });

  const intro = tp(
    'Нажми на точку - откроется карточка с описанием.',
    'Tap a hotspot to open the part card.',
    'Dotknij punktu - otworzy sie karta z opisem.',
    {
      es: 'Toca un punto - se abrira la ficha de la pieza.',
      fr: 'Touche un point pour ouvrir la fiche de la piece.',
      de: 'Tippe auf einen Punkt - die Bauteilkarte oeffnet sich.',
      it: 'Tocca un punto per aprire la scheda del pezzo.',
    },
  );

  const allPartsLabel = tp('Все детали', 'All parts', 'Wszystkie elementy', {
    es: 'Todas las partes',
    fr: 'Toutes les pieces',
    de: 'Alle Teile',
    it: 'Tutte le parti',
  });

  const summary = tp(
    `${anatomyParts.length} элементов`,
    `${anatomyParts.length} parts`,
    `${anatomyParts.length} elementow`,
    {
      es: `${anatomyParts.length} elementos`,
      fr: `${anatomyParts.length} elements`,
      de: `${anatomyParts.length} Teile`,
      it: `${anatomyParts.length} elementi`,
    },
  );

  const posterWidth = Math.max(280, screenWidth - POSTER_HORIZONTAL_PADDING);
  const posterHeight = (posterWidth * YACHT_VIEWBOX.height) / YACHT_VIEWBOX.width;

  const partsWithHotspot = useMemo(
    () => anatomyParts.filter((p) => HOTSPOTS[p.id]),
    [],
  );

  const activePart = useMemo<AnatomyPart | null>(
    () => (activeId ? anatomyParts.find((p) => p.id === activeId) ?? null : null),
    [activeId],
  );

  const handleNavigate = (delta: 1 | -1) => {
    if (!activePart) return;
    const idx = anatomyParts.findIndex((p) => p.id === activePart.id);
    if (idx < 0) return;
    const next = anatomyParts[(idx + delta + anatomyParts.length) % anatomyParts.length];
    if (next) setActiveId(next.id);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Text variant="caption">{intro}</Text>
          <Text variant="muted" style={styles.summary}>{summary}</Text>
        </View>

        <YachtPoster
          width={posterWidth}
          height={posterHeight}
          parts={partsWithHotspot}
          activeId={activeId}
          onSelect={setActiveId}
          pickName={(p) => legacyPick(p, 'name', lang)}
        />

        <View style={styles.chipsHeader}>
          <Text variant="muted" style={styles.chipsHeaderText}>
            {allPartsLabel.toUpperCase()}
          </Text>
        </View>
        <View style={styles.chipsGrid}>
          {anatomyParts.map((p) => {
            const active = activeId === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setActiveId(p.id)}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipActive,
                  pressed && !active && styles.chipPressed,
                ]}
              >
                <Text
                  variant="caption"
                  style={[styles.chipText, active && styles.chipTextActive]}
                  numberOfLines={1}
                >
                  {legacyPick(p, 'name', lang)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <PartSheet
        part={activePart}
        onClose={() => setActiveId(null)}
        onNext={() => handleNavigate(1)}
        onPrev={() => handleNavigate(-1)}
      />
    </Screen>
  );
}

interface YachtPosterProps {
  width: number;
  height: number;
  parts: AnatomyPart[];
  activeId: string | null;
  onSelect: (id: string) => void;
  pickName: (part: AnatomyPart) => string;
}

function YachtPoster({ width, height, parts, activeId, onSelect, pickName }: YachtPosterProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: motion.pulse,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: motion.pulse,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const pulseRadius = pulse.interpolate({ inputRange: [0, 1], outputRange: [10, 16] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.05] });

  const sx = width / YACHT_VIEWBOX.width;
  const sy = height / YACHT_VIEWBOX.height;

  return (
    <View style={[posterStyles.frame, { width, height, marginHorizontal: spacing.lg }]}>
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${YACHT_VIEWBOX.width} ${YACHT_VIEWBOX.height}`}
      >
        <Defs>
          <LinearGradient id="poster-bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0a1f33" stopOpacity="0.95" />
            <Stop offset="1" stopColor="#06182d" stopOpacity="1" />
          </LinearGradient>
          <RadialGradient id="poster-glow" cx="50%" cy="55%" r="60%">
            <Stop offset="0" stopColor="#00d4ff" stopOpacity="0.10" />
            <Stop offset="1" stopColor="#00d4ff" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Rect x={0} y={0} width={YACHT_VIEWBOX.width} height={YACHT_VIEWBOX.height} fill="url(#poster-bg)" />
        <Rect x={0} y={0} width={YACHT_VIEWBOX.width} height={YACHT_VIEWBOX.height} fill="url(#poster-glow)" />

        {YACHT_PATHS.map((path) => {
          const isSail = path.kind === 'sail';
          const isWater = path.kind === 'water';
          const isFoil = path.kind === 'foil';
          return (
            <SvgPath
              key={path.id}
              d={path.d}
              stroke={isWater ? colors.borderCyanSoft : colors.textSecondary}
              strokeWidth={isWater ? 1 : 1.5}
              strokeOpacity={isWater ? 0.6 : 1}
              fill={isSail ? 'rgba(232, 244, 248, 0.06)' : isFoil ? 'rgba(0, 212, 255, 0.05)' : 'none'}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </Svg>

      <View style={[posterStyles.hotspotLayer, { width, height }]} pointerEvents="box-none">
        {parts.map((part) => {
          const pos = HOTSPOTS[part.id];
          if (!pos) return null;
          const left = pos.x * sx;
          const top = pos.y * sy;
          const active = part.id === activeId;
          return (
            <Pressable
              key={part.id}
              onPress={() => onSelect(part.id)}
              hitSlop={14}
              accessibilityLabel={pickName(part)}
              style={[posterStyles.hotspotHit, { left: left - 18, top: top - 18 }]}
            >
              <View pointerEvents="none">
                <Svg width={36} height={36} viewBox="0 0 36 36">
                  {!active ? (
                    <AnimatedCircle
                      cx={18}
                      cy={18}
                      r={pulseRadius}
                      fill={colors.accentCyan}
                      fillOpacity={pulseOpacity}
                    />
                  ) : null}
                  <SvgCircle
                    cx={18}
                    cy={18}
                    r={active ? 11 : 8}
                    fill={active ? colors.accentCyan : 'transparent'}
                    stroke={colors.accentCyan}
                    strokeWidth={active ? 2 : 1.5}
                    strokeOpacity={active ? 1 : 0.85}
                  />
                  <SvgCircle
                    cx={18}
                    cy={18}
                    r={active ? 5 : 3}
                    fill={active ? colors.bgPrimary : colors.accentCyan}
                  />
                </Svg>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface PartSheetProps {
  part: AnatomyPart | null;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

function PartSheet({ part, onClose, onNext, onPrev }: PartSheetProps) {
  const { tp, lang } = useI18n();
  const dragY = useRef(new Animated.Value(0)).current;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 14 || gesture.dy > 14,
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) {
            dragY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          const horiz = gesture.dx;
          const vert = gesture.dy;
          if (vert > 80 && Math.abs(horiz) < 80) {
            Animated.timing(dragY, {
              toValue: 600,
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              dragY.setValue(0);
              onClose();
            });
            return;
          }
          if (Math.abs(horiz) > 60 && Math.abs(horiz) > Math.abs(vert)) {
            if (horiz < 0) onNext();
            else onPrev();
          }
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        },
      }),
    [dragY, onClose, onNext, onPrev],
  );

  useEffect(() => {
    if (part) dragY.setValue(0);
  }, [part, dragY]);

  if (!part) return null;

  const name = legacyPick(part, 'name', lang);
  const desc = legacyPick(part, 'desc', lang);
  const useText = legacyPick(part, 'useOnBoard', lang);

  const closeLabel = tp('Закрыть', 'Close', 'Zamknij', {
    es: 'Cerrar',
    fr: 'Fermer',
    de: 'Schliessen',
    it: 'Chiudi',
  });
  const useOnBoardLabel = tp('На борту', 'On board', 'Na pokladzie', {
    es: 'A bordo',
    fr: 'A bord',
    de: 'An Bord',
    it: 'A bordo',
  });
  const partBadge = tp('Деталь', 'Part', 'Element', {
    es: 'Pieza',
    fr: 'Piece',
    de: 'Teil',
    it: 'Pezzo',
  });
  const swipeHint = tp(
    'Свайп влево / вправо для соседних деталей.',
    'Swipe left / right for adjacent parts.',
    'Przesun w lewo / w prawo dla sasiadow.',
    {
      es: 'Desliza izquierda / derecha para piezas vecinas.',
      fr: 'Glisse a gauche / droite pour les voisines.',
      de: 'Wische links / rechts fuer Nachbarn.',
      it: 'Scorri sinistra / destra per i pezzi vicini.',
    },
  );

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={sheetStyles.backdrop} onPress={onClose}>
        <Pressable style={sheetStyles.sheetTouchGuard} onPress={() => {}}>
          <Animated.View
            style={[sheetStyles.sheet, { transform: [{ translateY: dragY }] }]}
            {...panResponder.panHandlers}
          >
            <View style={sheetStyles.handle} />

            <View style={sheetStyles.headerRow}>
              <View style={sheetStyles.headerInfo}>
                <Text variant="muted" style={sheetStyles.badge}>
                  {partBadge.toUpperCase()}
                </Text>
                <Text variant="title" style={sheetStyles.title} numberOfLines={2}>
                  {name}
                </Text>
                <Text variant="muted" style={sheetStyles.altName}>
                  {part.nameEn}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={14}
                style={({ pressed }) => [
                  sheetStyles.closeBtn,
                  pressed && sheetStyles.closePressed,
                ]}
                accessibilityLabel={closeLabel}
              >
                <Text variant="accent">{closeLabel}</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={sheetStyles.body}
              showsVerticalScrollIndicator={false}
            >
              <Text variant="body" style={sheetStyles.desc}>{desc}</Text>
              {useText ? (
                <Card style={sheetStyles.useCard} accent="cyan">
                  <Text variant="muted" style={sheetStyles.useLabel}>
                    {useOnBoardLabel.toUpperCase()}
                  </Text>
                  <Text variant="body" style={sheetStyles.useText}>{useText}</Text>
                </Card>
              ) : null}
              <Text variant="muted" style={sheetStyles.swipeHint}>{swipeHint}</Text>
            </ScrollView>

            <View style={sheetStyles.navRow}>
              <Pressable
                onPress={onPrev}
                hitSlop={10}
                style={({ pressed }) => [
                  sheetStyles.navBtn,
                  pressed && sheetStyles.navPressed,
                ]}
              >
                <Text variant="accent" style={sheetStyles.navArrow}>{'<'}</Text>
              </Pressable>
              <Pressable
                onPress={onNext}
                hitSlop={10}
                style={({ pressed }) => [
                  sheetStyles.navBtn,
                  pressed && sheetStyles.navPressed,
                ]}
              >
                <Text variant="accent" style={sheetStyles.navArrow}>{'>'}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxl,
  },
  intro: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  summary: {
    fontSize: 11,
    letterSpacing: 1,
  },
  chipsHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  chipsHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.textSecondary,
  },
  chipsGrid: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.bgCard,
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: colors.surfaceCyanSoft,
    borderColor: colors.borderCyanStrong,
  },
  chipPressed: {
    backgroundColor: colors.bgCardHover,
  },
  chipText: {
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.accentCyan,
    fontWeight: '600',
  },
});

const posterStyles = StyleSheet.create({
  frame: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderCyanFaint,
    overflow: 'hidden',
    backgroundColor: colors.bgSecondary,
  },
  hotspotLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  hotspotHit: {
    position: 'absolute',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const sheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 18, 36, 0.78)',
    justifyContent: 'flex-end',
  },
  sheetTouchGuard: {
    width: '100%',
  },
  sheet: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: colors.borderCyanSoft,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderCyanSoft,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  badge: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.accentCyan,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 24,
    color: colors.accentCyan,
    marginBottom: 2,
  },
  altName: {
    fontSize: 12,
    color: colors.textMuted,
  },
  closeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  closePressed: {
    opacity: 0.7,
  },
  body: {
    paddingBottom: spacing.md,
  },
  desc: {
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  useCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  useLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.accentCyan,
    marginBottom: spacing.xs,
  },
  useText: {
    lineHeight: 20,
  },
  swipeHint: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderCyanFaint,
  },
  navBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    minWidth: 56,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
  },
  navPressed: {
    backgroundColor: colors.bgCardHover,
  },
  navArrow: {
    fontSize: 18,
    fontWeight: '700',
  },
});
