import { Stack, useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import { Card, Screen, Text } from '../../src/design-system/components';
import { ruleScenarios } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { colors, radii, spacing } from '../../src/design-system/tokens';

/**
 * Rules of the road. Mirrors the web /rules page: the scenarios are split
 * into two standards instead of one mixed list -
 *   RRS    (World Sailing racing rules, only between racers on the course)
 *   COLREGS (collision-prevention rules, apply ALWAYS to every vessel)
 * each with a short explainer, and the COLREGS block links out to the
 * official source text. Tap a card to open `/rules/[id]` (reveal Q/A).
 */

type Scenario = (typeof ruleScenarios)[number];

export default function Rules() {
  const { tp, lang } = useI18n();
  const router = useRouter();

  const headerTitle = tp('Правила', 'Rules of the road', 'Zasady', {
    es: 'Reglas',
    fr: 'Regles',
    de: 'Regeln',
    it: 'Regole',
  });

  const intro = tp(
    'Две системы правил: RRS (гоночные правила World Sailing, действуют только между гонщиками на дистанции) и МППСС-72 (международные правила предупреждения столкновений, действуют ВСЕГДА для каждого судна). Знать надо обе.',
    'Two rule systems: RRS (World Sailing racing rules, apply only between racing boats on the course) and COLREGS (International Regulations for Preventing Collisions at Sea, apply ALWAYS to every vessel). Both are essential.',
    'Dwa systemy zasad: RRS (przepisy regatowe World Sailing, obowiazuja tylko miedzy zawodnikami na trasie) i COLREGS (miedzynarodowe przepisy o zapobieganiu zderzeniom na morzu, obowiazuja ZAWSZE dla kazdej jednostki). Oba sa konieczne.',
  );

  const rrsTitle = tp(
    'Гоночные правила (World Sailing)',
    'Racing Rules of Sailing (World Sailing)',
    'Przepisy regatowe (World Sailing)',
  );
  const colregsTitle = tp(
    'Международные правила предупреждения столкновений',
    'International Regulations for Preventing Collisions at Sea',
    'Miedzynarodowe przepisy o zapobieganiu zderzeniom na morzu',
  );
  const colregsIntro = tp(
    'RRS действуют только во время гонки между гонщиками. В остальных случаях (выход из порта, прогулка, встреча с моторным судном) работают МППСС-72. Их обязан знать любой у штурвала.',
    'RRS applies only during a race between racing boats. Everywhere else (leaving harbour, cruising, meeting a power vessel), COLREGS applies. Every helmsman must know them.',
    'RRS obowiazuje tylko podczas regat miedzy zawodnikami. W innych sytuacjach (wyjscie z portu, rejs, spotkanie z jednostka motorowa) obowiazuje COLREGS. Musi je znac kazdy przy sterze.',
  );
  const officialText = tp(
    'Официальный текст МППСС-72: принят Международной морской организацией (IMO) в 1972, действует во всех странах-подписантах.',
    'Official COLREGS text: adopted by the International Maritime Organization (IMO) in 1972, binding in all signatory countries.',
    'Oficjalny tekst COLREGS: przyjete przez Miedzynarodowa Organizacje Morska (IMO) w 1972, obowiazuje we wszystkich panstwach-sygnatariuszach.',
  );

  const rrs = ruleScenarios.filter((r) => r.source !== 'colregs');
  const colregs = ruleScenarios.filter((r) => r.source === 'colregs');

  const imoLink = {
    label: tp('Текст IMO (англ.)', 'IMO official text', 'Tekst IMO (ang.)', {
      es: 'Texto oficial IMO',
      fr: 'Texte officiel IMO',
      de: 'IMO Originaltext',
      it: 'Testo ufficiale IMO',
    }),
    url: 'https://www.imo.org/en/OurWork/Safety/Pages/Preventing-Collisions.aspx',
  };
  const links: { label: string; url: string }[] =
    lang === 'ru'
      ? [{ label: 'МППСС-72 PDF (рус.)', url: 'https://fps30.ru/images/biblioteka/MPPSS-72.pdf' }, imoLink]
      : lang === 'pl'
        ? [{ label: 'Polski Zwiazek Zeglarski', url: 'https://pya.org.pl/polski-zwiazek-zeglarski/page/przepisy-zeglarskie/' }, imoLink]
        : lang === 'en'
          ? [imoLink, { label: 'US Navigation Rules PDF', url: 'https://www.navcen.uscg.gov/sites/default/files/pdf/navRules/navrules.pdf' }]
          : [imoLink];

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      /* no-op: external link failures are non-critical here */
    }
  };

  const renderCard = (scenario: Scenario) => {
    const title = legacyPick(scenario, 'title', lang);
    const scene = legacyPick(scenario, 'scene', lang);
    return (
      <Card
        key={scenario.id}
        onPress={() => router.push(`/rules/${scenario.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${scene}`}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.icon}>{scenario.icon}</Text>
          <View style={styles.cardText}>
            <Text variant="subtitle">{title}</Text>
            <Text variant="caption" style={styles.scene} numberOfLines={2}>{scene}</Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Text variant="body" style={styles.introText}>{intro}</Text>
        </View>

        {/* RRS section */}
        <View style={styles.sectionHeader}>
          <View style={[styles.badge, styles.badgeRrs]}>
            <Text style={[styles.badgeText, { color: colors.warning }]}>🏁 RRS</Text>
          </View>
          <Text variant="subtitle" style={styles.sectionTitle}>{rrsTitle}</Text>
        </View>
        {rrs.map(renderCard)}

        {/* COLREGS section */}
        <View style={[styles.sectionHeader, styles.sectionHeaderGap]}>
          <View style={[styles.badge, styles.badgeColregs]}>
            <Text style={[styles.badgeText, { color: colors.accentCyan }]}>🌊 COLREGS</Text>
          </View>
          <Text variant="subtitle" style={styles.sectionTitle}>{colregsTitle}</Text>
        </View>
        <Text variant="caption" style={styles.colregsIntro}>{colregsIntro}</Text>
        {colregs.map(renderCard)}

        {/* Official source links */}
        <Card style={styles.linksCard} accent="cyan">
          <Text variant="caption" style={styles.officialText}>{officialText}</Text>
          {links.map((l) => (
            <Pressable
              key={l.url}
              onPress={() => { void openLink(l.url); }}
              accessibilityRole="link"
              accessibilityLabel={l.label}
              style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowPressed]}
            >
              <Text style={styles.linkText}>{l.label}  ↗</Text>
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxl,
  },
  intro: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  introText: {
    lineHeight: 21,
    color: colors.textSecondary,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  sectionHeaderGap: {
    marginTop: spacing.xl,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  badgeRrs: {
    backgroundColor: 'rgba(255, 170, 0, 0.12)',
    borderColor: 'rgba(255, 170, 0, 0.30)',
  },
  badgeColregs: {
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderColor: 'rgba(0, 212, 255, 0.30)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  colregsIntro: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 28,
    marginRight: spacing.md,
    marginTop: 2,
  },
  cardText: {
    flex: 1,
  },
  scene: {
    marginTop: spacing.xs,
    lineHeight: 18,
    color: colors.textMuted,
  },
  linksCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  officialText: {
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  linkRow: {
    borderWidth: 1,
    borderColor: colors.borderCyanStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  linkRowPressed: {
    backgroundColor: colors.surfaceCyanFaint,
  },
  linkText: {
    color: colors.accentCyan,
    fontWeight: '600',
    textAlign: 'center',
  },
});
