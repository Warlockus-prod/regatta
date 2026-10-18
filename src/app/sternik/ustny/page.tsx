import type { Metadata } from 'next';
import OralTrainer from './OralTrainer';

export const metadata: Metadata = {
  title: 'Odpowiedź ustna - patent sternika motorowodnego | Week to Regatta',
  description:
    'Dwanaście pytań egzaminacyjnych, na które odpowiadasz na głos: prawo drogi, znaki, człowiek za burtą, przepisy, manewrowanie i locja. Mowa jest rozpoznawana i sprawdzana element po elemencie, a wzorcowa odpowiedź pokazuje się dopiero po próbie.',
  keywords: ['sternik motorowodny', 'egzamin ustny', 'patent', 'PZMWiNW', 'prawo drogi', 'MPZZM', 'IALA'],
};

export default function OralPage() {
  return <OralTrainer />;
}
