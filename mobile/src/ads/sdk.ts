import { useSyncExternalStore } from 'react';
import { VoxPrebid } from '../../modules/vox-prebid';
import type { VoxPlacement } from './vox-placements';

/**
 * Which SDK the Ads screens use. VOX SDK 1: the classic Hybrid SDK
 * (GET /auction/getad). VOX SDK 2: Prebid Mobile -> Prebid Server -> `vox`
 * adapter -> Hybrid SSP. Kept in memory: the demo always opens on SDK 1.
 */
export type AdSdk = 'vox1' | 'vox2';

/**
 * SDKs offered by the Ads switch. SDK 2 needs the Prebid Server that runs on
 * this Mac (localhost), which a phone cannot reach, so release builds
 * (TestFlight) offer SDK 1 only until a hosted Prebid Server exists.
 */
export function availableAdSdks(dev: boolean): readonly AdSdk[] {
  return dev ? ['vox1', 'vox2'] : ['vox1'];
}

export const AD_SDKS = availableAdSdks(__DEV__);

let current: AdSdk = 'vox1';
const listeners = new Set<() => void>();

export function setAdSdk(next: AdSdk): void {
  if (next === current) return;
  current = next;
  listeners.forEach((listener) => listener());
}

export function useAdSdk(): AdSdk {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => current,
  );
}

/**
 * Prebid Server for VOX SDK 2. The test setup runs it on this Mac
 * (vox-sdk-2/server, Docker); the iOS simulator reaches it as localhost.
 * A device or a TestFlight build needs a hosted server instead.
 */
export const PREBID_SERVER_URL = 'http://localhost:8200/openrtb2/auction';
export const PREBID_ACCOUNT_ID = 'wtr';

/** Stored impression ID on the Prebid Server for a placement: "wtr-banner300x250". */
export function prebidConfigId(placement: VoxPlacement): string {
  return `wtr-${placement.key}`;
}

/** Where the Prebid Server sends the impression for the `vox` bidder. */
export const VOX_PREBID_ENDPOINT = 'https://ssp.hybrid.ai/prebid/server/v1/auction';

let starting: Promise<void> | null = null;

/** Initialises Prebid Mobile once, on the first SDK 2 request from an Ads screen. */
export function ensurePrebidStarted(): Promise<void> {
  if (!VoxPrebid) return Promise.reject(new Error('VOX SDK 2 native module is not in this build'));
  if (!starting) {
    starting = VoxPrebid.start(PREBID_SERVER_URL, PREBID_ACCOUNT_ID).then(
      () => undefined,
      (error: unknown) => {
        starting = null;
        throw error;
      },
    );
  }
  return starting;
}
