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
  // Kept out of the server bundle and loaded from node_modules at runtime:
  // better-sqlite3 is a native addon, and fast-geoip reads its data files
  // relative to its own directory. Bundled by Turbopack, fast-geoip pointed at
  // a fake /ROOT/node_modules path, every lookup failed silently and no event
  // got a country. scripts/check-bundle-size.mjs fails the build if that path
  // shows up in a server chunk again.
  serverExternalPackages: ["better-sqlite3", "fast-geoip"],
  // Don't advertise the framework in X-Powered-By. The other security headers
  // (CSP with frame-ancestors, HSTS, nosniff, referrer-policy,
  // permissions-policy) are set by the production nginx layer - verified live -
  // so we do not duplicate them here (duplicate X-Frame-Options / CSP can
  // weaken or conflict).
  poweredByHeader: false,
  env: {
    // The service worker's cache version. It has to change every deploy, or the
    // browser (which compares sw.js byte-for-byte) never installs a new worker and
    // the old caches live forever. The commit when GITHUB_SHA reaches the build,
    // otherwise the full build timestamp. Only the SHA is shortened: slicing the
    // fallback kept 6 digits of Date.now(), so builds about 2.8 hours apart
    // shipped the same version. `||` also covers an empty GITHUB_SHA build-arg.
    NEXT_PUBLIC_SW_VERSION: process.env.GITHUB_SHA?.slice(0, 12) || `local-${Date.now()}`,
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
