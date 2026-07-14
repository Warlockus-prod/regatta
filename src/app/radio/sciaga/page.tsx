import type { Metadata } from 'next';
import CheatSheet from './CheatSheet';

export const metadata: Metadata = {
  title: 'Sciaga SRC do druku + certyfikat treningu | Week to Regatta',
  description:
    'Jednostronicowa sciaga do egzaminu SRC: kanaly VHF, MAYDAY / PAN-PAN / SECURITE, procedura DSC DISTRESS, alfabet fonetyczny, prowords i typowe bledy. Do druku, plus certyfikat ukonczenia treningu na symulatorze.',
  keywords: ['SRC sciaga', 'VHF do druku', 'MAYDAY wzor', 'alfabet fonetyczny', 'DSC DISTRESS', 'egzamin UKE'],
};

export default function CheatSheetPage() {
  return <CheatSheet />;
}
