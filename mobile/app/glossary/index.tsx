import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import { Card, EmptyState, Screen, Text } from '../../src/design-system/components';
import { glossaryTerms } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { colors, radii, spacing } from '../../src/design-system/tokens';

/**
 * Glossary index. 51 sailing terms, searchable in the user's current
 * language across both term and definition fields. Search is
 * case-insensitive plain-substring; v2 may add fuzzy matching and
 * category chips (boat / sail / course / maneuver / racing / wind / crew).
 */
export default function Glossary() {
  const { tp, lang } = useI18n();
  const [query, setQuery] = useState('');

  const headerTitle = tp('Глоссарий', 'Glossary', 'Glosariusz', {
    es: 'Glosario',
    fr: 'Glossaire',
    de: 'Glossar',
    it: 'Glossario',
  });

  const placeholder = tp('Поиск...', 'Search...', 'Szukaj...', {
    es: 'Buscar...',
    fr: 'Rechercher...',
    de: 'Suchen...',
    it: 'Cerca...',
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return glossaryTerms;
    return glossaryTerms.filter((term) => {
      const t = legacyPick(term, 'term', lang).toLowerCase();
      const d = legacyPick(term, 'definition', lang).toLowerCase();
      return t.includes(q) || d.includes(q);
    });
  }, [query, lang]);

  const counter = tp(
    `${filtered.length} из ${glossaryTerms.length}`,
    `${filtered.length} of ${glossaryTerms.length}`,
    `${filtered.length} z ${glossaryTerms.length}`,
    {
      es: `${filtered.length} de ${glossaryTerms.length}`,
      fr: `${filtered.length} sur ${glossaryTerms.length}`,
      de: `${filtered.length} von ${glossaryTerms.length}`,
      it: `${filtered.length} di ${glossaryTerms.length}`,
    },
  );

  const emptyTitle = tp(
    'Ничего не найдено',
    'Nothing found',
    'Nic nie znaleziono',
    {
      es: 'Sin resultados',
      fr: 'Aucun resultat',
      de: 'Nichts gefunden',
      it: 'Nessun risultato',
    },
  );

  const emptySubtitle = tp(
    `По запросу «${query.trim()}» нет терминов в глоссарии.`,
    `No glossary terms match "${query.trim()}".`,
    `Brak terminow dla "${query.trim()}".`,
    {
      es: `Ningun termino coincide con "${query.trim()}".`,
      fr: `Aucun terme ne correspond a "${query.trim()}".`,
      de: `Keine Treffer fuer "${query.trim()}".`,
      it: `Nessun termine corrisponde a "${query.trim()}".`,
    },
  );

  const clearLabel = tp('Очистить поиск', 'Clear search', 'Wyczysc wyszukiwanie', {
    es: 'Borrar busqueda',
    fr: 'Effacer la recherche',
    de: 'Suche loeschen',
    it: 'Cancella ricerca',
  });

  const searchA11y = tp(
    'Поиск по глоссарию',
    'Search glossary',
    'Szukaj w glosariuszu',
    {
      es: 'Buscar en el glosario',
      fr: 'Rechercher dans le glossaire',
      de: 'Glossar durchsuchen',
      it: 'Cerca nel glossario',
    },
  );

  const cardA11y = (term: string) =>
    tp(
      `Термин: ${term}`,
      `Term: ${term}`,
      `Termin: ${term}`,
      {
        es: `Termino: ${term}`,
        fr: `Terme : ${term}`,
        de: `Begriff: ${term}`,
        it: `Termine: ${term}`,
      },
    );

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel={searchA11y}
        />
        <Text variant="muted" style={styles.counter}>{counter}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            subtitle={query.trim().length > 0 ? emptySubtitle : undefined}
            icon="book"
            cta={
              query.trim().length > 0
                ? { label: clearLabel, onPress: () => setQuery('') }
                : undefined
            }
          />
        ) : (
          filtered.map((term) => {
            const t = legacyPick(term, 'term', lang);
            const d = legacyPick(term, 'definition', lang);
            return (
              <Card
                key={term.id}
                style={styles.card}
              >
                <View
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={cardA11y(t)}
                >
                  <Text variant="subtitle">{t}</Text>
                  <Text variant="caption" style={styles.def}>{d}</Text>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  search: {
    backgroundColor: colors.bgSecondary,
    borderColor: 'rgba(0, 212, 255, 0.15)',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.textPrimary,
    fontSize: 16,
  },
  counter: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  scroll: {
    paddingBottom: spacing.xxl,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  def: {
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
