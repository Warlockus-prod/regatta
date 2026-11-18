import { Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { VoxNativeAd, VoxNativeAdContainer, type VoxNativeAdFields } from '../../modules/vox-ads';
import { RequestPanel, statusFromFailure, type AdRequestState } from '../../src/ads/AdSlot';
import { FakeCard, FakeHeading, FakeParagraph } from '../../src/ads/FakeContent';
import { useAdsText } from '../../src/ads/strings';
import { VOX_APP_PAGE_URL, placement } from '../../src/ads/vox-placements';
import { Screen, Text } from '../../src/design-system/components';
import { colors, radii, spacing } from '../../src/design-system/tokens';
import { useI18n } from '../../src/i18n/context';

const NATIVE = placement('native');

/**
 * Native ad in a feed (VOX SDK 1.4.0+). The SDK returns the fields (headline, advertiser,
 * button, icon, main image); the app draws them as one of its own cards. The SDK counts the
 * impression when half of the card is visible for one second; a tap opens the SSP click URL.
 */
export default function AdsNativeScreen() {
  const text = useAdsText();
  const { lang } = useI18n();
  const [ad, setAd] = useState<VoxNativeAdFields | null>(null);
  const [state, setState] = useState<AdRequestState>({ status: VoxNativeAd ? 'loading' : 'idle' });
  const [reloadKey, setReloadKey] = useState(0);
  const current = useRef<string | null>(null);

  useEffect(() => {
    if (!VoxNativeAd) return;
    let cancelled = false;
    const startedAt = Date.now();
    setAd(null);
    setState({ status: 'loading' });
    VoxNativeAd.load(NATIVE.placeId, VOX_APP_PAGE_URL, lang)
      .then((fields) => {
        if (cancelled) {
          VoxNativeAd?.release(fields.handle);
          return;
        }
        current.current = fields.handle;
        setAd(fields);
        setState({ status: 'loaded', ms: Date.now() - startedAt });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setState({ status: statusFromFailure(message), ms: Date.now() - startedAt, detail: message });
      });
    return () => {
      cancelled = true;
      if (current.current) VoxNativeAd?.release(current.current);
      current.current = null;
    };
  }, [lang, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const open = useCallback(() => {
    if (ad) VoxNativeAd?.click(ad.handle);
  }, [ad]);

  return (
    <Screen>
      <Stack.Screen options={{ title: text.formats.native.title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <FakeHeading />
        <FakeCard />
        <Text variant="caption" style={styles.label}>{`${text.adLabel.toUpperCase()} · NATIVE`}</Text>
        {ad && VoxNativeAdContainer ? (
          <VoxNativeAdContainer handle={ad.handle} style={styles.card}>
            <Pressable onPress={open} accessibilityRole="link" accessibilityLabel={ad.title || ad.advertiser} style={styles.cardInner}>
              <View style={styles.header}>
                {ad.iconUrl ? <Image source={{ uri: ad.iconUrl }} style={styles.icon} accessibilityIgnoresInvertColors /> : null}
                <View style={styles.headerText}>
                  <Text variant="subtitle" numberOfLines={1}>{ad.advertiser || ad.title}</Text>
                  <Text variant="caption" style={styles.sponsored}>{text.native.sponsored}</Text>
                </View>
                {ad.ageRating ? <Text variant="caption" style={styles.sponsored}>{ad.ageRating}</Text> : null}
              </View>
              {ad.mainImageUrl ? (
                <Image source={{ uri: ad.mainImageUrl }} style={styles.main} resizeMode="cover" accessibilityIgnoresInvertColors />
              ) : null}
              {ad.title ? <Text variant="subtitle">{ad.title}</Text> : null}
              <View style={styles.cta}>
                <Text variant="subtitle" style={styles.ctaText}>{ad.callToAction || text.native.defaultCta}</Text>
              </View>
            </Pressable>
          </VoxNativeAdContainer>
        ) : (
          <View style={styles.empty}>
            <Text variant="caption" style={styles.emptyText}>native</Text>
          </View>
        )}
        <Text variant="caption" style={styles.label}>{text.native.note}</Text>
        <RequestPanel
          sdk="vox1"
          placement={NATIVE}
          state={state}
          text={text}
          onReload={VoxNativeAd ? reload : undefined}
        />
        <FakeCard />
        <FakeParagraph lines={4} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  label: {
    color: colors.textSecondary,
  },
  card: {
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.bgSecondary,
  },
  cardInner: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
  },
  sponsored: {
    color: colors.textMuted,
  },
  main: {
    width: '100%',
    aspectRatio: NATIVE.width / NATIVE.height,
    borderRadius: radii.sm,
  },
  cta: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radii.control,
    backgroundColor: colors.accentCyan,
  },
  ctaText: {
    color: colors.bgPrimary,
  },
  empty: {
    aspectRatio: NATIVE.width / NATIVE.height,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderCyanStrong,
    borderRadius: radii.sm,
  },
  emptyText: {
    color: colors.textMuted,
    letterSpacing: 1,
  },
});
