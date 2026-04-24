'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { legacyPick } from '@/lib/languages';
import { galleryItems, groupByBadge, youtubeThumb, type GalleryItem } from '@/data/gallery';
import { useI18n } from '@/lib/i18n';
import ContentFooterNav from '@/components/ContentFooterNav';

// ---------------------------------------------------------------------------
// Gallery page - grid of photo/video tiles with click-to-enlarge lightbox.
//
// Data comes from src/data/gallery.ts. To add photos: drop files into
// public/gallery/ and add entries to galleryItems.
// ---------------------------------------------------------------------------

export default function GalleryPage() {
  const { tp, lang } = useI18n();
  const [activeId, setActiveId] = useState<string | null>(null);

  const groups = useMemo(() => groupByBadge(galleryItems), []);
  const sortedKeys = useMemo(() => Object.keys(groups).sort().reverse(), [groups]);

  const pickTitle = useCallback(
    (item: GalleryItem) =>
      legacyPick(item, 'title', lang),
    [lang],
  );

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
    // Lock body scroll while lightbox is open
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
          {tp('Галерея', 'Gallery', 'Galeria')}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          {tp(
            'Видео и фото с прошлых регат',
            'Videos and photos from past regattas',
            'Wideo i zdjecia z przeszlych regat',
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
                  )}
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {groups[key].map((item) => (
                <Tile
                  key={item.id}
                  item={item}
                  title={pickTitle(item)}
                  onOpen={() => setActiveId(item.id)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {/* Lightbox */}
      {active && (
        <Lightbox
          item={active}
          title={pickTitle(active)}
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
          closeLabel={tp('Закрыть', 'Close', 'Zamknij')}
          prevLabel={tp('Предыдущее', 'Previous', 'Poprzednie')}
          nextLabel={tp('Следующее', 'Next', 'Nastepne')}
        />
      )}

      <ContentFooterNav page="/gallery" />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Tile({ item, title, onOpen }: { item: GalleryItem; title: string; onOpen: () => void }) {
  const aspectClass = aspectToClass(item.aspect ?? (item.kind === 'youtube' ? '16:9' : 'square'));
  const thumb = item.kind === 'youtube' ? (item.thumb ?? youtubeThumb(item.src)) : item.src;

  return (
    <button
      onClick={onOpen}
      className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:scale-[1.02] hover:border-[var(--accent-cyan)] ${aspectClass}`}
      style={{
        borderColor: 'rgba(0, 212, 255, 0.18)',
        background: 'rgba(0, 212, 255, 0.04)',
      }}
      aria-label={title}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumb}
        alt={title}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      {/* Dark overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-70 group-hover:opacity-90 transition-opacity" />

      {/* Badge */}
      {item.badge && (
        <span
          className="absolute top-2 left-2 text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded"
          style={{
            background: 'rgba(0, 212, 255, 0.2)',
            color: '#e8f4f8',
            backdropFilter: 'blur(4px)',
          }}
        >
          {item.badge}
        </span>
      )}

      {/* Play icon for videos */}
      {item.kind === 'youtube' && (
        <div className="absolute inset-0 flex items-center justify-center">
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

      {/* Title at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
        <p className="text-xs sm:text-sm font-semibold text-white leading-tight line-clamp-2">{title}</p>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------

function Lightbox({
  item,
  title,
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
      {/* Close button */}
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

      {/* Prev arrow */}
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

      {/* Next arrow */}
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

      {/* Content */}
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
        <p className="mt-3 text-sm text-[var(--text-secondary)] text-center">{title}</p>
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
