import { useI18n } from '../../src/i18n/context';
import { PlaceholderScreen } from '../../src/design-system/components';

export default function Quick() {
  const { tp } = useI18n();
  return (
    <PlaceholderScreen
      title={tp('Быстрый разогрев', 'Quick refresh', 'Szybkie powtorzenie', {
        es: 'Repaso rapido',
        fr: 'Revision rapide',
        de: 'Schnelle Auffrischung',
        it: 'Ripasso rapido',
      })}
      note={tp(
        'Уроки подключим после ADR-0003 (sync-content)',
        'Lessons land after ADR-0003 (sync-content)',
        'Lekcje po ADR-0003',
        {
          es: 'Lecciones tras ADR-0003',
          fr: 'Lecons apres ADR-0003',
          de: 'Lektionen nach ADR-0003',
          it: 'Lezioni dopo ADR-0003',
        },
      )}
    />
  );
}
