import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import RadioSubnav from './RadioSubnav';
import { SternikPrefsProvider, SternikLangScope, ExplLangHint } from '../sternik/prefs';

export const metadata: Metadata = {
  title: 'Radio VHF i świadectwo SRC - symulator ICOM | Week to Regatta',
  description:
    'Darmowe przygotowanie do egzaminu SRC w UKE: jak zdobyć świadectwo, kanały VHF, procedury MAYDAY / PAN-PAN / SECURITE i interaktywny symulator radia ICOM IC-M330GE z oceną transmisji głosowych.',
  keywords: [
    'SRC', 'świadectwo operatora', 'radio VHF', 'egzamin UKE', 'GMDSS', 'DSC',
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
          <ExplLangHint />
          {children}
        </div>
      </SternikPrefsProvider>
    </SternikLangScope>
  );
}
