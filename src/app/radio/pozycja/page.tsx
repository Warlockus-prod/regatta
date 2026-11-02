import type { Metadata } from 'next';
import { localizedRadioMetadata } from '../localization/server';
import PositionDrill from './PositionDrill';

const metadata: Metadata = {
  title: 'Dyktowanie pozycji przez radio VHF - trening SMCP | Week to Regatta',
  description:
    'Osiem pozycji do podyktowania na głos według SMCP: cyfra po cyfrze, DECIMAL zamiast POINT, zera wiodące i końcowe, półkula N/S i E/W. Mowa jest rozpoznawana i sprawdzana element po elemencie.',
  keywords: ['pozycja', 'współrzędne', 'SMCP', 'SRC', 'radio VHF', 'MAYDAY', 'DECIMAL'],
};

export async function generateMetadata(): Promise<Metadata> {
  return localizedRadioMetadata(metadata);
}

export default function PositionPage() {
  return <PositionDrill />;
}
