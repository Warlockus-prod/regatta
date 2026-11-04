import { placement, type VoxPlacement } from './vox-placements';

/**
 * Full-screen ad order. The 1080x1920 place carries only our own campaign, whose
 * whitelist is weektoregatta.com, so that request must name the app. Hybrid's own
 * promo on the 320x480 place answers only without the address (measured 2026-11-04:
 * 0 of 4 with it, 4 of 4 without), so that request stays as it was. The SDK scales
 * whichever creative arrives to the screen.
 */
export const APP_PAGE_URL = 'https://weektoregatta.com/';

export type FullScreenStep = { placement: VoxPlacement; pageUrl: string | null };

export function fullScreenSteps(): readonly FullScreenStep[] {
  return [
    { placement: placement('fullScreen1080x1920'), pageUrl: APP_PAGE_URL },
    { placement: placement('interstitial'), pageUrl: null },
  ];
}

/**
 * Tries the steps in order and moves on only when a place has no ad. Any other
 * failure stops: a second ad must not open over a problem the user should see.
 * Resolves with the place that showed; rejects with the last failure.
 */
export async function showFirstFullScreen(
  steps: readonly FullScreenStep[],
  show: (placeId: string, pageUrl: string | null) => Promise<void>,
  onStep: (step: FullScreenStep) => void = () => undefined,
): Promise<VoxPlacement> {
  let failure: unknown = new Error('no-fill');
  for (const step of steps) {
    onStep(step);
    try {
      await show(step.placement.placeId, step.pageUrl);
      return step.placement;
    } catch (error) {
      failure = error;
      if ((error instanceof Error ? error.message : String(error)) !== 'no-fill') throw error;
    }
  }
  throw failure;
}
