import { appSurface, type Surface } from './surface';

/** The host owns presentation; saved course/race data and web theme stay separate. */
export function embeddedThemeScript(surface: Surface): string {
  const theme = surface === 'dark' ? 'dark' : 'light';
  return `(function(){window.__REGATTA_EMBED_THEME__=${JSON.stringify(theme)};if(document.documentElement)document.documentElement.dataset.theme=${JSON.stringify(theme)};window.dispatchEvent(new Event('regatta-theme-change'));})();true;`;
}

// Native currently has one day palette. Keep its loading frame, safe area and
// local HTML on that same palette, independently of sea lighting/radio hardware.
export const APP_EMBED_THEME_SCRIPT = embeddedThemeScript(appSurface);
