import { useI18n } from '../../src/i18n/context';
import { PlaceholderScreen } from '../../src/design-system/components';

export default function Onboard() {
  const { tp } = useI18n();
  return (
    <PlaceholderScreen
      title={tp('На борту', 'On board', 'Na pokladzie', {
        es: 'A bordo',
        fr: 'A bord',
        de: 'An Bord',
        it: 'A bordo',
      })}
      note={tp(
        'Сценарии после ADR-0003 (sync-content)',
        'Scenarios after ADR-0003 (sync-content)',
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
