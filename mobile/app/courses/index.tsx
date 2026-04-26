import { useI18n } from '../../src/i18n/context';
import { PlaceholderScreen } from '../../src/design-system/components';

export default function Courses() {
  const { tp } = useI18n();
  return (
    <PlaceholderScreen
      title={tp('Курсы относительно ветра', 'Points of sail', 'Kursy wzgledem wiatru', {
        es: 'Rumbos',
        fr: 'Allures',
        de: 'Kurse zum Wind',
        it: 'Andature',
      })}
      note={tp(
        'Диаграмма после ADR-0003',
        'Diagram after ADR-0003',
        'Diagram po ADR-0003',
        {
          es: 'Diagrama tras ADR-0003',
          fr: 'Diagramme apres ADR-0003',
          de: 'Diagramm nach ADR-0003',
          it: 'Diagramma dopo ADR-0003',
        },
      )}
    />
  );
}
