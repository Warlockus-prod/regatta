import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import SternikChat from './SternikChat';
import SternikSubnav from './SternikSubnav';
import { SternikPrefsProvider, SternikLangScope, ExplLangHint } from './prefs';

export const metadata: Metadata = {
  title: 'Sternik motorowodny - przygotowanie do egzaminu | Week to Regatta',
  description:
    'Darmowe przygotowanie do egzaminu na patent sternika motorowodnego: konspekt teorii ze schematami, trening pytan z natychmiastowa odpowiedzia i probny egzamin 75 pytan / 90 minut. Komentarze po rosyjsku.',
  keywords: [
    'sternik motorowodny', 'egzamin', 'patent motorowodny', 'test', 'pytania egzaminacyjne',
    'znaki kardynalne', 'prawo drogi', 'PZMWiNW',
  ],
};

export default function SternikLayout({ children }: { children: ReactNode }) {
  return (
    <SternikLangScope>
      <SternikPrefsProvider>
        <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-6">
          <SternikSubnav />
          <ExplLangHint />
          {children}
          <SternikChat />
        </div>
      </SternikPrefsProvider>
    </SternikLangScope>
  );
}
