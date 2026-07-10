import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import RadioSubnav from './RadioSubnav';
import { SternikPrefsProvider, SternikLangScope } from '../sternik/prefs';

export const metadata: Metadata = {
  title: 'Radio VHF i swiadectwo SRC - symulator ICOM | Week to Regatta',
  description:
    'Darmowe przygotowanie do egzaminu SRC w UKE: jak zdobyc swiadectwo, kanaly VHF, procedury MAYDAY / PAN-PAN / SECURITE i interaktywny symulator radia ICOM IC-M330GE z ocena transmisji glosowych.',
  keywords: [
    'SRC', 'swiadectwo operatora', 'radio VHF', 'egzamin UKE', 'GMDSS', 'DSC',
    'MAYDAY', 'symulator radia', 'ICOM IC-M330', 'ICOM IC-M323',
  ],
};

export default function RadioLayout({ children }: { children: ReactNode }) {
  // The radio section shares the sternik explanation-language preferences
  // (PL/RU/both on the RU site version; PL-only elsewhere).
  return (
    <SternikLangScope>
      <SternikPrefsProvider>
        <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-6">
          <RadioSubnav />
          {children}
        </div>
      </SternikPrefsProvider>
    </SternikLangScope>
  );
}
