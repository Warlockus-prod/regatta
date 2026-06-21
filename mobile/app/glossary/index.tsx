import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import { Card, EmptyState, Screen, Text } from '../../src/design-system/components';
import { glossaryTerms, glossaryCategories } from '../../src/data';
import type { GlossaryCategoryId } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { colors, radii, spacing } from '../../src/design-system/tokens';

/**
 * Glossary index. 51 sailing terms, searchable in the user's current
 * language across both term and definition fields. Search is
 * case-insensitive plain-substring; v2 may add fuzzy matching and
 * category chips (boat / sail / course / maneuver / racing / wind / crew).
 */
const CATEGORY_ORDER: GlossaryCategoryId[] = ['boat', 'sail', 'course', 'maneuver', 'racing', 'wind', 'crew'];

/**
 * Per-category badge colors. Mirrors the web `categoryColors` map in
 * `src/app/glossary/page.tsx`. Cyan / green / amber / teal align with the
 * shared tokens; crew uses purple, which has no token yet, so it is kept as
 * a literal here to match the web source of truth.
 */
const CATEGORY_COLORS: Record<GlossaryCategoryId, { fg: string; bg: string; border: string }> = {
  boat: { fg: colors.accentCyan, bg: 'rgba(0, 212, 255, 0.12)', border: 'rgba(0, 212, 255, 0.25)' },
  sail: { fg: colors.accentCyan, bg: 'rgba(0, 212, 255, 0.12)', border: 'rgba(0, 212, 255, 0.25)' },
  course: { fg: colors.success, bg: 'rgba(68, 255, 136, 0.12)', border: 'rgba(68, 255, 136, 0.25)' },
  maneuver: { fg: colors.warning, bg: 'rgba(255, 170, 0, 0.12)', border: 'rgba(255, 170, 0, 0.25)' },
  racing: { fg: colors.warning, bg: 'rgba(255, 170, 0, 0.12)', border: 'rgba(255, 170, 0, 0.25)' },
  wind: { fg: colors.accentTeal, bg: 'rgba(0, 255, 204, 0.12)', border: 'rgba(0, 255, 204, 0.25)' },
  crew: { fg: '#8844ff', bg: 'rgba(136, 68, 255, 0.12)', border: 'rgba(136, 68, 255, 0.25)' },
};

export default function Glossary() {
  const { tp, lang } = useI18n();
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<GlossaryCategoryId | 'all'>('all');

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
    return glossaryTerms.filter((term) => {
      if (activeCat !== 'all' && term.category !== activeCat) return false;
      if (!q) return true;
      const t = legacyPick(term, 'term', lang).toLowerCase();
      const d = legacyPick(term, 'definition', lang).toLowerCase();
      return t.includes(q) || d.includes(q);
    });
  }, [query, lang, activeCat]);

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
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps="handled"
        >
          <CategoryChip
            label={tp('Все', 'All', 'Wszystkie', { es: 'Todas', fr: 'Toutes', de: 'Alle', it: 'Tutte' })}
            active={activeCat === 'all'}
            onPress={() => setActiveCat('all')}
          />
          {CATEGORY_ORDER.map((cat) => (
            <CategoryChip
              key={cat}
              label={legacyPick(glossaryCategories[cat], 'name', lang)}
              active={activeCat === cat}
              onPress={() => setActiveCat(cat)}
            />
          ))}
        </ScrollView>
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
            const catColors = CATEGORY_COLORS[term.category];
            const catName = legacyPick(glossaryCategories[term.category], 'name', lang);
            const showEn = lang !== 'en';
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
                  {/* Top row: localized term + EN anchor + category badge.
                      The EN term is the international anchor every sailor
                      recognises, kept as a small cyan subtitle on non-EN
                      langs. Mirrors web src/app/glossary/page.tsx. */}
                  <View style={styles.cardHead}>
                    <View style={styles.cardHeadText}>
                      <Text variant="subtitle">{t}</Text>
                      {showEn ? (
                        <Text style={styles.termEn}>{term.termEn}</Text>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: catColors.bg, borderColor: catColors.border },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: catColors.fg }]}>{catName}</Text>
                    </View>
                  </View>
                  <Text variant="caption" style={styles.def}>{d}</Text>
                  {showEn ? (
                    <Text variant="muted" style={styles.defEn}>{term.definitionEn}</Text>
                  ) : null}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

function CategoryChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
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
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardHeadText: {
    flex: 1,
    minWidth: 0,
  },
  termEn: {
    marginTop: 2,
    color: colors.accentCyan,
    fontSize: 13,
    fontWeight: '500',
  },
  badge: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 1,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  def: {
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  defEn: {
    marginTop: spacing.xs,
    lineHeight: 17,
  },
  chipRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderCyanSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  chipActive: {
    backgroundColor: colors.surfaceCyanSoft,
    borderColor: colors.accentCyan,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.accentCyan,
  },
});
