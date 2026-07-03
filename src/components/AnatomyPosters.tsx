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
//
// Shareable links: opening a poster pushes `#poster=<id>` to the URL
// (and the lightbox restores from that hash on direct landing). The
// lightbox itself has a "Copy link" button that copies the full
// shareable URL with both `?lang=<ru|en>` and `#poster=<id>` so the
// recipient lands on the right language version with the poster
// already open.
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
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

/** Read `#poster=<id>` from the URL. Returns null if absent / malformed. */
function readHashPosterId(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const id = params.get('poster');
  if (!id) return null;
  return POSTERS.some((p) => p.id === id) ? id : null;
}

/** Push or clear `#poster=<id>` on the URL via `replaceState` (so the
 *  back-button doesn't accumulate one history entry per click). */
function writeHashPosterId(id: string | null) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (id) {
    url.hash = 'poster=' + id;
  } else {
    url.hash = '';
  }
  // Strip the trailing '#' that URL.toString leaves when hash is empty.
  const next = url.toString().replace(/#$/, '');
  window.history.replaceState(null, '', next);
}

/** Build the shareable URL for a given poster + locale. Always includes
 *  `?lang=<ru|en>` so recipients land on the right localized page even
 *  if their cookie / Accept-Language disagrees. */
function shareUrl(posterId: string, lang: PosterLang): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.searchParams.set('lang', lang);
  url.hash = 'poster=' + posterId;
  return url.toString();
}

export default function AnatomyPosters() {
  const { lang, tp } = useI18n();
  // Only render when the active locale is RU or EN. Per brief: do NOT
  // auto-fallback to EN on PL/ES/FR/DE/IT - just hide.
  const posterLang: PosterLang | null =
    lang === 'ru' ? 'ru' : lang === 'en' ? 'en' : null;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Hydrate from `#poster=...` on first mount, and react to hashchange
  // events (browser back/forward, manually editing the hash).
  useEffect(() => {
    setActiveId(readHashPosterId());
    const onHashChange = () => setActiveId(readHashPosterId());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Mirror state -> URL whenever the user opens / closes a poster.
  useEffect(() => {
    writeHashPosterId(activeId);
  }, [activeId]);

  // Lightbox key handlers + body scroll lock.
  // Esc closes; arrow-left / -right step through the posters in order
  // (wraps around so a 2-poster set always has somewhere to go).
  useEffect(() => {
    if (!activeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveId(null);
        return;
      }
      const idx = POSTERS.findIndex((p) => p.id === activeId);
      if (idx < 0) return;
      if (e.key === 'ArrowRight') {
        setActiveId(POSTERS[(idx + 1) % POSTERS.length].id);
      } else if (e.key === 'ArrowLeft') {
        setActiveId(POSTERS[(idx - 1 + POSTERS.length) % POSTERS.length].id);
      }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [activeId]);

  // Reset the "copied!" badge a couple seconds after a successful copy.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const handleShare = useCallback(async () => {
    if (!activeId || !posterLang) return;
    const url = shareUrl(activeId, posterLang);
    // Prefer the native share sheet when available (mobile / PWA).
    // Fall back to clipboard + visual badge when not.
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ url, title: 'Regatta · Anatomy poster' });
        return;
      } catch {
        // user cancelled or share failed; drop to clipboard fallback
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Last-resort fallback: prompt so the user can copy manually.
      try { window.prompt('Share this link:', url); } catch { /* noop */ }
    }
  }, [activeId, posterLang]);

  if (!posterLang) return null;

  const active = activeId ? POSTERS.find((p) => p.id === activeId) ?? null : null;
  const pickTitle = (p: Poster) => (posterLang === 'ru' ? p.titleRu : p.titleEn);

  const closeLabel = tp('Закрыть', 'Close', 'Zamknij',
    { es: 'Cerrar', fr: 'Fermer', de: 'Schliessen', it: 'Chiudi' });
  const shareLabel = tp('Поделиться', 'Share', 'Udostepnij',
    { es: 'Compartir', fr: 'Partager', de: 'Teilen', it: 'Condividi' });
  const copiedLabel = tp('Ссылка скопирована', 'Link copied', 'Skopiowano link',
    { es: 'Enlace copiado', fr: 'Lien copie', de: 'Link kopiert', it: 'Link copiato' });
  const prevLabel = tp('Предыдущий', 'Previous', 'Poprzedni',
    { es: 'Anterior', fr: 'Precedent', de: 'Zurueck', it: 'Precedente' });
  const nextLabel = tp('Следующий', 'Next', 'Nastepny',
    { es: 'Siguiente', fr: 'Suivant', de: 'Weiter', it: 'Successivo' });

  const activeIdx = active ? POSTERS.findIndex((p) => p.id === active.id) : -1;
  const goPrev = () => {
    if (activeIdx < 0) return;
    setActiveId(POSTERS[(activeIdx - 1 + POSTERS.length) % POSTERS.length].id);
  };
  const goNext = () => {
    if (activeIdx < 0) return;
    setActiveId(POSTERS[(activeIdx + 1) % POSTERS.length].id);
  };

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

      {/* Preview cards. The original poster aspect is 941x1672 (a tall
          portrait infographic); rendering the cards at that ratio in a
          2-up grid makes them ~1000 px tall on desktop and the page
          reads as "stretched". Use a compact 4:5 preview that crops to
          the TOP of the poster (`object-position: top`) so the
          recognizable title + headline graphic show. The full image is
          one click away in the lightbox. */}
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
              aspectRatio: '4 / 5',
            }}
            aria-label={pickTitle(p)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbSrc(p.stem, posterLang)}
              alt={pickTitle(p)}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <div
              className="absolute inset-x-0 bottom-0 px-3 py-2 text-xs font-semibold pointer-events-none flex items-center justify-between gap-2"
              style={{
                background: 'linear-gradient(180deg, rgba(10, 22, 40, 0) 0%, rgba(10, 22, 40, 0.92) 60%)',
                color: '#e8f4f8',
              }}
            >
              <span className="truncate">{pickTitle(p)}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ color: 'var(--accent-cyan)', flexShrink: 0 }}>
                {/* arrows-out icon to hint "click to enlarge" */}
                <path d="M3 8V3h5" />
                <path d="M21 8V3h-5" />
                <path d="M3 16v5h5" />
                <path d="M21 16v5h-5" />
              </svg>
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
          {/* Top-right: Share + Close. Both are above the image so the
              user's thumb on mobile naturally hits them. */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleShare(); }}
              aria-label={shareLabel}
              title={shareLabel}
              className="flex items-center gap-1.5 px-3 h-10 rounded-full text-xs font-semibold transition-colors hover:bg-white/10"
              style={{
                background: copied ? 'rgba(0, 212, 255, 0.22)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${copied ? 'rgba(0, 212, 255, 0.6)' : 'rgba(255,255,255,0.15)'}`,
                color: copied ? '#00d4ff' : '#e8f4f8',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {copied ? (
                  // Checkmark
                  <polyline points="20 6 9 17 4 12" />
                ) : (
                  // Generic share icon (3 connected nodes)
                  <>
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
                    <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
                  </>
                )}
              </svg>
              <span>{copied ? copiedLabel : shareLabel}</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setActiveId(null); }}
              aria-label={closeLabel}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8f4f8" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Prev/Next chevrons. Only render when there's more than
              one poster (1-poster set has nowhere to go). On mobile
              they sit slightly inset so the user's thumb always
              reaches them. */}
          {POSTERS.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                aria-label={prevLabel}
                title={prevLabel}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8f4f8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                aria-label={nextLabel}
                title={nextLabel}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8f4f8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}

          <div
            className="relative max-w-5xl w-full max-h-[92vh] flex flex-col items-center justify-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullSrc(active.stem, posterLang)}
              alt={pickTitle(active)}
              className="max-w-full max-h-[88vh] object-contain rounded-xl shadow-2xl"
            />
            {/* Index indicator - small chip below the image, e.g. "1 / 2" */}
            {POSTERS.length > 1 && (
              <div
                className="text-[11px] font-mono tabular-nums px-2.5 py-1 rounded-full"
                style={{
                  background: 'rgba(10, 22, 40, 0.6)',
                  border: '1px solid rgba(0, 212, 255, 0.25)',
                  color: 'var(--text-muted)',
                }}
              >
                {activeIdx + 1} / {POSTERS.length}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
