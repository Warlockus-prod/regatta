import { requireNativeViewManager, requireOptionalNativeModule } from 'expo-modules-core';
import type { ComponentType } from 'react';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';

/**
 * JS side of the VOX SDK 2 bridge (modules/vox-prebid/ios): Prebid Mobile
 * talking to a Prebid Server whose `vox` adapter forwards to Hybrid SSP.
 * Null in Expo Go, Jest and on Android.
 */

export type VoxPrebidCloseResult = { shown: boolean; rewarded: boolean };

type VoxPrebidNative = {
  sdkName: string;
  sdkVersion: string;
  start(serverURL: string, accountId: string): Promise<string>;
  showInterstitial(configID: string, video: boolean): Promise<VoxPrebidCloseResult>;
  showRewarded(configID: string): Promise<VoxPrebidCloseResult>;
};

export type VoxPrebidBannerProps = ViewProps & {
  configID: string;
  adWidth: number;
  adHeight: number;
  video?: boolean;
  reloadKey?: number;
  onAdLoaded?: (event: NativeSyntheticEvent<{ width: number; height: number }>) => void;
  onAdFailed?: (event: NativeSyntheticEvent<{ message: string }>) => void;
};

export const VoxPrebid = requireOptionalNativeModule<VoxPrebidNative>('VoxPrebid');

export const VoxPrebidBannerView: ComponentType<VoxPrebidBannerProps> | null = VoxPrebid
  ? requireNativeViewManager<VoxPrebidBannerProps>('VoxPrebid')
  : null;
