import { afterEach, describe, expect, it, vi } from 'vitest';
import { EMBED_THEME_EVENT } from '../lib/theme';

const hooks = vi.hoisted(() => ({ effects: [] as (() => void | (() => void))[] }));
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useEffect: (effect: () => void | (() => void)) => hooks.effects.push(effect),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/simulator-v3' }));
import ThemeManager from './ThemeManager';

afterEach(() => { vi.unstubAllGlobals(); hooks.effects = []; });

describe('mounted theme updates preserve the current activity', () => {
  it('applies native override updates and system/storage changes without writing preferences, and removes every listener', () => {
    let saved = 'light';
    const write = vi.fn();
    const listeners = new EventTarget();
    const mediaListeners = new EventTarget();
    const media = {
      matches: true,
      addEventListener: mediaListeners.addEventListener.bind(mediaListeners),
      removeEventListener: mediaListeners.removeEventListener.bind(mediaListeners),
    };
    const window = Object.assign(listeners, { __REGATTA_EMBED_THEME__: undefined as unknown, matchMedia: () => media });
    const document = { documentElement: { dataset: { theme: 'not-resolved' } }, querySelectorAll: () => [] };
    vi.stubGlobal('window', window);
    vi.stubGlobal('document', document);
    vi.stubGlobal('localStorage', { getItem: () => saved, setItem: write });
    expect(ThemeManager()).toBeNull();
    const cleanup = hooks.effects.map(effect => effect());
    expect(document.documentElement.dataset.theme).toBe('light');

    window.__REGATTA_EMBED_THEME__ = 'dark';
    window.dispatchEvent(new Event(EMBED_THEME_EVENT));
    expect(document.documentElement.dataset.theme).toBe('dark');
    window.__REGATTA_EMBED_THEME__ = 'light';
    mediaListeners.dispatchEvent(new Event('change'));
    expect(document.documentElement.dataset.theme).toBe('light');

    window.__REGATTA_EMBED_THEME__ = undefined;
    saved = 'auto';
    window.dispatchEvent(new Event('storage'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    media.matches = false;
    mediaListeners.dispatchEvent(new Event('change'));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(write).not.toHaveBeenCalled();

    cleanup.forEach(dispose => dispose?.());
    saved = 'dark';
    window.dispatchEvent(new Event(EMBED_THEME_EVENT));
    window.dispatchEvent(new Event('storage'));
    mediaListeners.dispatchEvent(new Event('change'));
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
