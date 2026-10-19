import Script from 'next/script';
import {
  EMBED_STORAGE_KEY,
  NO_ANALYTICS_GLOBAL,
  NO_ANALYTICS_STORAGE_KEY,
} from '@/lib/analytics-events';

/**
 * Google Analytics 4 (gtag.js).
 *
 * Tracking ID pinned in code; if we ever need to switch or disable, change
 * here. Events are fire-and-forget via gtag, no dependency on our internal
 * /api/log pipeline.
 *
 * CSP note: googletagmanager.com is added to script-src and
 * google-analytics.com to connect-src in regatta.nginx.conf.
 *
 * Loaded after hydration (strategy="afterInteractive") so analytics doesn't
 * block first paint. gtag.js is ~60 KB and loads asynchronously.
 *
 * Never inside the iOS app (2026-10-19): one inline script decides in the
 * browser and injects gtag.js only when the page is not an app embed (no
 * ?embed=1, no window.ReactNativeWebView, no remembered embed flag) and the
 * app has not switched analytics off. The decision is made at run time, not
 * while rendering, so server and client HTML stay identical (no hydration
 * mismatch). The app's "Anonymous analytics" switch and the App Store privacy
 * answers cover the app, so GA must not run there.
 *
 * Privacy: we don't currently ask for consent. If we add GDPR-style
 * consent later, gate the loader below behind a consent flag.
 */
const GA_ID = 'G-ZEWWJ4N31M';

const LOADER = `
(function () {
  try {
    var w = window;
    if (w.ReactNativeWebView || w[${JSON.stringify(NO_ANALYTICS_GLOBAL)}] === true) return;
    var embed = /[?&]embed=1(?:&|$)/.test(w.location.search);
    try {
      var ss = w.sessionStorage;
      if (embed) ss.setItem(${JSON.stringify(EMBED_STORAGE_KEY)}, '1');
      if (ss.getItem(${JSON.stringify(EMBED_STORAGE_KEY)}) === '1') return;
      if (ss.getItem(${JSON.stringify(NO_ANALYTICS_STORAGE_KEY)}) === '1') return;
    } catch (e) {}
    if (embed) return;
    w.dataLayer = w.dataLayer || [];
    w.gtag = function () { w.dataLayer.push(arguments); };
    w.gtag('js', new Date());
    w.gtag('config', ${JSON.stringify(GA_ID)}, { anonymize_ip: true, send_page_view: true });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ${JSON.stringify(GA_ID)};
    document.head.appendChild(s);
  } catch (e) {}
})();
`;

export default function GoogleAnalytics() {
  return (
    <Script id="gtag-loader" strategy="afterInteractive">
      {LOADER}
    </Script>
  );
}
