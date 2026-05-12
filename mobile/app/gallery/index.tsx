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
 * v1 renders a single-column scrollable list. A masonry / 2-column grid
 * is a polish item for v1.x.
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

export default function Gallery() {
  const { tp, lang } = useI18n();

  const headerTitle = tp('Галерея', 'Gallery', 'Galeria', {
    es: 'Galeria',
    fr: 'Galerie',
    de: 'Galerie',
    it: 'Galleria',
  });

  const summary = tp(
    `${galleryItems.length} элементов, загрузка из сети`,
    `${galleryItems.length} items, loaded over the network`,
    `${galleryItems.length} elementow, ladowanie z sieci`,
    {
      es: `${galleryItems.length} elementos, carga desde la red`,
      fr: `${galleryItems.length} elements, charges depuis le reseau`,
      de: `${galleryItems.length} Elemente, Netzwerk-Laden`,
      it: `${galleryItems.length} elementi, caricamento dalla rete`,
    },
  );

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

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Text variant="caption">{summary}</Text>
        </View>
        {galleryItems.map((item) => {
          const itemTitle = legacyPick(item, 'title', lang);
          const ratio = aspectRatio(item.kind === 'youtube' ? '16:9' : item.aspect);
          const kindLabel = item.kind === 'youtube'
            ? tp('видео', 'video', 'wideo', {
                es: 'video',
                fr: 'video',
                de: 'Video',
                it: 'video',
              })
            : tp('фото', 'photo', 'zdjecie', {
                es: 'foto',
                fr: 'photo',
                de: 'Foto',
                it: 'foto',
              });
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
                    <View style={styles.playTriangle} />
                  </View>
                ) : null}
                {item.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text variant="caption" style={styles.title} numberOfLines={2}>
                {itemTitle}
              </Text>
            </Pressable>
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
  playTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 22,
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderLeftColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 6,
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(10, 22, 40, 0.85)',
    borderColor: 'rgba(0, 212, 255, 0.40)',
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: colors.accentCyan,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
});
