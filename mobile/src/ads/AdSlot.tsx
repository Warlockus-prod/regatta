import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { VoxAdView } from '../../modules/vox-ads';
import { VoxPrebidBannerView } from '../../modules/vox-prebid';
import { Text } from '../design-system/components';
import { colors, radii, spacing } from '../design-system/tokens';
import { PREBID_SERVER_URL, VOX_PREBID_ENDPOINT, ensurePrebidStarted, prebidConfigId, useAdSdk, type AdSdk } from './sdk';
import type { AdsText } from './strings';
import { VOX_ENDPOINT, sizeLabel, type VoxPlacement } from './vox-placements';

export type AdRequestStatus = 'idle' | 'loading' | 'loaded' | 'noFill' | 'error';

export type AdRequestState = {
  status: AdRequestStatus;
  /** Milliseconds from the request to the SDK answer. */
  ms?: number;
  detail?: string;
};

/** Bridge failure text -> request status. Both bridges report "no ad" as "no-fill". */
export function statusFromFailure(message: string): AdRequestStatus {
  return message === 'no-fill' ? 'noFill' : 'error';
}

/** True when the selected SDK's native bridge is in this build. */
export function sdkAvailable(sdk: AdSdk): boolean {
  return sdk === 'vox1' ? VoxAdView !== null : VoxPrebidBannerView !== null;
}

/**
 * One inline placement on a simulated screen: a small "AD · size" label, the
 * native view of the selected SDK, a frame of the real size when there is no
 * ad, and optionally the request panel underneath.
 */
export function AdSlot({
  placement,
  width: available,
  text,
  showRequest = true,
}: {
  placement: VoxPlacement;
  /** Width available for the slot. Banners keep their real width when it fits and are scaled down otherwise. */
  width: number;
  text: AdsText;
  showRequest?: boolean;
}) {
  const sdk = useAdSdk();
  const width = placement.kind === 'banner' ? Math.min(available, placement.width) : available;
  const estimated = Math.round((width * placement.height) / placement.width);
  const [height, setHeight] = useState(estimated);
  const [state, setState] = useState<AdRequestState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const [prebidReady, setPrebidReady] = useState(false);
  const startedAt = useRef(Date.now());
  const bridgeReady = sdkAvailable(sdk);

  // A new SDK choice is a new request.
  useEffect(() => {
    startedAt.current = Date.now();
    setHeight(estimated);
    setState({ status: bridgeReady ? 'loading' : 'idle' });
    setPrebidReady(false);
    if (sdk !== 'vox2' || !bridgeReady) return;
    let alive = true;
    ensurePrebidStarted().then(
      () => alive && setPrebidReady(true),
      (error: unknown) => alive && setState({ status: 'error', detail: error instanceof Error ? error.message : String(error) }),
    );
    return () => {
      alive = false;
    };
  }, [sdk, bridgeReady, estimated]);

  const reload = useCallback(() => {
    startedAt.current = Date.now();
    setHeight(estimated);
    setState({ status: 'loading' });
    setReloadKey((key) => key + 1);
  }, [estimated]);

  const onLoaded = (loadedHeight: number) => {
    if (placement.kind === 'banner' && loadedHeight > 0) setHeight(Math.ceil(loadedHeight));
    setState({ status: 'loaded', ms: Date.now() - startedAt.current });
  };
  const onFailed = (message: string) => {
    setState({ status: statusFromFailure(message), ms: Date.now() - startedAt.current, detail: message });
  };

  const label = `${text.adLabel.toUpperCase()} · ${sizeLabel(placement)}`;
  const empty = state.status === 'noFill' || state.status === 'error' || !bridgeReady;

  return (
    <View style={styles.slot}>
      <Text variant="caption" style={styles.label}>{label}</Text>
      <View style={[styles.frame, { width, height }]}>
        {sdk === 'vox1' && VoxAdView ? (
          <VoxAdView
            style={{ width, height }}
            placeId={placement.placeId}
            kind={placement.kind === 'video' ? 'video' : 'banner'}
            closeButtonDelay={3}
            reloadKey={reloadKey}
            onAdLoaded={(event) => onLoaded(event.nativeEvent.height)}
            onAdFailed={(event) => onFailed(event.nativeEvent.message)}
          />
        ) : null}
        {sdk === 'vox2' && VoxPrebidBannerView && prebidReady ? (
          <VoxPrebidBannerView
            style={{ width, height }}
            configID={prebidConfigId(placement)}
            adWidth={width}
            adHeight={estimated}
            video={placement.kind === 'video'}
            reloadKey={reloadKey}
            onAdLoaded={(event) => onLoaded(event.nativeEvent.height)}
            onAdFailed={(event) => onFailed(event.nativeEvent.message)}
          />
        ) : null}
        {empty ? (
          <View style={[StyleSheet.absoluteFill, styles.emptyFrame]} pointerEvents="none">
            <Text variant="caption" style={styles.emptyText}>{sizeLabel(placement)}</Text>
          </View>
        ) : null}
      </View>
      {showRequest ? (
        <RequestPanel
          sdk={sdk}
          placement={placement}
          state={bridgeReady ? state : { status: 'idle' }}
          text={text}
          onReload={bridgeReady ? reload : undefined}
        />
      ) : null}
    </View>
  );
}

/**
 * Request panel. SDK 1: "GET ssp.hybrid.ai/auction/getad · placeId".
 * SDK 2: "POST <Prebid Server> · configID -> vox -> Hybrid". Status, ms, retry.
 */
export function RequestPanel({
  sdk,
  placement,
  state,
  text,
  onReload,
}: {
  sdk: AdSdk;
  placement: VoxPlacement;
  state: AdRequestState;
  text: AdsText;
  onReload?: () => void;
}) {
  const statusText = text.status[state.status];
  const tone =
    state.status === 'loaded' ? styles.ok : state.status === 'noFill' || state.status === 'error' ? styles.warn : styles.neutral;
  const lines =
    sdk === 'vox1'
      ? [`VOX SDK 1`, `GET ${VOX_ENDPOINT}`, `placeId ${placement.placeId}`]
      : [`VOX SDK 2 (Prebid)`, `POST ${PREBID_SERVER_URL}`, `configID ${prebidConfigId(placement)}`, `vox -> POST ${VOX_PREBID_ENDPOINT}`];
  return (
    <View style={styles.panel}>
      <View style={styles.panelRow}>
        <Text variant="caption" style={styles.panelKey}>{text.endpoint}</Text>
        <Text variant="caption" style={[styles.chip, tone]}>
          {state.ms === undefined ? statusText : `${statusText} · ${state.ms} ms`}
        </Text>
      </View>
      {lines.map((line) => (
        <Text key={line} variant="caption" style={styles.mono} selectable>{line}</Text>
      ))}
      {state.status === 'noFill' ? <Text variant="caption" style={styles.hint}>{sdk === 'vox1' ? text.noFillHint : text.noBidHint}</Text> : null}
      {state.status === 'error' && state.detail ? (
        <Text variant="caption" style={styles.hint}>{state.detail.slice(0, 160)}</Text>
      ) : null}
      {onReload && state.status !== 'loading' ? (
        <Pressable onPress={onReload} accessibilityRole="button" accessibilityLabel={text.reload} style={styles.reload} hitSlop={8}>
          <Text variant="accent">{text.reload}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    alignSelf: 'stretch',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  frame: {
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.bgSecondary,
  },
  emptyFrame: {
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
  panel: {
    alignSelf: 'stretch',
    marginTop: spacing.xs,
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderCyanFaint,
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  panelKey: {
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  ok: {
    color: colors.success,
    backgroundColor: colors.surfaceSuccess,
  },
  warn: {
    color: colors.warning,
    backgroundColor: colors.bgSecondary,
  },
  neutral: {
    color: colors.textSecondary,
    backgroundColor: colors.bgSecondary,
  },
  mono: {
    color: colors.textSecondary,
    fontFamily: 'Menlo',
    fontSize: 12,
  },
  hint: {
    color: colors.textMuted,
  },
  reload: {
    minHeight: 44,
    justifyContent: 'center',
  },
});
