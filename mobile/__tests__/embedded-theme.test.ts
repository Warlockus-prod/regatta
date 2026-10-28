import { APP_EMBED_THEME_SCRIPT, embeddedThemeScript } from '../src/design-system/embedded-theme';

function page(documentElement: { dataset: { theme?: string } } | null = { dataset: { theme: 'dark' } }) {
  const saved = { 'regatta_theme': 'dark', 'course-progress': 'keep' };
  const localStorage = { setItem: jest.fn(() => { throw new Error('unavailable'); }), getItem: jest.fn(() => saved.regatta_theme) };
  const window = { __REGATTA_EMBED_THEME__: undefined as string | undefined, dispatchEvent: jest.fn(), localStorage };
  const document = { documentElement };
  class PageEvent { constructor(readonly type: string) {} }
  const run = (script: string) => new Function('window', 'document', 'Event', script)(window, document, PageEvent);
  return { window, document, saved, localStorage, run };
}

it('applies the native day surface over an old dark file without rewriting preferences or progress', () => {
  const p = page();
  p.run(APP_EMBED_THEME_SCRIPT);
  expect(p.window.__REGATTA_EMBED_THEME__).toBe('light');
  expect(p.document.documentElement?.dataset.theme).toBe('light');
  expect(p.window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'regatta-theme-change' }));
  expect(p.saved).toEqual({ 'regatta_theme': 'dark', 'course-progress': 'keep' });
  expect(p.localStorage.setItem).not.toHaveBeenCalled();
  expect(p.localStorage.getItem).not.toHaveBeenCalled();
});

it('is safe before the root element exists and reasserts after the packaged head loads', () => {
  const p = page(null);
  expect(() => p.run(APP_EMBED_THEME_SCRIPT)).not.toThrow();
  p.document.documentElement = { dataset: { theme: 'dark' } };
  p.run(APP_EMBED_THEME_SCRIPT);
  expect(p.document.documentElement.dataset.theme).toBe('light');
});

it('updates only the resolved presentation signal and bounds unexpected runtime input', () => {
  const p = page();
  p.run(embeddedThemeScript('dark'));
  expect(p.document.documentElement?.dataset.theme).toBe('dark');
  p.run(embeddedThemeScript('private invalid theme' as 'light'));
  expect(p.window.__REGATTA_EMBED_THEME__).toBe('light');
  expect(p.document.documentElement?.dataset.theme).toBe('light');
  expect(p.window.dispatchEvent).toHaveBeenCalledTimes(2);
});
