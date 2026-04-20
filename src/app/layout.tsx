import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import ClientErrorReporter from "@/components/ClientErrorReporter";
import OnboardingTour from "@/components/OnboardingTour";
import HelpOverlay from "@/components/HelpOverlay";
import FeedbackWidget from "@/components/FeedbackWidget";
import { I18nProvider } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Regatta - Sailing Simulator",
  description: "Interactive sailing education simulator. Learn points of sail, sail trim, racing strategy and sailing terminology in Russian and English.",
  // metadataBase silences Next 16 warning on OG image generation and
  // makes relative OG URLs resolve against the production origin.
  metadataBase: new URL("https://regatta.icoffio.com"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Regatta",
    statusBarStyle: "black-translucent",
  },
  // Icons are generated dynamically via src/app/icon.tsx + apple-icon.tsx
  openGraph: {
    title: "Regatta - Sailing Simulator",
    description: "Интерактивный тренажёр для тех, кому скоро на регату. Ветер, курсы, паруса, тактика за 45 минут. AI-тренер разбирает твою гонку.",
    url: "https://regatta.icoffio.com",
    siteName: "Regatta",
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Regatta - Sailing Simulator",
    description: "До регаты неделя? Успеешь разобраться. AI-тренер + гонка с соперниками в браузере.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a1628",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ background: '#0a1628' }}
    >
      <body className="min-h-full flex flex-col ocean-bg" style={{ background: '#0a1628' }}>
        <I18nProvider>
          <ClientErrorReporter />
          <OnboardingTour />
          <HelpOverlay />
          <Navigation />
          <main className="flex-1">
            {children}
          </main>
          {/* Feedback + AI chat widget - now on every route (user request
              2026-04-20). The floating bubble is small and uses the viewport
              corner - simulators can coexist with it. If it ever gets in the
              way on a specific route, hide per-route via `hideOn`. */}
          <FeedbackWidget />
        </I18nProvider>
      </body>
    </html>
  );
}
