import { APP_PAGE_URL, fullScreenSteps, showFirstFullScreen } from '../src/ads/full-screen';

describe('full-screen ad order', () => {
  it('asks the real full screen as the app first, then the old place without the address', () => {
    const steps = fullScreenSteps();
    expect(steps.map((s) => [s.placement.key, s.pageUrl])).toEqual([
      ['fullScreen1080x1920', APP_PAGE_URL],
      ['interstitial', null],
    ]);
  });

  it('stops at the first place that shows', async () => {
    const show = jest.fn().mockResolvedValue(undefined);
    const shown = await showFirstFullScreen(fullScreenSteps(), show);
    expect(shown.key).toBe('fullScreen1080x1920');
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('falls back only on no fill', async () => {
    const show = jest.fn().mockRejectedValueOnce(new Error('no-fill')).mockResolvedValueOnce(undefined);
    const shown = await showFirstFullScreen(fullScreenSteps(), show);
    expect(shown.key).toBe('interstitial');
    expect(show).toHaveBeenLastCalledWith(expect.any(String), null);
  });

  it('does not open a second ad after a real failure', async () => {
    const show = jest.fn().mockRejectedValue(new Error('E_NO_CONTROLLER'));
    await expect(showFirstFullScreen(fullScreenSteps(), show)).rejects.toThrow('E_NO_CONTROLLER');
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('reports no fill when no place answers', async () => {
    const show = jest.fn().mockRejectedValue(new Error('no-fill'));
    await expect(showFirstFullScreen(fullScreenSteps(), show)).rejects.toThrow('no-fill');
    expect(show).toHaveBeenCalledTimes(2);
  });
});
