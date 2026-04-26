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
      note={tp(
        'Online-таблица в Phase 3',
        'Online leaderboard in Phase 3',
        'Tabela online w Phase 3',
        {
          es: 'Clasificacion online en Phase 3',
          fr: 'Classement en ligne en Phase 3',
          de: 'Online-Bestenliste in Phase 3',
          it: 'Classifica online in Phase 3',
        },
      )}
    />
  );
}
