import { requireNativeViewManager, requireOptionalNativeModule } from 'expo-modules-core';
import type { ComponentType } from 'react';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';
import { VOX_APP_STORE_ID } from '../../src/ads/vox-placements';

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
  /** `pageUrl` names the app in the request (VOX_APP_PAGE_URL); `language` is the one chosen in the app. */
  showFullScreen(placeId: string, closeButtonDelay: number, pageUrl: string, language: string): Promise<void>;
  /** Numeric App Store id, sent as mobileSdk.appStoreId and the store URL (VOX SDK 1.4.1). */
  setAppStoreId?(appStoreId: string): void;
  /** Last request on a place and the SSP's answer (VOX SDK 1.4.4); null before the first request. */
  lastAdInfo?(placeId: string): VoxAdInfo | null;
};

/** What VOX SDK 1 sent for the last request on a place and what the SSP answered (SDK 1.4.4+). */
export type VoxAdInfo = {
  endpoint: string;
  placeId: string;
  applicationId?: string;
  pageUrl?: string;
  sdkVersion?: string;
  /** Epoch milliseconds. */
  startedAt: number;
  durationMs: number;
  result: 'filled' | 'noFill' | 'error';
  /** The winning creative (DSP banner id). */
  adId?: string;
  bidId?: string;
  seanceId?: string;
  adNetwork?: string;
  width?: number;
  height?: number;
  isPassback: boolean;
  isVast: boolean;
  error?: string;
};

/** Last answer for a place, or null (older SDK, Expo Go, no request yet). */
export function lastVoxAdInfo(placeId: string): VoxAdInfo | null {
  try {
    return VoxAds?.lastAdInfo?.(placeId) ?? null;
  } catch {
    return null;
  }
}

/** Fields of a loaded native ad (VOX SDK 1.4.0+). Empty string = the ad has no such field. */
export type VoxNativeAdFields = {
  handle: string;
  title: string;
  advertiser: string;
  callToAction: string;
  iconUrl: string;
  mainImageUrl: string;
  ageRating: string;
};

type VoxNativeAdNative = {
  /** Rejects with "no-fill" when the SSP has no ad for the place. */
  load(placeId: string, pageUrl: string, language: string): Promise<VoxNativeAdFields>;
  /** A tap on the ad: the SDK opens the SSP click URL and counts the click. */
  click(handle: string): void;
  release(handle: string): void;
};

export type VoxNativeAdContainerProps = ViewProps & {
  /** The loaded ad; the SDK counts the impression when this view is half visible for 1 s. */
  handle: string;
};

export type VoxAdKind = 'banner' | 'video';

export type VoxAdLoadedEvent = { width: number; height: number };
export type VoxAdFailedEvent = { message: string };

export type VoxAdViewProps = ViewProps & {
  placeId: string;
  kind: VoxAdKind;
  /** Names the app in the request (VOX_APP_PAGE_URL); the view sends nothing without it. */
  pageUrl: string;
  /** The language chosen in the app (`lang` from useI18n); the view sends nothing without it. */
  language: string;
  closeButtonDelay?: number;
  /** Bump to request a fresh ad for the same placement. */
  reloadKey?: number;
  onAdLoaded?: (event: NativeSyntheticEvent<VoxAdLoadedEvent>) => void;
  /** VAST video watched to the end (VOX SDK 1.4.0, at least 90% actually played): grant the reward here. */
  onAdCompleted?: (event: NativeSyntheticEvent<Record<string, never>>) => void;
  onAdFailed?: (event: NativeSyntheticEvent<VoxAdFailedEvent>) => void;
};

export const VoxAds = requireOptionalNativeModule<VoxAdsNative>('VoxAds');
VoxAds?.setAppStoreId?.(VOX_APP_STORE_ID);

export const VoxNativeAd = requireOptionalNativeModule<VoxNativeAdNative>('VoxNativeAd');

export const VoxNativeAdContainer: ComponentType<VoxNativeAdContainerProps> | null = VoxNativeAd
  ? requireNativeViewManager<VoxNativeAdContainerProps>('VoxNativeAd')
  : null;

export const VoxAdView: ComponentType<VoxAdViewProps> | null = VoxAds
  ? requireNativeViewManager<VoxAdViewProps>('VoxAds')
  : null;
