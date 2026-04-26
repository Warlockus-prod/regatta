import { useI18n } from '../../src/i18n/context';
import { PlaceholderScreen } from '../../src/design-system/components';

export default function Anatomy() {
  const { tp } = useI18n();
  return (
    <PlaceholderScreen
      title={tp('Анатомия яхты', 'Yacht anatomy', 'Anatomia jachtu', {
        es: 'Anatomia del yate',
        fr: 'Anatomie du yacht',
        de: 'Yacht-Anatomie',
        it: 'Anatomia dello yacht',
      })}
      note={tp(
        'Интерактивная схема после ADR-0003',
        'Interactive diagram after ADR-0003',
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
