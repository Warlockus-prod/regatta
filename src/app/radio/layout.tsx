import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import RadioSubnav from './RadioSubnav';
import { RadioPrefsProvider } from './prefs';
import { RadioLocaleProvider } from './localization/context';
import { localizedRadioMetadata, serverRadioResources } from './localization/server';
import { headers } from 'next/headers';
import { isLang } from '@/lib/languages';

const metadata: Metadata = {
  title: 'Radio VHF i świadectwo SRC - symulator ICOM | Week to Regatta',
  description:
    'Darmowe przygotowanie do egzaminu SRC w UKE: jak zdobyć świadectwo, kanały VHF, procedury MAYDAY / PAN-PAN / SECURITE i interaktywny symulator radia ICOM IC-M330GE z oceną transmisji głosowych.',
  keywords: [
    'SRC', 'świadectwo operatora', 'radio VHF', 'egzamin UKE', 'GMDSS', 'DSC',
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
  // Radio follows the selected language independently of the Polish-only
  // sternik course. The first render already has its local message catalog.
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
