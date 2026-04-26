'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { legacyPick } from '@/lib/languages';
import { galleryItems, groupByBadge, youtubeThumb, type GalleryItem } from '@/data/gallery';
import { useI18n } from '@/lib/i18n';
import ContentFooterNav from '@/components/ContentFooterNav';

// ---------------------------------------------------------------------------
// Gallery page - masonry grid of photo / video tiles with click-to-enlarge
// lightbox + per-photo "like" button (anonymous, persisted server-side).
//
// Data: src/data/gallery.ts. To add photos drop them into
// public/gallery/<event>/full and /thumb (1600px / 600px JPEG q80/q75) and
// add entries.
// Likes: /api/gallery/likes (bulk fetch) + /api/gallery/like (toggle).
// ---------------------------------------------------------------------------

interface LikeState {
  count: number;
  liked: boolean;
}

export default function GalleryPage() {
  const { tp, lang } = useI18n();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [likes, setLikes] = useState<Record<string, LikeState>>({});
  const inFlight = useRef<Set<string>>(new Set());

  const groups = useMemo(() => groupByBadge(galleryItems), []);
  const sortedKeys = useMemo(() => Object.keys(groups).sort().reverse(), [groups]);

  const pickTitle = useCallback(
    (item: GalleryItem) => legacyPick(item, 'title', lang),
    [lang],
  );

  // Bulk-fetch likes once on mount. The endpoint takes a comma-separated
  // list of IDs and returns { itemId: { count, liked } }. We keep the
  // result in state and update optimistically on click.
  useEffect(() => {
    const ids = galleryItems.map((it) => it.id).join(',');
    let cancelled = false;
    fetch(`/api/gallery/likes?ids=${encodeURIComponent(ids)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: Record<string, LikeState>) => {
        if (!cancelled) setLikes(data);
      })
      .catch(() => { /* gracefully degrade - hearts show 0 */ });
    return () => { cancelled = true; };
  }, []);

  const toggleLike = useCallback(async (id: string) => {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);

    // Optimistic update
    setLikes((prev) => {
      const cur = prev[id] ?? { count: 0, liked: false };
      const next: LikeState = {
        liked: !cur.liked,
        count: cur.count + (cur.liked ? -1 : 1),
      };
      return { ...prev, [id]: next };
    });

    try {
      const res = await fetch('/api/gallery/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const truth = await res.json() as LikeState;
      // Reconcile: if server count differs from optimistic, snap to server
      setLikes((prev) => ({ ...prev, [id]: truth }));
    } catch {
      // Roll back the optimistic toggle
      setLikes((prev) => {
        const cur = prev[id];
        if (!cur) return prev;
        return {
          ...prev,
          [id]: { liked: !cur.liked, count: cur.count + (cur.liked ? -1 : 1) },
        };
      });
    } finally {
      inFlight.current.delete(id);
    }
  }, []);

  const active = activeId ? galleryItems.find((i) => i.id === activeId) ?? null : null;

  // Close on Escape, navigate with arrows
  useEffect(() => {
    if (!active) return;
    const idx = galleryItems.findIndex((i) => i.id === active.id);
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveId(null);
      if (e.key === 'ArrowRight' && idx < galleryItems.length - 1) setActiveId(galleryItems[idx + 1].id);
      if (e.key === 'ArrowLeft' && idx > 0) setActiveId(galleryItems[idx - 1].id);
    };
    window.addEventListener('keydown', handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prev;
    };
  }, [active]);

  return (
    <div className="page-enter">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-6">
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight mb-2"
          style={{
            background: 'linear-gradient(135deg, var(--text-primary), var(--accent-cyan))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {tp('Галерея', 'Gallery', 'Galeria',
            { es: 'Galeria', fr: 'Galerie', de: 'Galerie', it: 'Galleria' })}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          {tp(
            'Видео и фото с прошлых регат. Нажми на сердце - сохраним на потом.',
            'Videos and photos from past regattas. Tap a heart to save it.',
            'Wideo i zdjecia z przeszlych regat. Klik w serce - zapamiec.',
            {
              es: 'Videos y fotos de regatas pasadas. Pulsa el corazon para guardar.',
              fr: 'Videos et photos des regates passees. Tape sur le coeur pour garder.',
              de: 'Videos und Fotos vergangener Regatten. Tippe aufs Herz zum Merken.',
              it: 'Video e foto di regate passate. Tocca il cuore per salvare.',
            },
          )}
        </p>
      </section>

      {sortedKeys.length === 0 || galleryItems.length === 0 ? (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
          <div className="card p-12 text-center">
            <p className="text-[var(--text-muted)]">
              {tp('Пока пусто, скоро будет материал.', 'Empty for now, content coming soon.', 'Jeszcze pusto, zawartosc wkrotce.')}
            </p>
          </div>
        </section>
      ) : (
        sortedKeys.map((key) => (
          <section key={key} className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
            {key !== 'misc' && (
              <div className="flex items-baseline gap-3 mb-5">
                <h2 className="text-2xl font-bold">{key}</h2>
                <span className="text-sm text-[var(--text-muted)]">
                  {tp(
                    `${groups[key].length} ${pluralRu(groups[key].length, 'файл', 'файла', 'файлов')}`,
                    `${groups[key].length} ${groups[key].length === 1 ? 'item' : 'items'}`,
                    `${groups[key].length} ${pluralPl(groups[key].length)}`,
                    {
                      es: `${groups[key].length} ${groups[key].length === 1 ? 'archivo' : 'archivos'}`,
                      fr: `${groups[key].length} ${groups[key].length === 1 ? 'fichier' : 'fichiers'}`,
                      de: `${groups[key].length} ${groups[key].length === 1 ? 'Datei' : 'Dateien'}`,
                      it: `${groups[key].length} ${groups[key].length === 1 ? 'file' : 'file'}`,
                    },
                  )}
                </span>
              </div>
            )}
            {/*
              CSS multi-column masonry. Cheap, accessible, no JS layout
              math. Photos flow naturally and keep their full aspect ratio
              instead of being cropped into uniform tiles. break-inside on
              tiles avoids mid-tile column breaks.
            */}
            <div className="masonry-cols [column-gap:0.75rem] sm:[column-gap:1rem]">
              {groups[key].map((item) => (
                <Tile
                  key={item.id}
                  item={item}
                  title={pickTitle(item)}
                  like={likes[item.id]}
                  onOpen={() => setActiveId(item.id)}
                  onLike={() => toggleLike(item.id)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {/*
        Tailwind doesn't ship column-count utilities so we set them inline
        via a small style block. Three breakpoints: 2 / 3 / 4 columns
        depending on viewport.
      */}
      <style jsx>{`
        .masonry-cols { column-count: 2; }
        @media (min-width: 640px)  { .masonry-cols { column-count: 3; } }
        @media (min-width: 1024px) { .masonry-cols { column-count: 4; } }
        .masonry-cols > * {
          break-inside: avoid;
          margin-bottom: 0.75rem;
          display: block;
        }
        @media (min-width: 640px) {
          .masonry-cols > * { margin-bottom: 1rem; }
        }
      `}</style>

      {/* Lightbox */}
      {active && (
        <Lightbox
          item={active}
          title={pickTitle(active)}
          like={likes[active.id]}
          onLike={() => toggleLike(active.id)}
          onClose={() => setActiveId(null)}
          onPrev={() => {
            const idx = galleryItems.findIndex((i) => i.id === active.id);
            if (idx > 0) setActiveId(galleryItems[idx - 1].id);
          }}
          onNext={() => {
            const idx = galleryItems.findIndex((i) => i.id === active.id);
            if (idx < galleryItems.length - 1) setActiveId(galleryItems[idx + 1].id);
          }}
          canPrev={galleryItems.findIndex((i) => i.id === active.id) > 0}
          canNext={galleryItems.findIndex((i) => i.id === active.id) < galleryItems.length - 1}
          closeLabel={tp('Закрыть', 'Close', 'Zamknij',
            { es: 'Cerrar', fr: 'Fermer', de: 'Schliessen', it: 'Chiudi' })}
          prevLabel={tp('Предыдущее', 'Previous', 'Poprzednie',
            { es: 'Anterior', fr: 'Precedent', de: 'Zurueck', it: 'Precedente' })}
          nextLabel={tp('Следующее', 'Next', 'Nastepne',
            { es: 'Siguiente', fr: 'Suivant', de: 'Weiter', it: 'Successivo' })}
        />
      )}

      <ContentFooterNav page="/gallery" />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Tile({
  item,
  title,
  like,
  onOpen,
  onLike,
}: {
  item: GalleryItem;
  title: string;
  like: LikeState | undefined;
  onOpen: () => void;
  onLike: () => void;
}) {
  // Use the small thumb if we have one, otherwise the full src. For
  // YouTube tiles, fall back to YouTube's hqdefault.
  const tileSrc =
    item.kind === 'youtube'
      ? (item.thumb ?? youtubeThumb(item.src))
      : (item.thumb ?? item.src);
  // Aspect ratio reservation: if we have width/height we use that exact
  // ratio so the masonry doesn't reflow on image load. Otherwise fall back
  // to the legacy `aspect` enum.
  const ratioStyle: React.CSSProperties =
    item.width && item.height
      ? { aspectRatio: `${item.width} / ${item.height}` }
      : {};
  const ratioClass = !item.width && !item.height
    ? aspectToClass(item.aspect ?? (item.kind === 'youtube' ? '16:9' : 'square'))
    : '';

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:scale-[1.02] hover:border-[var(--accent-cyan)] ${ratioClass}`}
      style={{
        ...ratioStyle,
        borderColor: 'rgba(0, 212, 255, 0.18)',
        background: 'rgba(0, 212, 255, 0.04)',
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 w-full h-full"
        aria-label={title}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tileSrc}
          alt={title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-70 group-hover:opacity-90 transition-opacity" />
      </button>

      {/* Per-tile year badge intentionally NOT rendered here. The
          section header above the masonry already shows the year for
          the whole group, so a badge on every photo is redundant noise.
          The `badge` field stays in the data model because we still
          group-by it. */}

      {item.kind === 'youtube' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ background: 'rgba(0, 212, 255, 0.85)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#0a1628">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Heart button - top-right, opposite the badge */}
      <LikeButton
        liked={like?.liked ?? false}
        count={like?.count ?? 0}
        onToggle={onLike}
        className="absolute top-2 right-2"
      />

      {/* Title bar at bottom (above the image, below the LikeButton). The
          gallery doesn't actually need persistent titles for drone shots
          all named the same date; we render only when there's something
          beyond the date. */}
    </div>
  );
}

// ---------------------------------------------------------------------------

function LikeButton({
  liked,
  count,
  onToggle,
  className = '',
}: {
  liked: boolean;
  count: number;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-all backdrop-blur-md ${className}`}
      style={{
        background: liked ? 'rgba(255, 80, 100, 0.85)' : 'rgba(10, 22, 40, 0.55)',
        color: liked ? '#ffffff' : '#e8f4f8',
        border: liked
          ? '1px solid rgba(255, 80, 100, 0.95)'
          : '1px solid rgba(255, 255, 255, 0.18)',
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}

// ---------------------------------------------------------------------------

function Lightbox({
  item,
  title,
  like,
  onLike,
  onClose,
  onPrev,
  onNext,
  canPrev,
  canNext,
  closeLabel,
  prevLabel,
  nextLabel,
}: {
  item: GalleryItem;
  title: string;
  like: LikeState | undefined;
  onLike: () => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  closeLabel: string;
  prevLabel: string;
  nextLabel: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5, 11, 24, 0.92)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        onClick={onClose}
        aria-label={closeLabel}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8f4f8" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {canPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label={prevLabel}
          className="absolute left-4 z-20 w-11 h-11 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8f4f8" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {canNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label={nextLabel}
          className="absolute right-4 z-20 w-11 h-11 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8f4f8" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      <div
        className="relative max-w-6xl w-full max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {item.kind === 'youtube' ? (
          <div className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl" style={{ maxHeight: '80vh' }}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${item.src}?autoplay=1&rel=0`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.src}
            alt={title}
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
          />
        )}
        <div className="mt-3 flex items-center gap-3">
          <p className="text-sm text-[var(--text-secondary)] text-center">{title}</p>
          <LikeButton
            liked={like?.liked ?? false}
            count={like?.count ?? 0}
            onToggle={onLike}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function aspectToClass(a: NonNullable<GalleryItem['aspect']>): string {
  switch (a) {
    case 'square':    return 'aspect-square';
    case 'portrait':  return 'aspect-[3/4]';
    case 'landscape': return 'aspect-[4/3]';
    case '16:9':      return 'aspect-video';
  }
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function pluralPl(n: number): string {
  if (n === 1) return 'plik';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'pliki';
  return 'plikow';
}
