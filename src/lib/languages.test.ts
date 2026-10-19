// Contract for src/lib/languages.ts, the base of the language chain
// (?lang= > cookie > Accept-Language > RU, see src/proxy.ts). This chain broke
// twice before (943ac9e, 7ca1abf), so the fallbacks are pinned here.

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LANG,
  ENABLED_LANGUAGES,
  LANG_SHORTCUT_PATHS,
  isLang,
  legacyPick,
  legacyPickArray,
  pickLangFromAccept,
  pickLocalized,
} from './languages';

const ALL_LANGS = ['ru', 'en', 'pl', 'es', 'fr', 'de', 'it'] as const;

describe('pickLangFromAccept', () => {
  it('maps a regional tag to its base language', () => {
    expect(pickLangFromAccept('pl-PL')).toBe('pl');
    expect(pickLangFromAccept('pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7')).toBe('pl');
    expect(pickLangFromAccept('DE-at')).toBe('de');
  });

  it('skips an unsupported language and takes the next supported one in order', () => {
    expect(pickLangFromAccept('uk,de')).toBe('de');
    expect(pickLangFromAccept('uk-UA, fr-CA;q=0.8, en;q=0.5')).toBe('fr');
  });

  it('falls back to English when nothing in the header is supported', () => {
    expect(pickLangFromAccept('zh-CN')).toBe('en');
    expect(pickLangFromAccept('zh-CN,ja;q=0.9')).toBe('en');
  });

  it('defaults to Russian when there is no header at all', () => {
    expect(DEFAULT_LANG).toBe('ru');
    expect(pickLangFromAccept(null)).toBe('ru');
    expect(pickLangFromAccept(undefined)).toBe('ru');
    expect(pickLangFromAccept('')).toBe('ru');
  });
});

describe('isLang and the language list', () => {
  it('accepts exactly the seven enabled languages', () => {
    expect(ENABLED_LANGUAGES.map((l) => l.id).sort()).toEqual([...ALL_LANGS].sort());
    for (const lang of ALL_LANGS) expect(isLang(lang)).toBe(true);
    for (const value of ['xx', 'PL', 'pl-PL', '', null, undefined]) expect(isLang(value)).toBe(false);
  });
});

describe('LANG_SHORTCUT_PATHS', () => {
  it('has /xx and /xx/ for every enabled language and nothing else', () => {
    const expected: Record<string, string> = {};
    for (const lang of ALL_LANGS) {
      expected[`/${lang}`] = lang;
      expected[`/${lang}/`] = lang;
    }
    expect(LANG_SHORTCUT_PATHS).toEqual(expected);
  });
});

describe('legacyPick fallback order', () => {
  const part = { nameRu: 'Грот', nameEn: 'Mainsail', namePl: 'Grot', nameIt: '' };

  it('returns the requested language when it is present', () => {
    expect(legacyPick(part, 'name', 'pl')).toBe('Grot');
    expect(legacyPick(part, 'name', 'ru')).toBe('Грот');
  });

  it('falls back to English, then Russian', () => {
    expect(legacyPick(part, 'name', 'de')).toBe('Mainsail');
    // An empty translation counts as missing.
    expect(legacyPick(part, 'name', 'it')).toBe('Mainsail');
    expect(legacyPick({ nameRu: 'Грот' }, 'name', 'fr')).toBe('Грот');
  });

  it('returns an empty string for a missing field or a non-object', () => {
    expect(legacyPick(part, 'title', 'en')).toBe('');
    expect(legacyPick(null, 'name', 'en')).toBe('');
    expect(legacyPick('text', 'name', 'en')).toBe('');
  });

  it('applies the same order to array fields', () => {
    const steps = { itemsRu: ['раз'], itemsEn: ['one'], itemsEs: [] as string[] };
    expect(legacyPickArray(steps, 'items', 'ru')).toEqual(['раз']);
    expect(legacyPickArray(steps, 'items', 'es')).toEqual(['one']);
    expect(legacyPickArray({ itemsRu: ['раз'] }, 'items', 'pl')).toEqual(['раз']);
    expect(legacyPickArray(undefined, 'items', 'pl')).toEqual([]);
  });
});

describe('pickLocalized', () => {
  it('takes the language, then English, then Russian', () => {
    expect(pickLocalized('pl', { ru: 'Да', en: 'Yes', pl: 'Tak' })).toBe('Tak');
    expect(pickLocalized('de', { ru: 'Да', en: 'Yes' })).toBe('Yes');
  });
});
