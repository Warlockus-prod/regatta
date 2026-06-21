import { Stack } from 'expo-router';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import { Screen, Text } from '../../src/design-system/components';
import { galleryItems } from '../../src/data';
import type { GalleryAspect, GalleryItem } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { colors, radii, spacing } from '../../src/design-system/tokens';

/**
 * Gallery: photos and videos from past regattas, served from the web
 * client at `regatta.icoffio.com`. Per ADR-0004 this is a Tier 2 screen
 * (network read with cached fallback): images load from the network on
 * first view and RN's image cache serves them on repeat visits. Tap an
 * item to open the full-resolution image or the YouTube video in the
 * default browser / YouTube app.
 *
 * Layout: videos and photos are split into separate sections so a video
 * never reads as just another photo. Photos are grouped by year, and the
 * year is shown once on the section header instead of as a badge on every
 * tile (which was redundant noise).
 */

const WEB_BASE = 'https://regatta.icoffio.com';

function imageUrl(item: GalleryItem): string {
  if (item.kind === 'youtube') {
    // hqdefault is widely available, ~480x360.
    return `https://img.youtube.com/vi/${item.src}/hqdefault.jpg`;
  }
  // Prefer the smaller thumb for the list to save bandwidth.
  const path = item.thumb ?? item.src;
  return `${WEB_BASE}${path}`;
}

function urlForItem(item: GalleryItem): string {
  return item.kind === 'youtube'
    ? `https://www.youtube.com/watch?v=${item.src}`
    : `${WEB_BASE}${item.src}`;
}

function aspectRatio(aspect: GalleryAspect | undefined): number {
  switch (aspect) {
    case '16:9': return 16 / 9;
    case 'landscape': return 4 / 3;
    case 'portrait': return 3 / 4;
    case 'square':
    default: return 1;
  }
}

const NO_YEAR = 'misc'; // group key for photos without a year badge

export default function Gallery() {
  const { tp, lang } = useI18n();

  const headerTitle = tp('Галерея', 'Gallery', 'Galeria', {
    es: 'Galeria',
    fr: 'Galerie',
    de: 'Galerie',
    it: 'Galleria',
  });

  const intro = tp(
    'Видео и фото с прошлых регат. Нажми, чтобы открыть.',
    'Videos and photos from past regattas. Tap to open.',
    'Wideo i zdjecia z przeszlych regat. Kliknij, aby otworzyc.',
    {
      es: 'Videos y fotos de regatas pasadas. Pulsa para abrir.',
      fr: 'Videos et photos des regates passees. Touchez pour ouvrir.',
      de: 'Videos und Fotos vergangener Regatten. Zum Oeffnen tippen.',
      it: 'Video e foto di regate passate. Tocca per aprire.',
    },
  );

  const videosLabel = tp('Видео', 'Videos', 'Wideo', {
    es: 'Videos',
    fr: 'Videos',
    de: 'Videos',
    it: 'Video',
  });

  const openErrorTitle = tp('Не получилось открыть', 'Could not open', 'Nie mozna otworzyc', {
    es: 'No se pudo abrir',
    fr: 'Impossible douvrir',
    de: 'Konnte nicht oeffnen',
    it: 'Impossibile aprire',
  });
  const openErrorBody = tp(
    'Браузер или YouTube не отвечает. Проверьте интернет и попробуйте ещё раз.',
    'Browser or YouTube did not respond. Check your connection and try again.',
    'Przegladarka lub YouTube nie odpowiada. Sprawdz internet i sprobuj ponownie.',
    {
      es: 'El navegador o YouTube no respondio. Comprueba la conexion e intenta de nuevo.',
      fr: 'Le navigateur ou YouTube ne repond pas. Verifiez la connexion et reessayez.',
      de: 'Browser oder YouTube reagiert nicht. Verbindung pruefen und erneut versuchen.',
      it: 'Browser o YouTube non risponde. Controlla la connessione e riprova.',
    },
  );

  const photoCountLabel = (n: number) =>
    tp(
      `${n} фото`,
      `${n} ${n === 1 ? 'photo' : 'photos'}`,
      `${n} ${n === 1 ? 'zdjecie' : 'zdjec'}`,
      {
        es: `${n} ${n === 1 ? 'foto' : 'fotos'}`,
        fr: `${n} ${n === 1 ? 'photo' : 'photos'}`,
        de: `${n} ${n === 1 ? 'Foto' : 'Fotos'}`,
        it: `${n} foto`,
      },
    );
  const videoCountLabel = (n: number) =>
    tp(
      `${n} видео`,
      `${n} ${n === 1 ? 'video' : 'videos'}`,
      `${n} wideo`,
      {
        es: `${n} ${n === 1 ? 'video' : 'videos'}`,
        fr: `${n} ${n === 1 ? 'video' : 'videos'}`,
        de: `${n} ${n === 1 ? 'Video' : 'Videos'}`,
        it: `${n} video`,
      },
    );

  const openItem = async (item: GalleryItem) => {
    const url = urlForItem(item);
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        Alert.alert(openErrorTitle, openErrorBody);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(openErrorTitle, openErrorBody);
    }
  };

  // Split videos out, then group the photos by year (badge), newest first.
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

  const renderTile = (item: GalleryItem) => {
    const itemTitle = legacyPick(item, 'title', lang);
    const ratio = aspectRatio(item.kind === 'youtube' ? '16:9' : item.aspect);
    const kindLabel = item.kind === 'youtube'
      ? tp('видео', 'video', 'wideo', { es: 'video', fr: 'video', de: 'Video', it: 'video' })
      : tp('фото', 'photo', 'zdjecie', { es: 'foto', fr: 'photo', de: 'Foto', it: 'foto' });
    const tileA11y = tp(
      `Открыть ${kindLabel}: ${itemTitle}`,
      `Open ${kindLabel}: ${itemTitle}`,
      `Otworz ${kindLabel}: ${itemTitle}`,
      {
        es: `Abrir ${kindLabel}: ${itemTitle}`,
        fr: `Ouvrir ${kindLabel} : ${itemTitle}`,
        de: `${kindLabel} oeffnen: ${itemTitle}`,
        it: `Apri ${kindLabel}: ${itemTitle}`,
      },
    );
    return (
      <Pressable
        key={item.id}
        onPress={() => { void openItem(item); }}
        accessibilityRole="button"
        accessibilityLabel={tileA11y}
        style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      >
        <View style={[styles.imageWrap, { aspectRatio: ratio }]}>
          <Image
            source={{ uri: imageUrl(item) }}
            style={styles.image}
            resizeMode="cover"
          />
          {item.kind === 'youtube' ? (
            <View style={styles.playOverlay}>
              <View style={styles.playCircle}>
                <View style={styles.playTriangle} />
              </View>
            </View>
          ) : null}
        </View>
        <Text variant="caption" style={styles.title} numberOfLines={2}>
          {itemTitle}
        </Text>
      </Pressable>
    );
  };

  const SectionHeader = ({ label, count }: { label: string; count: string }) => (
    <View style={styles.sectionHeader}>
      <Text variant="subtitle" style={styles.sectionTitle}>{label}</Text>
      <Text variant="caption" style={styles.sectionCount}>{count}</Text>
    </View>
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Text variant="caption">{intro}</Text>
        </View>

        {videos.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader label={videosLabel} count={videoCountLabel(videos.length)} />
            {videos.map(renderTile)}
          </View>
        ) : null}

        {years.map((year) => {
          const items = photosByYear.get(year) ?? [];
          const label = year === NO_YEAR ? headerTitle : year;
          return (
            <View key={year} style={styles.section}>
              <SectionHeader label={label} count={photoCountLabel(items.length)} />
              {items.map(renderTile)}
            </View>
          );
        })}
      </ScrollView>
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
    marginTop: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionCount: {
    color: colors.textMuted,
  },
  tile: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  tilePressed: {
    opacity: 0.85,
  },
  imageWrap: {
    width: '100%',
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
    position: 'relative',
  },
  image: {
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 212, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 22,
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderLeftColor: '#0a1628',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 6,
  },
  title: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
});
