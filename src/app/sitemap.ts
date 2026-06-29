import type { MetadataRoute } from 'next';
import { ENABLED_LANGUAGES } from '@/lib/languages';

// ============================================================================
// Dynamic sitemap (Next 13+). Lists every public content route and provides
// hreflang `alternates` for all 7 enabled languages, mirroring the
// alternates.languages section in src/app/layout.tsx generateMetadata.
//
// Excluded by design:
//   - /stats and /api/admin/* (auth-gated, NOT indexable)
//   - /api/* (data endpoints, not pages)
//   - /r/[code] (per-replay, infinite combinatorial space; expose via OG when
//     shared, no need to crawl)
//
// Update PUBLIC_ROUTES whenever we add a new top-level user-facing page.
// ============================================================================

const SITE_URL = 'https://weektoregatta.com';

interface RouteSpec {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}

const PUBLIC_ROUTES: RouteSpec[] = [
  { path: '/',           changeFrequency: 'weekly',  priority: 1.00 },
  { path: '/start',      changeFrequency: 'weekly',  priority: 0.95 },
  { path: '/onboard',    changeFrequency: 'monthly', priority: 0.85 },
  { path: '/checklist',  changeFrequency: 'monthly', priority: 0.85 },
  { path: '/courses',    changeFrequency: 'monthly', priority: 0.85 },
  { path: '/racing',     changeFrequency: 'monthly', priority: 0.85 },
  { path: '/rules',      changeFrequency: 'monthly', priority: 0.85 },
  { path: '/glossary',   changeFrequency: 'monthly', priority: 0.85 },
  { path: '/anatomy',    changeFrequency: 'monthly', priority: 0.80 },
  { path: '/gallery',    changeFrequency: 'monthly', priority: 0.70 },
  { path: '/simulator',  changeFrequency: 'weekly',  priority: 0.90 },
  { path: '/simulator2', changeFrequency: 'weekly',  priority: 0.70 },
  { path: '/simulator-v3', changeFrequency: 'weekly', priority: 0.70 },
  { path: '/game',       changeFrequency: 'weekly',  priority: 0.95 },
  { path: '/multiplayer', changeFrequency: 'weekly', priority: 0.80 },
  { path: '/leaderboard', changeFrequency: 'daily',  priority: 0.75 },
  { path: '/spots',      changeFrequency: 'daily',   priority: 0.70 },
  { path: '/quick',      changeFrequency: 'weekly',  priority: 0.60 },
  { path: '/privacy',    changeFrequency: 'yearly',  priority: 0.30 },
  { path: '/support',    changeFrequency: 'yearly',  priority: 0.40 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  // Build hreflang alternates once: { en: ..., ru: ..., pl: ..., es: ..., ... }
  // Each is an absolute URL since search engines require absolute hrefs in
  // hreflang annotations.
  const buildAlternates = (path: string) => {
    const langs: Record<string, string> = {};
    for (const lang of ENABLED_LANGUAGES) {
      langs[lang.htmlLang] = `${SITE_URL}${path === '/' ? '/' : path}?lang=${lang.id}`;
    }
    // x-default points at the language-neutral URL, which then resolves via
    // Accept-Language / cookie / proxy.ts to the visitor's preferred lang.
    langs['x-default'] = `${SITE_URL}${path === '/' ? '/' : path}`;
    return langs;
  };

  return PUBLIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path === '/' ? '/' : r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
    alternates: { languages: buildAlternates(r.path) },
  }));
}
