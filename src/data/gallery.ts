// ============================================================================
// Gallery data - videos and photos from past regattas.
//
// Photos: drop files into /public/gallery/ and add an entry below with
//   src: '/gallery/filename.jpg'. Recommended size: 1600px on longest side,
//   quality 80, WebP if possible. Aspect ratio is free - the grid adapts.
//
// Videos: YouTube `videoId` only (not full URL). CSP allows www.youtube.com
//   and www.youtube-nocookie.com iframe sources.
// ============================================================================

import type { LegacyLocalized } from '@/lib/languages';

export type GalleryKind = 'image' | 'youtube';

export type GalleryItem = LegacyLocalized<'title'> & {
  id: string;
  kind: GalleryKind;
  /** For images: relative path under /public. For YouTube: the 11-char video ID. */
  src: string;
  /** Optional thumbnail override for videos. If omitted and kind==='youtube',
   *  we use YouTube's hqdefault thumbnail. */
  thumb?: string;
  /** Year / event tag, e.g. '2025', shown as a badge. */
  badge?: string;
  /** Aspect ratio hint for the grid. Default = 'square'. Videos default to 16:9. */
  aspect?: 'square' | 'portrait' | 'landscape' | '16:9';
};

export const galleryItems: GalleryItem[] = [
  // ---- 2025 season ----
  {
    id: 'regata-2025-video',
    kind: 'youtube',
    src: 'OLsHVGoShbA',
    titleRu: 'Регата 2025 - видео',
    titleEn: 'Regatta 2025 - video',
    titlePl: 'Regata 2025 - wideo',
    badge: '2025',
    aspect: '16:9',
  },

  // ---- Photos: drop files into public/gallery/ and add entries here ----
  // Example entry (uncomment and adjust once you have a file):
  // {
  //   id: 'regata-2025-start',
  //   kind: 'image',
  //   src: '/gallery/2025-start.jpg',
  //   titleRu: 'Старт',
  //   titleEn: 'Start line',
  //   titlePl: 'Start',
  //   badge: '2025',
  //   aspect: 'landscape',
  // },
];

/** Group items by badge (year/event) for sectioned rendering. */
export function groupByBadge(items: GalleryItem[]): Record<string, GalleryItem[]> {
  const out: Record<string, GalleryItem[]> = {};
  for (const item of items) {
    const key = item.badge ?? 'misc';
    (out[key] ||= []).push(item);
  }
  return out;
}

/** Best YouTube thumbnail URL for a video id (hqdefault is served fast and
 *  is 480x360, good for grid tiles). */
export function youtubeThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
