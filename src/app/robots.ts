import type { MetadataRoute } from 'next';

// ============================================================================
// Dynamic robots.txt (Next 13+).
//
// Allow all known search engines on public content; disallow the admin
// dashboard, all API endpoints, the share-link shortcuts (which 302-redirect
// to / anyway, no value to crawl), and one-off replay codes.
//
// Sitemap reference points crawlers to the sitemap.ts file so they
// discover every public route in every language without us listing each
// here.
// ============================================================================

const SITE_URL = 'https://weektoregatta.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/stats',
          '/r/',
          // Lang-shortcut redirects - cookie-pinning routes, no content to
          // index. Each one 302s to '/' so they'd dilute crawl budget for
          // nothing.
          '/ru', '/en', '/pl', '/es', '/fr', '/de', '/it',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
