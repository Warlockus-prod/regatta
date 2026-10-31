import { describe, expect, it, vi } from 'vitest';

// ============================================================================
// Contract: after a failed load, Retry starts a NEW load and the screen
// becomes ready. React's hooks are replaced by a minimal runtime so the effect
// and the retry can be stepped by hand (the web suite has no DOM).
// ============================================================================

const rt = vi.hoisted(() => ({
  states: [] as unknown[], idx: 0, deps: [] as unknown[][], eidx: 0, pending: [] as (() => unknown)[],
  load: vi.fn(), reload: vi.fn(() => false),
}));
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: (init: unknown) => {
    const i = rt.idx++;
    if (!(i in rt.states)) rt.states[i] = typeof init === 'function' ? (init as () => unknown)() : init;
    return [rt.states[i], (v: unknown) => { rt.states[i] = typeof v === 'function' ? (v as (p: unknown) => unknown)(rt.states[i]) : v; }];
  },
  useEffect: (fn: () => unknown, deps: unknown[]) => {
    const i = rt.eidx++;
    const prev = rt.deps[i];
    if (!prev || deps.some((d, k) => d !== prev[k])) rt.pending.push(fn);
    rt.deps[i] = deps;
  },
  useCallback: (fn: unknown) => fn,
}));
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ tl: (v: { en: string }) => v.en }) }));
vi.mock('./bank', () => ({ peekSternikBank: () => null, loadSternikBank: rt.load }));
vi.mock('./bank-reload', () => ({ reloadOnceForNewBank: rt.reload }));
import { useSternikBank } from './SternikBankGate';

// One "render" of the hook under the fake runtime above (not a React render,
// so it is called through a plain alias).
const hook = useSternikBank;
function render() {
  rt.idx = 0; rt.eidx = 0; rt.pending = [];
  const out = hook();
  for (const fn of rt.pending) fn();
  return out;
}
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('useSternikBank', () => {
  it('loading -> error -> Retry -> loading -> ready, with a second real load', async () => {
    const bank = { version: 'v', questions: [], byId: {}, examPool: [] };
    rt.load.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(bank);

    expect(render().state).toEqual({ status: 'loading' });
    await flush();
    const failed = render();
    expect(failed.state).toEqual({ status: 'error' });
    expect(rt.load).toHaveBeenCalledTimes(1);

    failed.retry();
    expect(render().state).toEqual({ status: 'loading' });
    expect(rt.load).toHaveBeenCalledTimes(2);
    await flush();
    expect(render().state).toEqual({ status: 'ready', bank });
  });

  it('stays on loading while a gone bank file reloads the page', async () => {
    rt.states = []; rt.deps = [];
    const gone = new Error('gone');
    rt.load.mockReset().mockRejectedValueOnce(gone);
    rt.reload.mockReturnValueOnce(true);
    expect(render().state).toEqual({ status: 'loading' });
    await flush();
    expect(rt.reload).toHaveBeenCalledWith(gone);
    expect(render().state).toEqual({ status: 'loading' });
  });
});
