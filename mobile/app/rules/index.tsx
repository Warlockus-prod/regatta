import { useI18n } from '../../src/i18n/context';
import { PlaceholderScreen } from '../../src/design-system/components';

export default function Rules() {
  const { tp } = useI18n();
  return (
    <PlaceholderScreen
      title={tp('Правила', 'Rules of the road', 'Zasady', {
        es: 'Reglas',
        fr: 'Regles',
        de: 'Regeln',
        it: 'Regole',
      })}
      note={tp(
        'Сценарии подключим после ADR-0003 (sync-content)',
        'Scenarios land after ADR-0003 (sync-content)',
        'Scenariusze po ADR-0003',
        {
          es: 'Escenarios tras ADR-0003',
          fr: 'Scenarios apres ADR-0003',
          de: 'Szenarien nach ADR-0003',
          it: 'Scenari dopo ADR-0003',
        },
      )}
    />
  );
}
