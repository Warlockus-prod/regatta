import { requireNativeViewManager, requireOptionalNativeModule } from 'expo-modules-core';
import type { ComponentType } from 'react';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';

/**
 * JS side of the local VOX SDK 1 bridge (modules/vox-ads/ios).
 *
 * The native module only exists in a dev/TestFlight build made with
 * `expo run:ios`; in Expo Go, jest and Android `VoxAds` is null and the
 * demo screen shows a "not available in this build" note instead.
 */

type VoxAdsNative = {
  sdkName: string;
  sdkVersion: string;
  showFullScreen(placeId: string, closeButtonDelay: number): Promise<void>;
};

export type VoxAdKind = 'banner' | 'video';

export type VoxAdLoadedEvent = { width: number; height: number };
export type VoxAdFailedEvent = { message: string };

export type VoxAdViewProps = ViewProps & {
  placeId: string;
  kind: VoxAdKind;
  closeButtonDelay?: number;
  /** Bump to request a fresh ad for the same placement. */
  reloadKey?: number;
  onAdLoaded?: (event: NativeSyntheticEvent<VoxAdLoadedEvent>) => void;
  onAdFailed?: (event: NativeSyntheticEvent<VoxAdFailedEvent>) => void;
};

export const VoxAds = requireOptionalNativeModule<VoxAdsNative>('VoxAds');

export const VoxAdView: ComponentType<VoxAdViewProps> | null = VoxAds
  ? requireNativeViewManager<VoxAdViewProps>('VoxAds')
  : null;
