'use client';

// ============================================================================
// AnatomyPosters
//
// Two infographic posters that complement the interactive 3D model on
// /anatomy: "Sailing Yacht / Main Elements" + "Deck and Cockpit". The
// supplier provided RU + EN versions only - per Andrey, when the UI is
// in RU or EN we show their respective version, on every other locale
// the section is hidden entirely (no auto-fallback to EN, deliberate
// per the brief).
//
// Posters live under public/anatomy/posters/ as JPEG pairs (full +
// thumb). Click the thumb to open a lightbox with the high-res image;
// Esc / click-outside / close-button dismisses.
// ============================================================================

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';

type PosterLang = 'ru' | 'en';

interface Poster {
  id: string;
  titleRu: string;
  titleEn: string;
  /** Filename stem under /anatomy/posters/. We append `-{lang}.jpg`
   *  for full and `-{lang}-thumb.jpg` for the grid card. */
  stem: string;
}

const POSTERS: Poster[] = [
  {
    id: 'main-elements',
    titleRu: 'Парусная яхта - основные элементы',
    titleEn: 'Sailing Yacht - Main Elements',
    stem: 'main-elements',
  },
  {
    id: 'deck-cockpit',
    titleRu: 'Палуба и кокпит',
    titleEn: 'Deck and Cockpit',
    stem: 'deck-cockpit',
  },
];

function fullSrc(stem: string, lang: PosterLang): string {
  return `/anatomy/posters/${stem}-${lang}.jpg`;
}
function thumbSrc(stem: string, lang: PosterLang): string {
  return `/anatomy/posters/${stem}-${lang}-thumb.jpg`;
}

export default function AnatomyPosters() {
  const { lang, tp } = useI18n();
  // Only render when the active locale is RU or EN. Per brief: do NOT
  // auto-fallback to EN on PL/ES/FR/DE/IT - just hide.
  const posterLang: PosterLang | null =
    lang === 'ru' ? 'ru' : lang === 'en' ? 'en' : null;

  const [activeId, setActiveId] = useState<string | null>(null);

  // Esc closes lightbox; lock body scroll while open.
  useEffect(() => {
    if (!activeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveId(null);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [activeId]);

  if (!posterLang) return null;

  const active = activeId ? POSTERS.find((p) => p.id === activeId) ?? null : null;
  const pickTitle = (p: Poster) => (posterLang === 'ru' ? p.titleRu : p.titleEn);

  return (
    <section className="mt-10">
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">
          {tp('Графика', 'Graphics', 'Graphics',
            { es: 'Graphics', fr: 'Graphics', de: 'Graphics', it: 'Graphics' })}
        </h2>
        <span className="text-xs text-[var(--text-muted)]">
          {tp('Постеры', 'Posters', 'Posters',
            { es: 'Posters', fr: 'Posters', de: 'Posters', it: 'Posters' })}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {POSTERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveId(p.id)}
            className="group relative overflow-hidden rounded-xl border transition-all duration-300 hover:scale-[1.01] hover:border-[var(--accent-cyan)] text-left"
            style={{
              borderColor: 'rgba(0, 212, 255, 0.18)',
              background: 'rgba(0, 212, 255, 0.04)',
              aspectRatio: '941 / 1672',
            }}
            aria-label={pickTitle(p)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbSrc(p.stem, posterLang)}
              alt={pickTitle(p)}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <div
              className="absolute inset-x-0 bottom-0 px-3 py-2 text-xs font-semibold pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(10, 22, 40, 0) 0%, rgba(10, 22, 40, 0.85) 100%)',
                color: 'var(--text-primary)',
              }}
            >
              {pickTitle(p)}
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(5, 11, 24, 0.92)', backdropFilter: 'blur(8px)' }}
          onClick={() => setActiveId(null)}
          role="dialog"
          aria-modal="true"
          aria-label={pickTitle(active)}
        >
          <button
            onClick={() => setActiveId(null)}
            aria-label={tp('Закрыть', 'Close', 'Zamknij',
              { es: 'Cerrar', fr: 'Fermer', de: 'Schliessen', it: 'Chiudi' })}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8f4f8" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div
            className="relative max-w-5xl w-full max-h-[92vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullSrc(active.stem, posterLang)}
              alt={pickTitle(active)}
              className="max-w-full max-h-[92vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </section>
  );
}
