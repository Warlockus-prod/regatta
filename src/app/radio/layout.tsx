import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import RadioSubnav from './RadioSubnav';
import { RadioPrefsProvider } from './prefs';
import { RadioLocaleProvider } from './localization/context';
import { localizedRadioMetadata, serverRadioResources } from './localization/server';
import { headers } from 'next/headers';
import { isLang } from '@/lib/languages';

// Owner, 2026-11-01: the radio course names no country, here or in any title.
// All seven values sit in one literal so the radio catalog builder pairs them.
const DESCRIPTION = {
  pl: 'Darmowe przygotowanie do egzaminu SRC: jak zdobyć świadectwo, kanały VHF, procedury MAYDAY / PAN-PAN / SECURITE i interaktywny symulator radia ICOM IC-M330GE z oceną transmisji głosowych.',
  ru: 'Бесплатная подготовка к экзамену SRC: как получить свидетельство, каналы VHF, процедуры MAYDAY / PAN-PAN / SECURITE и интерактивный симулятор радиостанции ICOM IC-M330GE с оценкой голосовых передач.',
  en: 'Free preparation for the SRC exam: how to obtain the certificate, VHF channels, MAYDAY / PAN-PAN / SECURITE procedures and an interactive ICOM IC-M330GE radio simulator with voice transmission assessment.',
  es: 'Preparación gratuita para el examen SRC: cómo obtener el certificado, canales VHF, procedimientos MAYDAY / PAN-PAN / SECURITE y un simulador interactivo de la radio ICOM IC-M330GE con evaluación de las transmisiones de voz.',
  fr: "Préparation gratuite à l'examen SRC : comment obtenir le certificat, canaux VHF, procédures MAYDAY / PAN-PAN / SECURITE et simulateur interactif de radio ICOM IC-M330GE avec évaluation des transmissions vocales.",
  de: 'Kostenlose Vorbereitung auf die SRC-Prüfung: der Weg zum Zeugnis, VHF-Kanäle, MAYDAY- / PAN-PAN- / SECURITE-Verfahren und ein interaktiver Simulator des Funkgeräts ICOM IC-M330GE mit Bewertung von Sprechfunkaussendungen.',
  it: "Preparazione gratuita all'esame SRC: come ottenere il certificato, canali VHF, procedure MAYDAY / PAN-PAN / SECURITE e simulatore interattivo della radio ICOM IC-M330GE con valutazione delle trasmissioni vocali.",
};

const metadata: Metadata = {
  title: 'Radio VHF i świadectwo SRC - symulator ICOM | Week to Regatta',
  description: DESCRIPTION.pl,
  keywords: [
    'SRC', 'świadectwo operatora', 'radio VHF', 'GMDSS', 'DSC',
    'MAYDAY', 'symulator radia', 'ICOM IC-M330', 'ICOM IC-M323',
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  return localizedRadioMetadata(metadata);
}

export default async function RadioLayout({ children }: { children: ReactNode }) {
  const requestLang = (await headers()).get('x-regatta-lang');
  const lang = isLang(requestLang) ? requestLang : 'ru';
  const {catalog,aliases} = await serverRadioResources(lang);
  // Radio follows the selected language independently of the sternik course,
  // which stays in Polish. The first render already has its local message catalog.
  return (
    <RadioLocaleProvider initialLang={lang} initialCatalog={catalog} initialAliases={aliases}>
      <RadioPrefsProvider>
        <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-6">
          <RadioSubnav />
          {children}
        </div>
      </RadioPrefsProvider>
    </RadioLocaleProvider>
  );
}
