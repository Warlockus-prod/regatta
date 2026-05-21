import {
  DEFAULT_LANG,
  ENABLED_LANGUAGES,
  FALLBACK_LANG,
  isLang,
  legacyPick,
  legacyPickArray,
  pickLocalized,
} from '../src/i18n/languages';

describe('isLang', () => {
  it('accepts every enabled language id', () => {
    for (const meta of ENABLED_LANGUAGES) {
      expect(isLang(meta.id)).toBe(true);
    }
  });

  it('rejects unknown values', () => {
    expect(isLang('xx')).toBe(false);
    expect(isLang('')).toBe(false);
    expect(isLang(null)).toBe(false);
    expect(isLang(undefined)).toBe(false);
    expect(isLang('EN')).toBe(false); // case-sensitive
  });
});

describe('DEFAULT_LANG / FALLBACK_LANG', () => {
  it('source language is Russian', () => {
    expect(DEFAULT_LANG).toBe('ru');
  });

  it('fallback for unsupported tags is English', () => {
    expect(FALLBACK_LANG).toBe('en');
  });
});

describe('pickLocalized', () => {
  it('returns the requested language when present', () => {
    const v = { ru: 'RU', en: 'EN', pl: 'PL', es: 'ES' };
    expect(pickLocalized('ru', v)).toBe('RU');
    expect(pickLocalized('en', v)).toBe('EN');
    expect(pickLocalized('pl', v)).toBe('PL');
    expect(pickLocalized('es', v)).toBe('ES');
  });

  it('falls back to en when locale missing', () => {
    expect(pickLocalized('fr', { ru: 'RU', en: 'EN' })).toBe('EN');
    expect(pickLocalized('de', { ru: 'RU', en: 'EN' })).toBe('EN');
    expect(pickLocalized('it', { ru: 'RU', en: 'EN' })).toBe('EN');
  });

  it('falls back to ru only when en is also undefined (?? semantics)', () => {
    // pickLocalized uses `??`, which falls back on null/undefined only.
    // Empty strings are returned as-is. This matches web behavior.
    const partial = { ru: 'RU' } as { ru: string; en: string };
    expect(pickLocalized('it', partial)).toBe('RU');
  });
});

describe('legacyPick', () => {
  const obj = {
    nameRu: 'Нос',
    nameEn: 'Bow',
    namePl: 'Dziob',
    nameEs: 'Proa',
  };

  it('picks the language-specific suffix', () => {
    expect(legacyPick(obj, 'name', 'ru')).toBe('Нос');
    expect(legacyPick(obj, 'name', 'en')).toBe('Bow');
    expect(legacyPick(obj, 'name', 'pl')).toBe('Dziob');
    expect(legacyPick(obj, 'name', 'es')).toBe('Proa');
  });

  it('falls back to En when locale variant is missing', () => {
    expect(legacyPick(obj, 'name', 'fr')).toBe('Bow');
    expect(legacyPick(obj, 'name', 'de')).toBe('Bow');
    expect(legacyPick(obj, 'name', 'it')).toBe('Bow');
  });

  it('returns empty string for unknown field', () => {
    expect(legacyPick(obj, 'missing', 'ru')).toBe('');
  });

  it('handles null / undefined / non-objects', () => {
    expect(legacyPick(null, 'name', 'ru')).toBe('');
    expect(legacyPick(undefined, 'name', 'ru')).toBe('');
    expect(legacyPick('string', 'name', 'ru')).toBe('');
    expect(legacyPick(42, 'name', 'ru')).toBe('');
  });
});

describe('legacyPickArray', () => {
  const obj = {
    itemsRu: ['раз', 'два'],
    itemsEn: ['one', 'two'],
    itemsPl: ['raz', 'dwa'],
  };

  it('picks the locale array', () => {
    expect(legacyPickArray(obj, 'items', 'ru')).toEqual(['раз', 'два']);
    expect(legacyPickArray(obj, 'items', 'en')).toEqual(['one', 'two']);
    expect(legacyPickArray(obj, 'items', 'pl')).toEqual(['raz', 'dwa']);
  });

  it('falls back to En for missing locale', () => {
    expect(legacyPickArray(obj, 'items', 'fr')).toEqual(['one', 'two']);
  });

  it('returns empty array for missing field', () => {
    expect(legacyPickArray(obj, 'missing', 'ru')).toEqual([]);
  });

  it('handles null / non-objects', () => {
    expect(legacyPickArray(null, 'items', 'ru')).toEqual([]);
    expect(legacyPickArray(undefined, 'items', 'ru')).toEqual([]);
  });
});
