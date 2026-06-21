import { Stack } from 'expo-router';
import {
  Animated,
  AppState,
  Easing,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
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

type PosterLang = 'ru' | 'en';

interface AnatomyPosterAsset {
  id: string;
  titleRu: string;
  titleEn: string;
  thumb: Record<PosterLang, ImageSourcePropType>;
  full: Record<PosterLang, ImageSourcePropType>;
}

const ANATOMY_POSTERS: AnatomyPosterAsset[] = [
  {
    id: 'main-elements',
    titleRu: 'Парусная яхта - основные элементы',
    titleEn: 'Sailing Yacht - Main Elements',
    thumb: {
      ru: require('../../assets/anatomy/posters/main-elements-ru-thumb.jpg'),
      en: require('../../assets/anatomy/posters/main-elements-en-thumb.jpg'),
    },
    full: {
      ru: require('../../assets/anatomy/posters/main-elements-ru.jpg'),
      en: require('../../assets/anatomy/posters/main-elements-en.jpg'),
    },
  },
  {
    id: 'deck-cockpit',
    titleRu: 'Палуба и кокпит',
    titleEn: 'Deck and Cockpit',
    thumb: {
      ru: require('../../assets/anatomy/posters/deck-cockpit-ru-thumb.jpg'),
      en: require('../../assets/anatomy/posters/deck-cockpit-en-thumb.jpg'),
    },
    full: {
      ru: require('../../assets/anatomy/posters/deck-cockpit-ru.jpg'),
      en: require('../../assets/anatomy/posters/deck-cockpit-en.jpg'),
    },
  },
];

function posterTitle(poster: AnatomyPosterAsset, posterLang: PosterLang): string {
  return posterLang === 'ru' ? poster.titleRu : poster.titleEn;
}

export default function Anatomy() {
  const { tp, lang } = useI18n();
  const { width: screenWidth } = useWindowDimensions();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePosterId, setActivePosterId] = useState<string | null>(null);

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

  const photoCaption = tp(
    'Современная гоночная яхта - вид сверху.',
    'Modern racing yacht - top-down view.',
    'Wspolczesny jacht regatowy - widok z gory.',
    {
      es: 'Yate de regatas moderno - vista cenital.',
      fr: 'Yacht de regate moderne - vue de dessus.',
      de: 'Moderne Regattayacht - Blick von oben.',
      it: 'Yacht da regata moderno - vista dall\'alto.',
    },
  );

  const posterWidth = Math.max(280, screenWidth - POSTER_HORIZONTAL_PADDING);
  const posterHeight = (posterWidth * YACHT_VIEWBOX.height) / YACHT_VIEWBOX.width;
  const posterLang: PosterLang | null = lang === 'ru' ? 'ru' : lang === 'en' ? 'en' : null;

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

        <View style={styles.photoFrame}>
          <Image
            source={require('../../assets/anatomy/yacht-top.png')}
            style={styles.photo}
            resizeMode="contain"
            accessible
            accessibilityLabel={photoCaption}
          />
        </View>
        <Text variant="muted" style={styles.photoCaption}>{photoCaption}</Text>

        <YachtPoster
          width={posterWidth}
          height={posterHeight}
          parts={partsWithHotspot}
          activeId={activeId}
          onSelect={setActiveId}
          pickName={(p) => legacyPick(p, 'name', lang)}
        />

        {posterLang ? (
          <PosterGallery
            posterLang={posterLang}
            activePosterId={activePosterId}
            onOpen={setActivePosterId}
            onClose={() => setActivePosterId(null)}
          />
        ) : null}

        <View style={styles.chipsHeader}>
          <Text variant="muted" style={styles.chipsHeaderText}>
            {allPartsLabel.toUpperCase()}
          </Text>
        </View>
        <View style={styles.chipsGrid}>
          {anatomyParts.map((p) => {
            const active = activeId === p.id;
            const partName = legacyPick(p, 'name', lang);
            return (
              <Pressable
                key={p.id}
                onPress={() => setActiveId(p.id)}
                accessibilityRole="button"
                accessibilityLabel={partName}
                accessibilityState={{ selected: active }}
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
                  {partName}
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

  // The pulse must run on the JS driver because it animates SVG attributes
  // (radius / opacity) which the native driver does not support. Pause the
  // loop while the app is backgrounded so we don't burn JS-bridge cycles
  // updating animations on a screen the user can't see.
  useEffect(() => {
    const buildLoop = () =>
      Animated.loop(
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

    let loop: Animated.CompositeAnimation | null = null;
    const start = () => {
      if (loop) return;
      loop = buildLoop();
      loop.start();
    };
    const stop = () => {
      loop?.stop();
      loop = null;
    };
    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') start();
      else stop();
    });
    return () => {
      stop();
      sub.remove();
    };
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
              accessibilityRole="button"
              accessibilityLabel={pickName(part)}
              accessibilityState={{ selected: active }}
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

interface PosterGalleryProps {
  posterLang: PosterLang;
  activePosterId: string | null;
  onOpen: (id: string) => void;
  onClose: () => void;
}

function PosterGallery({
  posterLang,
  activePosterId,
  onOpen,
  onClose,
}: PosterGalleryProps) {
  const { tp } = useI18n();
  const activePoster = activePosterId
    ? ANATOMY_POSTERS.find((p) => p.id === activePosterId) ?? null
    : null;

  const sectionTitle = tp('Графика', 'Graphics', 'Graphics', {
    es: 'Graficos',
    fr: 'Graphiques',
    de: 'Grafiken',
    it: 'Grafiche',
  });
  const sectionMeta = tp('Постеры с сайта', 'Website posters', 'Postery ze strony', {
    es: 'Posters del sitio',
    fr: 'Affiches du site',
    de: 'Website-Poster',
    it: 'Poster del sito',
  });
  const closeLabel = tp('Закрыть', 'Close', 'Zamknij', {
    es: 'Cerrar',
    fr: 'Fermer',
    de: 'Schliessen',
    it: 'Chiudi',
  });

  return (
    <View style={posterGalleryStyles.section}>
      <View style={posterGalleryStyles.header}>
        <Text variant="subtitle">{sectionTitle}</Text>
        <Text variant="muted" style={posterGalleryStyles.meta}>{sectionMeta}</Text>
      </View>

      <View style={posterGalleryStyles.grid}>
        {ANATOMY_POSTERS.map((poster) => {
          const title = posterTitle(poster, posterLang);
          return (
            <Pressable
              key={poster.id}
              onPress={() => onOpen(poster.id)}
              accessibilityRole="imagebutton"
              accessibilityLabel={title}
              style={({ pressed }) => [
                posterGalleryStyles.card,
                pressed && posterGalleryStyles.cardPressed,
              ]}
            >
              <Image
                source={poster.thumb[posterLang]}
                style={posterGalleryStyles.thumb}
                resizeMode="cover"
                accessible
                accessibilityLabel={title}
              />
              <View style={posterGalleryStyles.cardCaption}>
                <Text style={posterGalleryStyles.cardTitle} numberOfLines={2}>
                  {title}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Modal
        visible={!!activePoster}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <Pressable style={posterLightboxStyles.backdrop} onPress={onClose}>
          {activePoster ? (
            <Pressable style={posterLightboxStyles.body} onPress={() => {}}>
              <Image
                source={activePoster.full[posterLang]}
                style={posterLightboxStyles.image}
                resizeMode="contain"
                accessible
                accessibilityLabel={posterTitle(activePoster, posterLang)}
              />
              <View style={posterLightboxStyles.footer}>
                <Text style={posterLightboxStyles.title} numberOfLines={2}>
                  {posterTitle(activePoster, posterLang)}
                </Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={closeLabel}
                  style={({ pressed }) => [
                    posterLightboxStyles.closeBtn,
                    pressed && posterLightboxStyles.closeBtnPressed,
                  ]}
                >
                  <Text variant="accent" style={posterLightboxStyles.closeText}>
                    {closeLabel}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
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
  const prevLabel = tp('Предыдущая деталь', 'Previous part', 'Poprzedni element', {
    es: 'Pieza anterior',
    fr: 'Piece precedente',
    de: 'Vorheriges Teil',
    it: 'Pezzo precedente',
  });
  const nextLabel = tp('Следующая деталь', 'Next part', 'Nastepny element', {
    es: 'Pieza siguiente',
    fr: 'Piece suivante',
    de: 'Naechstes Teil',
    it: 'Pezzo successivo',
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
                accessibilityRole="button"
                accessibilityLabel={prevLabel}
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
                accessibilityRole="button"
                accessibilityLabel={nextLabel}
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
  photoFrame: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderCyanFaint,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoCaption: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    fontSize: 11,
    letterSpacing: 0.5,
    textAlign: 'center',
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

const posterGalleryStyles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  meta: {
    fontSize: 11,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    minHeight: 178,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
  },
  cardPressed: {
    opacity: 0.84,
    borderColor: colors.borderCyanStrong,
  },
  thumb: {
    width: '100%',
    height: 142,
  },
  cardCaption: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 22, 40, 0.86)',
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
});

const posterLightboxStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 11, 24, 0.94)',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  image: {
    flex: 1,
    width: '100%',
    borderRadius: radii.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(15, 32, 53, 0.92)',
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  closeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  closeBtnPressed: {
    opacity: 0.7,
  },
  closeText: {
    fontSize: 14,
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
