const mockLocales: { languageTag: string }[] = [];

jest.mock('expo-localization', () => ({
  getLocales: () => mockLocales,
}));

import { detectDeviceLang } from '../src/i18n/device-locale';

beforeEach(() => {
  mockLocales.length = 0;
});

describe('detectDeviceLang', () => {
  it('returns the matching primary subtag for a supported locale', () => {
    mockLocales.push({ languageTag: 'pl-PL' });
    expect(detectDeviceLang()).toBe('pl');
  });

  it('walks the locale priority list and picks the first supported one', () => {
    mockLocales.push({ languageTag: 'jp-JP' });
    mockLocales.push({ languageTag: 'fr-FR' });
    mockLocales.push({ languageTag: 'en-US' });
    expect(detectDeviceLang()).toBe('fr');
  });

  it('lowercases the language tag before lookup', () => {
    mockLocales.push({ languageTag: 'EN-US' });
    expect(detectDeviceLang()).toBe('en');
  });

  it('handles a tag with no region subtag', () => {
    mockLocales.push({ languageTag: 'de' });
    expect(detectDeviceLang()).toBe('de');
  });

  it('falls back to DEFAULT_LANG when no locale matches', () => {
    mockLocales.push({ languageTag: 'jp-JP' });
    mockLocales.push({ languageTag: 'zh-CN' });
    expect(detectDeviceLang()).toBe('ru');
  });

  it('falls back to DEFAULT_LANG when the locale list is empty', () => {
    expect(detectDeviceLang()).toBe('ru');
  });

  it('handles a missing languageTag field gracefully', () => {
    mockLocales.push({} as { languageTag: string });
    expect(detectDeviceLang()).toBe('ru');
  });
});
