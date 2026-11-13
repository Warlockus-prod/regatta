import { VOX_APP_PAGE_URL, placement, type VoxPlacement } from './vox-placements';

/**
 * Full-screen ad order: the 1080x1920 place, then the 320x480 place when it has no
 * ad. Both requests name the app (owner 2026-11-06, decision Р-43). Hybrid's own promo
 * on the 320x480 place answered only without an address (measured 2026-11-04 with
 * weektoregatta.com: 0 of 4 with it, 4 of 4 without; not measured with the bundle id), so
 * both places are expected to stay empty until a campaign whitelists com.icoffio.regatta.
 * The SDK scales whichever creative arrives to the screen.
 */
export type FullScreenStep = { placement: VoxPlacement; pageUrl: string };

export function fullScreenSteps(): readonly FullScreenStep[] {
  return [
    { placement: placement('fullScreen1080x1920'), pageUrl: VOX_APP_PAGE_URL },
    { placement: placement('interstitial'), pageUrl: VOX_APP_PAGE_URL },
  ];
}

/**
 * Tries the steps in order and moves on only when a place has no ad. Any other
 * failure stops: a second ad must not open over a problem the user should see.
 * Resolves with the place that showed; rejects with the last failure.
 */
export async function showFirstFullScreen(
  steps: readonly FullScreenStep[],
  show: (placeId: string, pageUrl: string) => Promise<void>,
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
