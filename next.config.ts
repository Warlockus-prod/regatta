import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin workspace root so Next/Turbopack doesn't walk up to /Users/Andrey and
  // get confused by unrelated parent package.json files.
  outputFileTracingRoot: path.resolve(__dirname),
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Native addons need to be external so Next doesn't try to bundle them
  serverExternalPackages: ["better-sqlite3"],
  // Don't advertise the framework in X-Powered-By. The other security headers
  // (CSP with frame-ancestors, HSTS, nosniff, referrer-policy,
  // permissions-policy) are set by the production nginx layer - verified live -
  // so we do not duplicate them here (duplicate X-Frame-Options / CSP can
  // weaken or conflict).
  poweredByHeader: false,
  env: {
    // The service worker's cache version. It has to change every deploy, or the
    // browser (which compares sw.js byte-for-byte) never installs a new worker and
    // the old caches live forever. GITHUB_SHA on CI; a build timestamp locally.
    NEXT_PUBLIC_SW_VERSION: (process.env.GITHUB_SHA ?? `local-${Date.now()}`).slice(0, 12),
  },
  async redirects() {
    return [
      // The radio/SRC section moved from /sternik/radio to top-level /radio
      // (2026-07-10). Keep old links working.
      { source: "/sternik/radio", destination: "/radio", permanent: true },
      { source: "/sternik/radio/:path*", destination: "/radio/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
