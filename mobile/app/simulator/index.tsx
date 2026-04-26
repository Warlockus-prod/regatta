import { useI18n } from '../../src/i18n/context';
import { PlaceholderScreen } from '../../src/design-system/components';

export default function Simulator() {
  const { tp } = useI18n();
  return (
    <PlaceholderScreen
      title={tp('Симулятор', 'Simulator', 'Symulator', {
        es: 'Simulador',
        fr: 'Simulateur',
        de: 'Simulator',
        it: 'Simulatore',
      })}
      note={tp(
        'Skia-симулятор приходит в Phase 2',
        'Skia simulator lands in Phase 2',
        'Symulator Skia w Phase 2',
        {
          es: 'Simulador Skia en Phase 2',
          fr: 'Simulateur Skia en Phase 2',
          de: 'Skia-Simulator in Phase 2',
          it: 'Simulatore Skia in Phase 2',
        },
      )}
    />
  );
}
