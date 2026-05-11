import { Stack } from 'expo-router';
import Constants from 'expo-constants';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../src/i18n/context';
import { ENABLED_LANGUAGES } from '../src/i18n/languages';
import { Card, Screen, Text } from '../src/design-system/components';
import { colors, spacing } from '../src/design-system/tokens';

/**
 * Settings screen. v1 has only the language picker; about + version
 * info added in Phase 1 polish, telemetry opt-in in Phase 5.
 */
export default function Settings() {
  const { tp, lang, setLang } = useI18n();
  const version = Constants.expoConfig?.version ?? 'dev';
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode ??
    '?';

  const title = tp('Настройки', 'Settings', 'Ustawienia', {
    es: 'Ajustes',
    fr: 'Reglages',
    de: 'Einstellungen',
    it: 'Impostazioni',
  });

  const langSectionLabel = tp('Язык', 'Language', 'Jezyk', {
    es: 'Idioma',
    fr: 'Langue',
    de: 'Sprache',
    it: 'Lingua',
  });

  const aboutSectionLabel = tp('О приложении', 'About', 'O aplikacji', {
    es: 'Acerca de',
    fr: 'A propos',
    de: 'Uber die App',
    it: 'Informazioni',
  });

  const versionLabel = tp('Версия', 'Version', 'Wersja', {
    es: 'Version',
    fr: 'Version',
    de: 'Version',
    it: 'Versione',
  });

  const phaseLabel = tp(
    'Phase 1 - Content shell',
    'Phase 1 - Content shell',
    'Phase 1 - Content shell',
  );

  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="muted" style={styles.sectionLabel}>
          {langSectionLabel.toUpperCase()}
        </Text>
        <View style={styles.langList}>
          {ENABLED_LANGUAGES.map((langMeta) => {
            const isSelected = langMeta.id === lang;
            return (
              <Card
                key={langMeta.id}
                onPress={() => setLang(langMeta.id)}
                style={[styles.langCard, isSelected && styles.langCardSelected]}
              >
                <View style={styles.langRow}>
                  <View style={styles.langText}>
                    <Text variant="subtitle">{langMeta.nativeName}</Text>
                    <Text variant="caption">{langMeta.name}</Text>
                  </View>
                  {isSelected ? (
                    <Text variant="accent" style={styles.check}>OK</Text>
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>

        <Text
          variant="muted"
          style={[styles.sectionLabel, styles.sectionLabelGap]}
        >
          {aboutSectionLabel.toUpperCase()}
        </Text>
        <Card style={styles.aboutCard}>
          <Text variant="subtitle">Week to Regatta</Text>
          <Text variant="caption" style={styles.aboutLine}>
            {versionLabel} {version} (build {buildNumber})
          </Text>
          <Text variant="muted" style={styles.aboutLine}>
            {phaseLabel}
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionLabelGap: {
    marginTop: spacing.xl,
  },
  langList: {
    gap: spacing.sm,
  },
  aboutCard: {
    paddingVertical: spacing.md,
  },
  aboutLine: {
    marginTop: 2,
  },
  langCard: {
    paddingVertical: spacing.md,
  },
  langCardSelected: {
    borderColor: colors.accentCyan,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langText: {
    flex: 1,
  },
  check: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
