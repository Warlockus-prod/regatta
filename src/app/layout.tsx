import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";
import "./globals.css";
import Navigation from "@/components/Navigation";
import ClientErrorReporter from "@/components/ClientErrorReporter";
import OnboardingTour from "@/components/OnboardingTour";
import HelpOverlay from "@/components/HelpOverlay";
import FeedbackWidget from "@/components/FeedbackWidget";
import BootcampFooterNav from "@/components/BootcampFooterNav";
import SiteFooter from "@/components/SiteFooter";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { I18nProvider } from "@/lib/i18n";
import {
  ENABLED_LANGUAGES,
  isLang,
  pickLangFromAccept,
  type Lang,
} from "@/lib/languages";

// Tells Next not to statically cache the root layout - we read request cookies
// to pick the user's language so every render is request-specific.
export const dynamic = 'force-dynamic';

async function resolveServerLang(): Promise<Lang> {
  const c = await cookies();
  const fromCookie = c.get('regatta_lang')?.value;
  if (isLang(fromCookie)) {
    return fromCookie;
  }
  // Fallback: sniff accept-language on the very first request before
  // middleware has written the cookie into the response stream.
  const h = await headers();
  return pickLangFromAccept(h.get('accept-language'));
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata is now request-specific (depends on the `regatta_lang` cookie),
// so we use generateMetadata instead of a static `metadata` export. Shares
// the same language-resolver used by the root HTML shell below.
export async function generateMetadata(): Promise<Metadata> {
  const lang = await resolveServerLang();
  const ogByLang: Record<Lang, { title: string; description: string; locale: string; twitter: string }> = {
    ru: {
      title: 'Week to Regatta - тренажёр парусного спорта',
      description: 'Интерактивный тренажёр для тех, кому скоро на регату. Ветер, курсы, паруса, тактика за 45 минут. AI-тренер разбирает твою гонку.',
      locale: 'ru_RU',
      twitter: 'До регаты неделя? Успеешь разобраться. AI-тренер + гонка с соперниками в браузере.',
    },
    en: {
      title: 'Week to Regatta - Sailing Simulator',
      description: 'Interactive sailing trainer for people with a race next weekend. Wind, points of sail, sail trim, tactics in 45 minutes. AI coach reviews your race.',
      locale: 'en_US',
      twitter: 'Racing next week? You can still prep. AI coach + head-to-head race in your browser.',
    },
    pl: {
      title: 'Week to Regatta - symulator zeglarstwa',
      description: 'Interaktywny trener dla tych, co w weekend maja regaty. Wiatr, kursy, zagle, taktyka w 45 minut. Trener AI analizuje twoj wyscig.',
      locale: 'pl_PL',
      twitter: 'Regaty za tydzien? Zdazysz sie przygotowac. Trener AI + wyscig z rywalami w przegladarce.',
    },
    es: {
      title: 'Week to Regatta - simulador de vela',
      description: 'Entrenador interactivo para quienes tienen una regata este fin de semana. Viento, rumbos, velas, tactica en 45 minutos. Entrenador IA analiza tu regata.',
      locale: 'es_ES',
      twitter: 'Regata la proxima semana? Aun tienes tiempo de prepararte. Entrenador IA + regata con rivales en el navegador.',
    },
    fr: {
      title: 'Week to Regatta - simulateur de voile',
      description: 'Entraineur interactif pour ceux qui ont une regate ce week-end. Vent, allures, voiles, tactique en 45 minutes. Le coach IA analyse votre course.',
      locale: 'fr_FR',
      twitter: 'Regate la semaine prochaine ? Tu peux encore te preparer. Coach IA + course avec des rivaux dans le navigateur.',
    },
    de: {
      title: 'Week to Regatta - Segelsimulator',
      description: 'Interaktiver Trainer fuer alle, die am Wochenende eine Regatta haben. Wind, Kurse, Segel, Taktik in 45 Minuten. KI-Coach analysiert dein Rennen.',
      locale: 'de_DE',
      twitter: 'Regatta naechste Woche? Du kannst dich noch vorbereiten. KI-Coach + Rennen gegen Rivalen im Browser.',
    },
    it: {
      title: 'Week to Regatta - simulatore di vela',
      description: 'Allenatore interattivo per chi ha una regata nel fine settimana. Vento, corsi, vele, tattica in 45 minuti. Il coach IA analizza la tua regata.',
      locale: 'it_IT',
      twitter: 'Regata la prossima settimana? Hai ancora tempo per prepararti. Coach IA + regata con rivali nel browser.',
    },
  };
  const pick = ogByLang[lang];
  const languageAlternates = Object.fromEntries(
    ENABLED_LANGUAGES.map((language) => [language.id, `/?lang=${language.id}`]),
  );
  return {
    title: pick.title,
    description: pick.description,
    metadataBase: new URL('https://weektoregatta.com'),
    manifest: '/manifest.json',
    alternates: {
      canonical: '/',
      languages: languageAlternates,
    },
    appleWebApp: {
      capable: true,
      title: 'Week to Regatta',
      statusBarStyle: 'black-translucent',
    },
    openGraph: {
      title: pick.title,
      description: pick.description,
      url: 'https://weektoregatta.com',
      siteName: 'Week to Regatta',
      locale: pick.locale,
      alternateLocale: ENABLED_LANGUAGES
        .map((language) => language.metadataLocale)
        .filter((locale) => locale !== pick.locale),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: pick.title,
      description: pick.twitter,
    },
    // Search-engine verification tokens. Set GOOGLE_SITE_VERIFICATION /
    // YANDEX_VERIFICATION env vars on the VPS once the property is added in
    // the respective Search Console; falls back to undefined (no meta tag
    // emitted) when not configured.
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      yandex: process.env.YANDEX_VERIFICATION,
    },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a1628",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const serverLang = await resolveServerLang();
  return (
    <html
      lang={serverLang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ background: '#0a1628' }}
    >
      <body className="min-h-full flex flex-col ocean-bg" style={{ background: '#0a1628' }}>
        {/*
          Structured data (JSON-LD) for search engines. Two graphs at once:

          1. WebSite - lets Google show a sitelinks search box and a
             knowledge-panel-style site card.
          2. EducationalOrganization - tells search engines this is a
             learning resource (sailing education); Google may pick it for
             "course"-style rich results when paired with the per-page
             Course schema we'll add later.

          Both reference the same canonical URL so they merge into one
          entity on the search engine side. Multilingual `inLanguage` is
          left as an array (matches the 7 enabled langs).
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'WebSite',
                  '@id': 'https://weektoregatta.com/#website',
                  url: 'https://weektoregatta.com',
                  name: 'Week to Regatta',
                  alternateName: 'Regatta',
                  description:
                    'Interactive sailing trainer for hobbyists with a regatta next weekend. Wind, points of sail, tactics, AI race coach. RU / EN / PL / ES / FR / DE / IT.',
                  inLanguage: ENABLED_LANGUAGES.map((l) => l.htmlLang),
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: {
                      '@type': 'EntryPoint',
                      urlTemplate: 'https://weektoregatta.com/glossary?q={search_term_string}',
                    },
                    'query-input': 'required name=search_term_string',
                  },
                },
                {
                  '@type': 'EducationalOrganization',
                  '@id': 'https://weektoregatta.com/#org',
                  url: 'https://weektoregatta.com',
                  name: 'Week to Regatta',
                  alternateName: 'Regatta - Sailing Tutor',
                  logo: 'https://weektoregatta.com/icon-512.svg',
                  sameAs: [],
                  knowsAbout: [
                    'Sailing',
                    'Sailboat racing',
                    'Points of sail',
                    'Sail trim',
                    'Racing Rules of Sailing',
                    'COLREGS',
                  ],
                },
              ],
            }),
          }}
        />
        <I18nProvider initialLang={serverLang}>
          <ClientErrorReporter />
          <OnboardingTour />
          <HelpOverlay />
          <Navigation />
          {/*
            padding-bottom matches the BootcampFooterNav's measured height
            (it publishes --bootcamp-footer-h on <body> via a ResizeObserver
            and clears the var when not visible). Without this, on mobile
            where the sticky bar is tall, the last items of a page's content
            stay trapped behind the bar with no way to scroll into view.
          */}
          <main className="flex-1" style={{ paddingBottom: 'var(--bootcamp-footer-h, 0px)' }}>
            {children}
          </main>
          {/* Brand footer: small "Week to Regatta - sailing tutor" line at
              the bottom of every page (hidden on game / multiplayer /
              simulator-v3 immersive surfaces). Owns the project's
              long-form brand identity, while the top nav keeps the
              short "Regatta" wordmark for compactness. */}
          <SiteFooter />
          {/* Feedback + AI chat widget - on most routes, but hidden on
              fullscreen immersive surfaces (game HUD, V3 canvas) where the
              floating bubble would compete with touch controls. Per audit
              2026-04-20: root layout previously mounted this without any
              hideOn prop so the bubble could overlap critical controls. */}
          <FeedbackWidget hideOn={['/game', '/multiplayer', '/simulator-v3']} />
          {/* BootcampFooterNav: sticky bottom bar that auto-shows on
              lesson-destination pages when the user is mid-bootcamp.
              Client-only, reads localStorage; silent on all other routes. */}
          <BootcampFooterNav />
        </I18nProvider>
        {/* Google Analytics 4 - loads async after interactive, doesn't block paint. */}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
