import type { Metadata } from 'next';
import { localizedRadioMetadata } from '../localization/server';
import LiveDialogue from './LiveDialogue';

const metadata: Metadata = {
  title: 'Rozmowa na żywo przez radio VHF - trening głosowy SRC | Week to Regatta',
  description:
    'Mów do mikrofonu, a stacja odpowiada głosem. Sześć prawdziwych rozmów przez radio VHF: próba łączności, miejsce w marinie, statek-statek, meldunek do VTS, PAN-PAN o poradę medyczną i MAYDAY z pytaniami stacji brzegowej. Mowa jest rozpoznawana i oceniana.',
  keywords: ['rozmowa VHF', 'trening głosowy', 'SRC', 'SMCP', 'MAYDAY', 'PAN-PAN', 'VTS', 'marina'],
};

export async function generateMetadata(): Promise<Metadata> {
  return localizedRadioMetadata(metadata);
}

export default function DialoguePage() {
  return <LiveDialogue />;
}
