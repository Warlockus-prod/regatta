import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { VoxAdView } from '../../modules/vox-ads';
import { VoxPrebid } from '../../modules/vox-prebid';
import { RequestPanel, statusFromFailure, type AdRequestState } from '../../src/ads/AdSlot';
import { ensurePrebidStarted, prebidConfigId, useAdSdk } from '../../src/ads/sdk';
import { useAdsText, type AdsText } from '../../src/ads/strings';
import { placement } from '../../src/ads/vox-placements';
import { Button, Card, Screen, Text } from '../../src/design-system/components';
import { colors, radii, spacing } from '../../src/design-system/tokens';

const REWARDED = placement('rewarded');
/** VOX SDK 1 has no completion callback, so the app grants the reward after this watch time. */
const REWARD_SECONDS = 15;

/**
 * Rewarded video. VOX SDK 1 has no such format: the app plays a full-screen
 * VAST video and grants the reward after REWARD_SECONDS of a loaded ad
 * (closing earlier forfeits it). VOX SDK 2 uses Prebid's rewarded unit and
 * grants the reward on its "user earned reward" event.
 */
export default function AdsRewardedScreen() {
  const text = useAdsText();
  const sdk = useAdSdk();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<AdRequestState>({ status: 'idle' });
  const [rewards, setRewards] = useState(0);
  const startedAt = useRef(0);

  const watch = () => {
    if (sdk === 'vox1') return setOpen(true);
    const prebid = VoxPrebid;
    if (!prebid) return setState({ status: 'error', detail: text.unavailable });
    startedAt.current = Date.now();
    setState({ status: 'loading' });
    ensurePrebidStarted()
      .then(() => prebid.showRewarded(prebidConfigId(REWARDED)))
      .then(
        (result) => {
          setState({ status: result.shown ? 'loaded' : 'noFill', ms: Date.now() - startedAt.current });
          if (result.rewarded) setRewards((count) => count + 1);
        },
        (error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          setState({ status: statusFromFailure(message), ms: Date.now() - startedAt.current, detail: message });
        },
      );
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: text.formats.rewarded.title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.offer}>
          <Text variant="subtitle">{text.rewarded.offer}</Text>
          <Text variant="caption" style={styles.secondary}>{text.rewarded.offerHint}</Text>
          <Button onPress={watch} disabled={state.status === 'loading'}>{text.rewarded.watch}</Button>
          {rewards > 0 ? <Text variant="accent">{`${text.rewarded.granted} (${rewards})`}</Text> : null}
        </Card>
        <RequestPanel sdk={sdk} placement={REWARDED} state={state} text={text} />
        <Text variant="caption" style={styles.secondary}>{sdk === 'vox1' ? text.rewarded.sdkNote : text.rewarded.sdk2Note}</Text>
      </ScrollView>
      <Modal visible={open} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setOpen(false)}>
        {/* A Modal is its own native root and needs its own safe-area provider. */}
        <SafeAreaProvider>
          {open ? (
            <RewardedPlayer
              text={text}
              onState={setState}
              onClose={(granted) => {
                if (granted) setRewards((count) => count + 1);
                setOpen(false);
              }}
            />
          ) : null}
        </SafeAreaProvider>
      </Modal>
    </Screen>
  );
}

function RewardedPlayer({
  text,
  onState,
  onClose,
}: {
  text: AdsText;
  onState: (state: AdRequestState) => void;
  onClose: (granted: boolean) => void;
}) {
  const { width, height } = useWindowDimensions();
  const videoWidth = Math.min(width, Math.round(((height - 160) * 9) / 16));
  const videoHeight = Math.round((videoWidth * 16) / 9);
  const [left, setLeft] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    onState({ status: VoxAdView ? 'loading' : 'idle' });
  }, [onState]);

  useEffect(() => {
    if (left === null || left <= 0) return;
    const timer = setTimeout(() => setLeft((value) => (value === null ? null : value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  const granted = left === 0;
  const headline = granted
    ? text.rewarded.granted
    : left !== null
      ? text.rewarded.countdown.replace('{n}', String(left))
      : failed
        ? text.status.noFill
        : text.status.loading;

  return (
    <SafeAreaView style={styles.player} edges={['top', 'bottom']}>
      <View style={styles.playerBar}>
        <Text variant="subtitle" style={granted ? styles.grantedText : styles.playerText}>{headline}</Text>
        <Pressable
          onPress={() => onClose(granted)}
          accessibilityRole="button"
          accessibilityLabel={granted ? text.close : text.rewarded.forfeit}
          style={styles.closeButton}
          hitSlop={8}
        >
          <Text variant="accent">{granted ? text.close : text.rewarded.forfeit}</Text>
        </Pressable>
      </View>
      <View style={styles.stage}>
        <View style={[styles.video, { width: videoWidth, height: videoHeight }]}>
          {VoxAdView ? (
            <VoxAdView
              style={{ width: videoWidth, height: videoHeight }}
              placeId={REWARDED.placeId}
              kind="video"
              closeButtonDelay={REWARD_SECONDS}
              onAdLoaded={() => {
                onState({ status: 'loaded', ms: Date.now() - startedAt.current });
                setLeft(REWARD_SECONDS);
              }}
              onAdFailed={(event) => {
                const message = event.nativeEvent.message;
                onState({ status: statusFromFailure(message), ms: Date.now() - startedAt.current, detail: message });
                setFailed(true);
              }}
            />
          ) : null}
          {failed || !VoxAdView ? (
            <View style={[StyleSheet.absoluteFill, styles.emptyFrame]} pointerEvents="none">
              <Text variant="caption" style={styles.playerText}>{`VAST 9:16 · ${text.status.noFill}`}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  offer: {
    gap: spacing.md,
  },
  secondary: {
    color: colors.textSecondary,
  },
  player: {
    flex: 1,
    backgroundColor: '#000000',
  },
  playerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    minHeight: 56,
    gap: spacing.md,
  },
  playerText: {
    color: '#ffffff',
    flexShrink: 1,
  },
  grantedText: {
    color: colors.success,
    flexShrink: 1,
  },
  closeButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: '#111111',
  },
  emptyFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: radii.md,
  },
});
