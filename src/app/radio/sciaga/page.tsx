import type { Metadata } from 'next';
import CheatSheet from './CheatSheet';

export const metadata: Metadata = {
  title: 'Ściąga SRC do druku + certyfikat treningu | Week to Regatta',
  description:
    'Jednostronicowa ściąga do egzaminu SRC: kanały VHF, MAYDAY / PAN-PAN / SECURITE, procedura DSC DISTRESS, alfabet fonetyczny, prowords i typowe błędy. Do druku, plus certyfikat ukończenia treningu na symulatorze.',
  keywords: ['SRC ściąga', 'VHF do druku', 'MAYDAY wzór', 'alfabet fonetyczny', 'DSC DISTRESS', 'egzamin UKE'],
};

export default function CheatSheetPage() {
  return <CheatSheet />;
}
