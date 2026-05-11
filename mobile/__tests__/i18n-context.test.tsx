import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockLocales: { languageTag: string }[] = [{ languageTag: 'en-US' }];
jest.mock('expo-localization', () => ({
  getLocales: () => mockLocales,
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nProvider, useI18n } from '../src/i18n/context';

const STORAGE_KEY = 'regatta.lang.v1';

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockLocales.length = 0;
  mockLocales.push({ languageTag: 'en-US' });
});

describe('I18nProvider hydration', () => {
  it('starts in the default lang and flips ready=true after hydration', async () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    // DEFAULT_LANG is 'ru' but the device locale mock is 'en-US' so once
    // hydration finishes the resolved lang should be 'en'.
    expect(result.current.ready).toBe(false);
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.lang).toBe('en');
  });

  it('honors lang persisted in AsyncStorage over the device locale', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'pl');
    const { result } = renderHook(() => useI18n(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.lang).toBe('pl');
  });

  it('falls back to DEFAULT_LANG when device locale is unsupported', async () => {
    mockLocales.length = 0;
    mockLocales.push({ languageTag: 'jp-JP' });
    const { result } = renderHook(() => useI18n(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.lang).toBe('ru');
  });

  it('ignores invalid AsyncStorage values and falls through to device locale', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'klingon');
    const { result } = renderHook(() => useI18n(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    // device-locale mock = en-US -> 'en'
    expect(result.current.lang).toBe('en');
  });
});

describe('I18nProvider tp / tl resolution', () => {
  it('tp resolves the right language and persists across re-renders', async () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.tp('РУ', 'EN', 'PL')).toBe('EN');
    act(() => {
      result.current.setLang('pl');
    });
    expect(result.current.tp('РУ', 'EN', 'PL')).toBe('PL');
  });

  it('tp picks the matching extras key for ES/FR/DE/IT', async () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    const extras = { es: 'ES', fr: 'FR', de: 'DE', it: 'IT' };
    act(() => {
      result.current.setLang('es');
    });
    expect(result.current.tp('РУ', 'EN', 'PL', extras)).toBe('ES');
    act(() => {
      result.current.setLang('fr');
    });
    expect(result.current.tp('РУ', 'EN', 'PL', extras)).toBe('FR');
    act(() => {
      result.current.setLang('de');
    });
    expect(result.current.tp('РУ', 'EN', 'PL', extras)).toBe('DE');
    act(() => {
      result.current.setLang('it');
    });
    expect(result.current.tp('РУ', 'EN', 'PL', extras)).toBe('IT');
  });

  it('tp falls back to EN when an extras key is missing', async () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => {
      result.current.setLang('it');
    });
    // No `it` key in extras -> fall through to EN.
    expect(result.current.tp('РУ', 'EN', 'PL', { es: 'ES' })).toBe('EN');
  });

  it('tl resolves to the requested locale when present', async () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => {
      result.current.setLang('pl');
    });
    expect(result.current.tl({ ru: 'РУ', en: 'EN', pl: 'PL' })).toBe('PL');
  });

  it('setLang writes the chosen language back to AsyncStorage', async () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => {
      result.current.setLang('de');
    });
    await waitFor(async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      expect(stored).toBe('de');
    });
  });
});
