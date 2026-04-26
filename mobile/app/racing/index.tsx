import { useI18n } from '../../src/i18n/context';
import { PlaceholderScreen } from '../../src/design-system/components';

export default function Racing() {
  const { tp } = useI18n();
  return (
    <PlaceholderScreen
      title={tp('Тактика гонок', 'Racing tactics', 'Taktyka wyscigow', {
        es: 'Tactica de regata',
        fr: 'Tactique de regate',
        de: 'Regatta-Taktik',
        it: 'Tattica di regata',
      })}
      note={tp(
        'Тактические схемы после ADR-0003',
        'Tactical diagrams after ADR-0003',
        'Schematy po ADR-0003',
        {
          es: 'Esquemas tras ADR-0003',
          fr: 'Schemas apres ADR-0003',
          de: 'Schemata nach ADR-0003',
          it: 'Schemi dopo ADR-0003',
        },
      )}
    />
  );
}
