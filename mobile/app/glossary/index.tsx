import { useI18n } from '../../src/i18n/context';
import { PlaceholderScreen } from '../../src/design-system/components';

export default function Glossary() {
  const { tp } = useI18n();
  return (
    <PlaceholderScreen
      title={tp('Глоссарий', 'Glossary', 'Glosariusz', {
        es: 'Glosario',
        fr: 'Glossaire',
        de: 'Glossar',
        it: 'Glossario',
      })}
      note={tp(
        '51 термин, поиск, после ADR-0003',
        '51 terms, search, after ADR-0003',
        '51 terminow, wyszukiwanie, po ADR-0003',
        {
          es: '51 terminos, busqueda, tras ADR-0003',
          fr: '51 termes, recherche, apres ADR-0003',
          de: '51 Begriffe, Suche, nach ADR-0003',
          it: '51 termini, ricerca, dopo ADR-0003',
        },
      )}
    />
  );
}
