import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, effectiveTheme, readMode, resolveTheme, THEME_BOOTSTRAP_SCRIPT } from './theme';

afterEach(() => vi.unstubAllGlobals());

function boot(mode: unknown, darkSystem: boolean, embedded?: unknown, denied = false, path = '/start') {
  const metadata: Record<string, string>[] = [
    { content: '#old-dark', media: '(prefers-color-scheme: dark)' },
    { content: '#old-light', media: '(prefers-color-scheme: light)' },
  ];
  const document = {
    documentElement: { dataset: { theme: 'not-resolved' } },
    querySelectorAll: () => metadata.map(attributes => ({
      setAttribute: (key: string, value: string) => { attributes[key] = value; },
      removeAttribute: (key: string) => { delete attributes[key]; },
    })),
  };
  const getItem = vi.fn(() => { if (denied) throw new Error('Denied'); return mode; });
  const setItem = vi.fn();
  const context = {
    window: { __REGATTA_EMBED_THEME__: embedded }, document,
    localStorage: { getItem, setItem },
    matchMedia: vi.fn(() => ({ matches: darkSystem })),
    location: { pathname: path, search: '?embed=1' },
  };
  runInNewContext(THEME_BOOTSTRAP_SCRIPT, context);
  return { theme: document.documentElement.dataset.theme, setItem, metadata };
}

describe('one presentation preference through learning and practice', () => {
  it.each(['/start', '/game', '/multiplayer', '/simulator', '/simulator2', '/simulator-v3', '/radio', '/sternik'])('keeps saved Light before paint and after hydration on %s, including embed', path => {
    const doc = { documentElement: { dataset: {} }, querySelectorAll: () => [] };
    vi.stubGlobal('window', { location: { pathname: path, search: '?embed=1' }, matchMedia: () => ({ matches: true }) });
    vi.stubGlobal('document', doc);
    vi.stubGlobal('localStorage', { getItem: () => 'light' });
    expect(boot('light', true, undefined, false, path).theme).toBe('light');
    applyTheme(readMode());
    expect(doc.documentElement.dataset).toEqual({ theme: 'light' });
  });

  it.each([
    ['dark', false, undefined, 'dark'],
    ['auto', true, undefined, 'dark'],
    ['auto', false, undefined, 'light'],
    ['light', true, 'dark', 'dark'],
    ['dark', false, 'light', 'light'],
    ['dark', false, 'auto', 'dark'],
    ['light', true, { theme: 'dark' }, 'light'],
    ['corrupt', false, undefined, 'light'],
  ])('resolves preference %j, system %s and host %j consistently', (mode, system, embedded, expected) => {
    expect(resolveTheme(mode, system, embedded)).toBe(expected);
    const result = boot(mode, system, embedded);
    expect(result.theme).toBe(expected);
    expect(result.setItem).not.toHaveBeenCalled();
  });

  it('keeps an explicit native Light override when storage is denied and the OS is dark', () => {
    const result = boot('dark', true, 'light', true);
    expect(result.theme).toBe('light');
    expect(result.setItem).not.toHaveBeenCalled();
    vi.stubGlobal('window', { __REGATTA_EMBED_THEME__: 'light', matchMedia: () => ({ matches: true }) });
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Denied'); } });
    expect(effectiveTheme(readMode())).toBe('light');
  });

  it('uses the system when storage is denied without replacing the preference or assuming Dark', () => {
    expect(boot(null, false, undefined, true).theme).toBe('light');
    expect(boot(null, true, undefined, true).theme).toBe('dark');
  });

  it('resolves to Light without storage, matchMedia or a host theme', () => {
    const document = { documentElement: { dataset: {} }, querySelectorAll: () => [] };
    runInNewContext(THEME_BOOTSTRAP_SCRIPT, { window: {}, document });
    expect(document.documentElement.dataset).toEqual({ theme: 'light' });
    expect(effectiveTheme('auto')).toBe('light');
  });

  it.each([
    ['light', true, undefined, '#f7f5f0'],
    ['dark', false, undefined, '#0a1628'],
    ['light', false, 'dark', '#0a1628'],
    ['dark', true, 'light', '#f7f5f0'],
  ])('colors browser chrome from resolved %s/system %s/host %s rather than stale media', (mode, system, embedded, color) => {
    expect(boot(mode, system, embedded).metadata).toEqual([{ content: color }, { content: color }]);
    const metadata = new Map([['content', '#old'], ['media', '(prefers-color-scheme: dark)']]);
    vi.stubGlobal('window', { __REGATTA_EMBED_THEME__: embedded, matchMedia: () => ({ matches: system }) });
    vi.stubGlobal('document', {
      documentElement: { dataset: {} },
      querySelectorAll: () => [{
        setAttribute: (key: string, value: string) => metadata.set(key, value),
        removeAttribute: (key: string) => metadata.delete(key),
      }],
    });
    applyTheme(mode as 'light' | 'dark');
    expect([...metadata.entries()]).toEqual([['content', color]]);
  });

  it('uses the tested no-flash script in the actual root layout', () => {
    const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
    expect(layout).toContain('__html: THEME_BOOTSTRAP_SCRIPT');
    expect(layout).not.toContain('var im=');
  });
});
