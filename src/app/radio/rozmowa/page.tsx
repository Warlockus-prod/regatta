import type { Metadata } from 'next';
import LiveDialogue from './LiveDialogue';

export const metadata: Metadata = {
  title: 'Rozmowa na zywo przez radio VHF - trening glosowy SRC | Week to Regatta',
  description:
    'Mow do mikrofonu, a stacja odpowiada glosem. Szesc prawdziwych rozmow przez radio VHF: proba lacznosci, miejsce w marinie, statek-statek, meldunek do VTS, PAN-PAN o porade medyczna i MAYDAY z pytaniami stacji brzegowej. Mowa jest rozpoznawana i oceniana.',
  keywords: ['rozmowa VHF', 'trening glosowy', 'SRC', 'SMCP', 'MAYDAY', 'PAN-PAN', 'VTS', 'marina', 'egzamin UKE'],
};

export default function DialoguePage() {
  return <LiveDialogue />;
}
