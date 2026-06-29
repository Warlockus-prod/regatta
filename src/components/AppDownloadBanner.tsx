'use client';

import { useI18n } from '@/lib/i18n';

// ============================================================================
// AppDownloadBanner - "get the iOS app" call to action for the website.
//
// Links to "Week to Regatta" on the App Store (Apple app id 6768134329). The
// badge is inline SVG (Apple glyph + text) so there is no external image fetch
// and nothing for the CSP to block. The mobile app is React Native (Expo).
// ============================================================================

export const APP_STORE_URL = 'https://apps.apple.com/app/id6768134329';

function AppStoreBadge({ label }: { label: string }) {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex shrink-0 items-center gap-2.5 rounded-xl bg-black px-4 py-2.5 text-white ring-1 ring-white/15 transition hover:ring-white/45"
    >
      <svg viewBox="0 0 384 512" width="22" height="22" fill="currentColor" aria-hidden="true">
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C32.3 141 .1 184.6 .1 244c0 23.7 4.3 48.2 13 73.5 11.6 33.3 53.5 115.5 97.2 114.2 22.8-.5 38.9-16.2 68.5-16.2 28.7 0 43.6 16.2 69 16.2 44.1-.6 82-75.3 93-108.7-58.9-27.8-55.7-81.4-55.7-83.5zm-57.1-159.9c27.5-32.7 25-62.4 24.2-73.1-24.3 1.4-52.4 16.6-68.4 35.3-17.6 20-27.9 44.8-25.7 70.8 26.3 2 50.3-11.6 69.9-33z" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="text-[10px] opacity-80">Download on the</span>
        <span className="-mt-0.5 text-lg font-semibold">App Store</span>
      </span>
    </a>
  );
}

export function AppDownloadBanner() {
  const { tp } = useI18n();
  return (
    <section className="mx-auto max-w-6xl px-4 pb-2 pt-2 sm:px-6">
      <div
        className="card flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:justify-between sm:text-left"
        style={{ borderColor: 'rgba(0, 212, 255, 0.25)', background: 'rgba(0, 212, 255, 0.06)' }}
      >
        <div className="flex items-center gap-4">
          <div className="text-4xl">📱</div>
          <div>
            <h3 className="text-lg font-semibold">
              {tp('Приложение для iPhone', 'iPhone app', 'Aplikacja na iPhone', {
                es: 'App para iPhone',
                fr: 'Application iPhone',
                de: 'iPhone-App',
                it: 'App per iPhone',
              })}
            </h3>
            <p className="max-w-md text-sm text-[var(--text-secondary)]">
              {tp(
                'Week to Regatta в App Store: уроки, симулятор и тренажёр трима офлайн, в кармане.',
                'Week to Regatta on the App Store: lessons, simulator and trim trainer, offline in your pocket.',
                'Week to Regatta w App Store: lekcje, symulator i trener trymu offline, w kieszeni.',
                {
                  es: 'Week to Regatta en la App Store: lecciones, simulador y entrenador de trimado, sin conexion.',
                  fr: 'Week to Regatta sur l\'App Store : lecons, simulateur et coach de reglage, hors ligne.',
                  de: 'Week to Regatta im App Store: Lektionen, Simulator und Trimm-Trainer, offline.',
                  it: 'Week to Regatta su App Store: lezioni, simulatore e coach di regolazione, offline.',
                },
              )}
            </p>
          </div>
        </div>
        <AppStoreBadge
          label={tp('Скачать в App Store', 'Download on the App Store', 'Pobierz w App Store', {
            es: 'Descargar en la App Store',
            fr: 'Telecharger sur l\'App Store',
            de: 'Im App Store laden',
            it: 'Scarica su App Store',
          })}
        />
      </div>
    </section>
  );
}
