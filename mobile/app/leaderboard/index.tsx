import { useI18n } from '../../src/i18n/context';
import { PlaceholderScreen } from '../../src/design-system/components';

export default function Leaderboard() {
  const { tp } = useI18n();
  return (
    <PlaceholderScreen
      title={tp('Таблица лидеров', 'Leaderboard', 'Tabela liderow', {
        es: 'Clasificacion',
        fr: 'Classement',
        de: 'Bestenliste',
        it: 'Classifica',
      })}
      badge={tp('Phase 3', 'Phase 3', 'Phase 3', {
        es: 'Fase 3',
        fr: 'Phase 3',
        de: 'Phase 3',
        it: 'Fase 3',
      })}
      note={tp(
        'Глобальная таблица лидеров с ежедневной, недельной и общей выборкой - кто прошёл трассу быстрее всех.',
        'Global leaderboard with daily, weekly and all-time slices - who finished the course fastest.',
        'Globalna tabela z podzialem na dzienny, tygodniowy i caly sezon - kto przeszedl trase najszybciej.',
        {
          es: 'Clasificacion global con cortes diario, semanal y de todos los tiempos - quien hizo el recorrido mas rapido.',
          fr: 'Classement global avec coupes quotidienne, hebdomadaire et globale - qui a boucle le parcours le plus vite.',
          de: 'Globale Bestenliste mit Tag, Woche und Gesamt - wer den Kurs am schnellsten gefahren ist.',
          it: 'Classifica globale con tagli giornaliero, settimanale e totale - chi ha completato il percorso piu in fretta.',
        },
      )}
      highlights={[
        tp(
          'Личный рекорд по каждой трассе',
          'Personal best per course',
          'Rekord osobisty na kazdej trasie',
          {
            es: 'Mejor marca personal por recorrido',
            fr: 'Record personnel par parcours',
            de: 'Persoenliche Bestzeit pro Kurs',
            it: 'Record personale per ogni percorso',
          },
        ),
        tp(
          'Фильтр по стране и яхт-клубу',
          'Filter by country and yacht club',
          'Filtr wg kraju i klubu',
          {
            es: 'Filtro por pais y club nautico',
            fr: 'Filtre par pays et club nautique',
            de: 'Filter nach Land und Yachtclub',
            it: 'Filtro per paese e yacht club',
          },
        ),
        tp(
          'Кнопка повтора лучшего заезда',
          'Replay the best run',
          'Powtorka najlepszego przejazdu',
          {
            es: 'Repeticion de la mejor vuelta',
            fr: 'Rejouer la meilleure course',
            de: 'Beste Fahrt erneut abspielen',
            it: 'Replay della corsa migliore',
          },
        ),
      ]}
    />
  );
}
