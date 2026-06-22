import { Stack } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../src/i18n/context';
import { Screen, Text } from '../../src/design-system/components';
import { galleryItems } from '../../src/data';
import type { GalleryItem } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { colors, radii, spacing } from '../../src/design-system/tokens';

/**
 * Gallery: photos and videos from past regattas, served from the web client at
 * `regatta.icoffio.com`. Mirrors the website: a small-thumbnail collage grouped
 * by year (the year shown once per section header, never per tile), photos open
 * in an in-app lightbox (tap to enlarge + pinch to zoom), videos open in
 * YouTube. Per ADR-0004 this is a Tier 2 screen (network read with the RN image
 * cache serving repeat visits).
 */

const WEB_BASE = 'https://regatta.icoffio.com';
const NO_YEAR = 'misc'; // group key for photos without a year badge

function thumbUrl(item: GalleryItem): string {
  if (item.kind === 'youtube') return `https://img.youtube.com/vi/${item.src}/hqdefault.jpg`;
  return `${WEB_BASE}${item.thumb ?? item.src}`;
}
function fullUrl(item: GalleryItem): string {
  return `${WEB_BASE}${item.src}`;
}
function youtubeUrl(item: GalleryItem): string {
  return `https://www.youtube.com/watch?v=${item.src}`;
}

export default function Gallery() {
  const { tp, lang } = useI18n();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  // 3-column square grid for photos, 2-column 16:9 for videos.
  const gap = spacing.xs;
  const padH = spacing.lg;
  const photoSize = Math.floor((width - padH * 2 - gap * 2) / 3);
  const videoW = Math.floor((width - padH * 2 - gap) / 2);
  const videoH = Math.round((videoW * 9) / 16);

  const headerTitle = tp('Галерея', 'Gallery', 'Galeria', { es: 'Galeria', fr: 'Galerie', de: 'Galerie', it: 'Galleria' });
  const intro = tp(
    'Видео и фото с прошлых регат. Нажми на фото, чтобы увеличить.',
    'Videos and photos from past regattas. Tap a photo to enlarge.',
    'Wideo i zdjecia z przeszlych regat. Kliknij zdjecie, aby powiekszyc.',
    {
      es: 'Videos y fotos de regatas pasadas. Pulsa una foto para ampliar.',
      fr: 'Videos et photos des regates passees. Touchez une photo pour agrandir.',
      de: 'Videos und Fotos vergangener Regatten. Tippe ein Foto zum Vergroessern.',
      it: 'Video e foto di regate passate. Tocca una foto per ingrandire.',
    },
  );
  const videosLabel = tp('Видео', 'Videos', 'Wideo', { es: 'Videos', fr: 'Videos', de: 'Videos', it: 'Video' });
  const closeLabel = tp('Закрыть', 'Close', 'Zamknij', { es: 'Cerrar', fr: 'Fermer', de: 'Schliessen', it: 'Chiudi' });
  const openErrorTitle = tp('Не получилось открыть', 'Could not open', 'Nie mozna otworzyc', { es: 'No se pudo abrir', fr: 'Impossible d\'ouvrir', de: 'Konnte nicht oeffnen', it: 'Impossibile aprire' });
  const openErrorBody = tp(
    'YouTube не отвечает. Проверьте интернет и попробуйте ещё раз.',
    'YouTube did not respond. Check your connection and try again.',
    'YouTube nie odpowiada. Sprawdz internet i sprobuj ponownie.',
    {
      es: 'YouTube no respondio. Comprueba la conexion e intenta de nuevo.',
      fr: 'YouTube ne repond pas. Verifiez la connexion et reessayez.',
      de: 'YouTube reagiert nicht. Verbindung pruefen und erneut versuchen.',
      it: 'YouTube non risponde. Controlla la connessione e riprova.',
    },
  );

  const openVideo = async (item: GalleryItem) => {
    const url = youtubeUrl(item);
    try {
      if (!(await Linking.canOpenURL(url))) {
        Alert.alert(openErrorTitle, openErrorBody);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(openErrorTitle, openErrorBody);
    }
  };

  const videos = galleryItems.filter((i) => i.kind === 'youtube');
  const photos = galleryItems.filter((i) => i.kind !== 'youtube');
  const photosByYear = new Map<string, GalleryItem[]>();
  for (const p of photos) {
    const key = p.badge ?? NO_YEAR;
    const arr = photosByYear.get(key);
    if (arr) arr.push(p);
    else photosByYear.set(key, [p]);
  }
  const years = Array.from(photosByYear.keys()).sort().reverse();

  const photoThumb = (item: GalleryItem) => {
    const title = legacyPick(item, 'title', lang);
    return (
      <Pressable
        key={item.id}
        onPress={() => setLightbox(item)}
        accessibilityRole="imagebutton"
        accessibilityLabel={title}
        style={({ pressed }) => [{ width: photoSize, height: photoSize }, styles.thumb, pressed && styles.pressed]}
      >
        <Image source={{ uri: thumbUrl(item) }} style={styles.thumbImg} resizeMode="cover" />
      </Pressable>
    );
  };

  const videoThumb = (item: GalleryItem) => {
    const title = legacyPick(item, 'title', lang);
    return (
      <Pressable
        key={item.id}
        onPress={() => { void openVideo(item); }}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={({ pressed }) => [{ width: videoW, height: videoH }, styles.thumb, pressed && styles.pressed]}
      >
        <Image source={{ uri: thumbUrl(item) }} style={styles.thumbImg} resizeMode="cover" />
        <View style={styles.playOverlay}>
          <View style={styles.playCircle}>
            <View style={styles.playTriangle} />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Text variant="caption">{intro}</Text>
        </View>

        {videos.length > 0 ? (
          <View style={styles.section}>
            <Text variant="subtitle" style={styles.sectionTitle}>{videosLabel}</Text>
            <View style={[styles.grid, { paddingHorizontal: padH, gap }]}>{videos.map(videoThumb)}</View>
          </View>
        ) : null}

        {years.map((year) => {
          const items = photosByYear.get(year) ?? [];
          const label = year === NO_YEAR ? headerTitle : year;
          return (
            <View key={year} style={styles.section}>
              {/* Year shown once here - never on each tile. */}
              <Text variant="subtitle" style={styles.sectionTitle}>{label}</Text>
              <View style={[styles.grid, { paddingHorizontal: padH, gap }]}>{items.map(photoThumb)}</View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={lightbox !== null} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <View style={styles.lightboxRoot}>
          <ScrollView
            style={styles.lightboxScroll}
            contentContainerStyle={styles.lightboxContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
            centerContent
          >
            <Pressable style={styles.lightboxTap} onPress={() => setLightbox(null)} accessibilityRole="button" accessibilityLabel={closeLabel}>
              {lightbox ? (
                <Image
                  source={{ uri: fullUrl(lightbox) }}
                  style={{ width, height: Math.round(height * 0.85) }}
                  resizeMode="contain"
                />
              ) : null}
            </Pressable>
          </ScrollView>
          {lightbox ? (
            <Text variant="caption" style={[styles.lightboxTitle, { bottom: insets.bottom + spacing.lg }]} numberOfLines={2}>
              {legacyPick(lightbox, 'title', lang)}
            </Text>
          ) : null}
          <Pressable
            onPress={() => setLightbox(null)}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            hitSlop={12}
            style={[styles.lightboxClose, { top: insets.top + spacing.sm }]}
          >
            <Text style={styles.lightboxCloseGlyph}>{'×'}</Text>
          </Pressable>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxl,
  },
  intro: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  thumb: {
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
    position: 'relative',
  },
  pressed: {
    opacity: 0.8,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 212, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderTopWidth: 11,
    borderBottomWidth: 11,
    borderLeftColor: '#0a1628',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 5,
  },
  lightboxRoot: {
    flex: 1,
    backgroundColor: 'rgba(2, 8, 18, 0.97)',
  },
  lightboxScroll: {
    flex: 1,
  },
  lightboxContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxTap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxTitle: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  lightboxClose: {
    position: 'absolute',
    right: spacing.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCloseGlyph: {
    color: colors.textPrimary,
    fontSize: 30,
    lineHeight: 32,
  },
});
