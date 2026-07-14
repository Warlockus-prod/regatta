import type { Metadata } from 'next';
import PositionDrill from './PositionDrill';

export const metadata: Metadata = {
  title: 'Dyktowanie pozycji przez radio VHF - trening SMCP | Week to Regatta',
  description:
    'Osiem pozycji do podyktowania na glos wedlug SMCP: cyfra po cyfrze, DECIMAL zamiast POINT, zera wiodace i koncowe, polkula N/S i E/W. Mowa jest rozpoznawana i sprawdzana element po elemencie.',
  keywords: ['pozycja', 'wspolrzedne', 'SMCP', 'SRC', 'radio VHF', 'MAYDAY', 'DECIMAL', 'egzamin UKE'],
};

export default function PositionPage() {
  return <PositionDrill />;
}
