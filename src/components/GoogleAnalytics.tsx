import Script from 'next/script';

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
 * Uses Next's next/script with strategy="afterInteractive" so analytics
 * doesn't block first paint. gtag.js is ~60 KB and loads asynchronously.
 *
 * Privacy: we don't currently ask for consent. If we add GDPR-style
 * consent later, gate both <Script> tags behind a consent flag.
 */
const GA_ID = 'G-ZEWWJ4N31M';

export default function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            anonymize_ip: true,
            send_page_view: true,
          });
        `}
      </Script>
    </>
  );
}
