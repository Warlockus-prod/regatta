import type { Metadata } from 'next';
import OralTrainer from './OralTrainer';

export const metadata: Metadata = {
  title: 'Odpowiedz ustna - patent sternika motorowodnego | Week to Regatta',
  description:
    'Dwanascie pytan egzaminacyjnych, na ktore odpowiadasz na glos: prawo drogi, znaki, czlowiek za burta, przepisy, manewrowanie i locja. Mowa jest rozpoznawana i sprawdzana element po elemencie, a wzorcowa odpowiedz pokazuje sie dopiero po probie.',
  keywords: ['sternik motorowodny', 'egzamin ustny', 'patent', 'PZMWiNW', 'prawo drogi', 'MPZZM', 'IALA'],
};

export default function OralPage() {
  return <OralTrainer />;
}
