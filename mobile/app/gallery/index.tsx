import { useI18n } from '../../src/i18n/context';
import { PlaceholderScreen } from '../../src/design-system/components';

export default function Gallery() {
  const { tp } = useI18n();
  return (
    <PlaceholderScreen
      title={tp('Галерея', 'Gallery', 'Galeria', {
        es: 'Galeria',
        fr: 'Galerie',
        de: 'Galerie',
        it: 'Galleria',
      })}
      note={tp(
        'Медиа-ссылки после ADR-0003',
        'Media references after ADR-0003',
        'Linki po ADR-0003',
        {
          es: 'Enlaces tras ADR-0003',
          fr: 'Liens apres ADR-0003',
          de: 'Links nach ADR-0003',
          it: 'Link dopo ADR-0003',
        },
      )}
    />
  );
}
