import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import ClientErrorReporter from "@/components/ClientErrorReporter";
import OnboardingTour from "@/components/OnboardingTour";
import HelpOverlay from "@/components/HelpOverlay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Regatta — Sailing Simulator",
  description: "Interactive sailing education simulator. Learn points of sail, sail trim, racing strategy and sailing terminology in Russian and English.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Regatta",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.svg", type: "image/svg+xml", sizes: "192x192" },
    ],
    apple: [
      { url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "Regatta — Sailing Simulator",
    description: "Симулятор парусной яхты: курсы, паруса, гоночные стратегии, игра с AI-соперниками.",
    url: "https://regatta.icoffio.com",
    siteName: "Regatta",
    locale: "ru_RU",
    type: "website",
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
    >
      <body className="min-h-full flex flex-col ocean-bg">
        <ClientErrorReporter />
        <OnboardingTour />
        <HelpOverlay />
        <Navigation />
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
