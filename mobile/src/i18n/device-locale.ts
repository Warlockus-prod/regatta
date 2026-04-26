import * as Localization from 'expo-localization';
import { DEFAULT_LANG, isLang, type Lang } from './languages';

/**
 * Pick the best matching app language from the device's locale settings.
 *
 * `expo-localization` exposes the device's preferred locales in priority
 * order (e.g. `['en-US', 'ru']`). We walk that list and map each tag's
 * primary subtag to a supported `Lang`. If nothing matches, we fall back
 * to DEFAULT_LANG.
 *
 * Pure-ish: reads from `Localization.getLocales()` once on call. Safe to
 * call outside React or before hydration.
 */
export function detectDeviceLang(): Lang {
  try {
    const locales = Localization.getLocales();
    for (const locale of locales) {
      const tag = (locale.languageTag ?? '').toLowerCase();
      const base = tag.split('-')[0] ?? tag;
      if (isLang(base)) return base;
    }
  } catch {
    // ignore - fall through
  }
  return DEFAULT_LANG;
}
