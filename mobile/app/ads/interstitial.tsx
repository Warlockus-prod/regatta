import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { VoxAds } from '../../modules/vox-ads';
import { VoxPrebid } from '../../modules/vox-prebid';
import { RequestPanel, statusFromFailure, type AdRequestState } from '../../src/ads/AdSlot';
import { ensurePrebidStarted, prebidConfigId, useAdSdk } from '../../src/ads/sdk';
import { FakeParagraph } from '../../src/ads/FakeContent';
import { useAdsText } from '../../src/ads/strings';
import { placement } from '../../src/ads/vox-placements';
import { Button, Card, Screen, Text } from '../../src/design-system/components';
import { colors, spacing } from '../../src/design-system/tokens';

const INTERSTITIAL = placement('interstitial');

/** Interstitial: a race-finish screen whose "Next race" asks the selected SDK for a full-screen ad. */
export default function AdsInterstitialScreen() {
  const text = useAdsText();
  const sdk = useAdSdk();
  const [state, setState] = useState<AdRequestState>({ status: 'idle' });
  const startedAt = useRef(0);

  const show = () => {
    const fail = (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      setState({ status: statusFromFailure(message), ms: Date.now() - startedAt.current, detail: message });
    };
    startedAt.current = Date.now();
    if (sdk === 'vox1') {
      if (!VoxAds) return setState({ status: 'error', detail: text.unavailable });
      setState({ status: 'loading' });
      VoxAds.showFullScreen(INTERSTITIAL.placeId, 3).then(
        () => setState({ status: 'loaded', ms: Date.now() - startedAt.current }),
        fail,
      );
      return;
    }
    const prebid = VoxPrebid;
    if (!prebid) return setState({ status: 'error', detail: text.unavailable });
    setState({ status: 'loading' });
    ensurePrebidStarted()
      .then(() => prebid.showInterstitial(prebidConfigId(INTERSTITIAL), false))
      .then((result) => setState({ status: result.shown ? 'loaded' : 'noFill', ms: Date.now() - startedAt.current }), fail);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: text.formats.interstitial.title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.finish}>
          <Text variant="title" style={styles.place}>3 / 8</Text>
          <Text variant="subtitle" style={styles.center}>{text.interstitial.finish}</Text>
          <FakeParagraph lines={3} />
          <Button onPress={show} disabled={state.status === 'loading'}>{text.interstitial.next}</Button>
        </Card>
        <Text variant="caption" style={styles.explain}>{text.interstitial.explain}</Text>
        <RequestPanel sdk={sdk} placement={INTERSTITIAL} state={state} text={text} />
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
  finish: {
    gap: spacing.lg,
    paddingVertical: spacing.xl,
  },
  place: {
    textAlign: 'center',
    fontSize: 48,
    lineHeight: 58,
  },
  center: {
    textAlign: 'center',
  },
  explain: {
    color: colors.textSecondary,
  },
});
