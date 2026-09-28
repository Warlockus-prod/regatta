import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import { Card, Screen, Text } from '../../src/design-system/components';
import { onboardSections } from '../../src/data';
import { legacyPick, legacyPickArray } from '../../src/i18n/languages';
import { colors, spacing } from '../../src/design-system/tokens';

/**
 * On board: shipboard culture, commands, and etiquette across 8
 * sections. Single-screen scrolling list (no detail page) since each
 * section is short.
 *
 * Mirrors the web `/onboard` page: an intro paragraph above the
 * sections, a "Deeper by topic" cross-link block (anatomy + checklist),
 * and a closing summary card.
 */
export default function Onboard() {
  const { tp, lang } = useI18n();
  const router = useRouter();

  const headerTitle = tp('На борту', 'On board', 'Na pokładzie', {
    es: 'A bordo',
    fr: 'À bord',
    de: 'An Bord',
    it: 'A bordo',
  });

  const intro = tp(
    'Для тех, кто впервые идёт на регату или чартер. Не учим как управлять яхтой, а как вести себя на борту, чтобы быть полезным и не мешать.',
    'For anyone joining a regatta or a charter for the first time. Not how to sail the boat, but how to behave on board so you are useful and not in the way.',
    'Dla tych, którzy pierwszy raz płyną na regaty albo w rejs czarterowy. Nie o tym, jak prowadzić jacht, tylko o tym, jak się zachować na pokładzie, żeby się przydać i nie przeszkadzać.',
    {
      es: 'Para quien va por primera vez a una regata o a un chárter. No enseña a gobernar el barco, sino a comportarte a bordo para ser útil y no estorbar.',
      fr: "Pour toi qui pars pour la première fois en régate ou en croisière de location. On n'apprend pas ici à barrer, mais à se comporter à bord pour être utile et ne pas gêner.",
      de: 'Für alle, die zum ersten Mal auf eine Regatta oder einen Chartertörn gehen. Nicht, wie man eine Yacht steuert, sondern wie du dich an Bord verhältst, um nützlich zu sein und nicht im Weg zu stehen.',
      it: "Per chi va per la prima volta a una regata o in charter. Non insegna a condurre la barca, ma a comportarti a bordo per essere utile e non intralciare.",
    },
  );

  const warningLabel = tp(
    'Предупреждение',
    'Warning',
    'Uwaga',
    {
      es: 'Advertencia',
      fr: 'Attention',
      de: 'Achtung',
      it: 'Attenzione',
    },
  );

  const deeperTitle = tp('Глубже по темам', 'Go deeper', 'Więcej o tych tematach', {
    es: 'Para profundizar',
    fr: 'Pour aller plus loin',
    de: 'Zum Vertiefen',
    it: 'Per approfondire',
  });

  const deeperSubtitle = tp(
    'Краткий обзор здесь - подробности в отдельных разделах.',
    'The overview is here; the details are on dedicated pages.',
    'Tu jest krótki przegląd, szczegóły znajdziesz w osobnych działach.',
    {
      es: 'Aquí tienes un resumen; los detalles, en secciones aparte.',
      fr: 'Ici, un aperçu ; les détails sont dans des sections dédiées.',
      de: 'Hier der Überblick, Details in eigenen Bereichen.',
      it: 'Qui una panoramica, i dettagli in sezioni dedicate.',
    },
  );

  const anatomyTitle = tp('Устройство яхты', 'Yacht anatomy', 'Budowa jachtu', {
    es: 'Anatomía del velero',
    fr: 'Anatomie du voilier',
    de: 'Aufbau der Yacht',
    it: 'Anatomia della barca',
  });

  const anatomyDesc = tp(
    '17 деталей с описанием, 2D профиль.',
    '17 parts described, 2D profile.',
    '17 części z opisem, profil 2D.',
    {
      es: '17 piezas descritas, perfil 2D.',
      fr: '17 pièces décrites, profil 2D.',
      de: '17 Teile beschrieben, 2D-Profil.',
      it: '17 parti descritte, profilo 2D.',
    },
  );

  const checklistTitle = tp('Чек-лист к регате', 'Pre-race checklist', 'Lista kontrolna przed regatami', {
    es: 'Checklist para la regata',
    fr: 'Check-list avant la régate',
    de: 'Checkliste vor der Regatta',
    it: 'Checklist prima della regata',
  });

  const checklistCaption = tp('Что взять, что знать', 'What to pack, what to know', 'Co zabrać, co wiedzieć', {
    es: 'Qué llevar, qué saber',
    fr: 'Quoi emporter, quoi savoir',
    de: 'Was mitnehmen, was wissen',
    it: 'Cosa portare, cosa sapere',
  });

  const checklistDesc = tp(
    'Прогресс по пунктам сохраняется на устройстве.',
    'Your progress is saved on this device.',
    'Postęp zapisuje się na tym urządzeniu.',
    {
      es: 'El progreso se guarda en este dispositivo.',
      fr: "Ta progression est enregistrée sur cet appareil.",
      de: 'Dein Fortschritt wird auf diesem Gerät gespeichert.',
      it: 'I progressi vengono salvati su questo dispositivo.',
    },
  );

  const summary = tp(
    'Это базовая подборка. Каждая яхта - свой маленький мир. Главное правило: не уверен - спроси, не трогай без команды.',
    'These are the basics. Every yacht is a small world of its own. The main rule: not sure? Ask, and don\'t touch anything without a command.',
    'To podstawy. Każdy jacht to osobny mały świat. Najważniejsza zasada: nie jesteś pewien - zapytaj i niczego nie ruszaj bez komendy.',
    {
      es: 'Esto es lo básico. Cada barco es un pequeño mundo. La regla principal: si no estás seguro, pregunta, y no toques nada sin una orden.',
      fr: 'Ce sont les bases. Chaque voilier est un petit monde à part. Règle principale : pas sûr, demande ; ne touche à rien sans ordre.',
      de: 'Das sind die Grundlagen. Jede Yacht ist eine eigene kleine Welt. Die wichtigste Regel: Unsicher? Frag nach, und fass nichts ohne Kommando an.',
      it: 'Queste sono le basi. Ogni barca è un piccolo mondo a sé. La regola principale: se non sei sicuro, chiedi, e non toccare niente senza un comando.',
    },
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Text variant="caption" style={styles.introText}>{intro}</Text>
        </View>

        {onboardSections.map((section) => {
          const title = legacyPick(section, 'title', lang);
          const items = legacyPickArray(section, 'items', lang);
          const warning = legacyPick(section, 'warning', lang);
          return (
            <Card
              key={section.id}
              style={styles.card}
              accessibilityRole="text"
              accessibilityLabel={`${title}. ${items.join('. ')}${warning ? `. ${warningLabel}: ${warning}` : ''}`}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.icon}>{section.icon}</Text>
                <Text variant="subtitle" style={styles.title}>{title}</Text>
              </View>
              <View style={styles.items}>
                {items.map((item, i) => (
                  <View key={i} style={styles.item}>
                    <Text variant="muted" style={styles.bullet}>-</Text>
                    <Text variant="body" style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
              {warning ? (
                <View
                  style={styles.warning}
                  accessibilityRole="alert"
                >
                  <Text variant="muted" style={styles.warningLabel}>
                    {warningLabel.toUpperCase()}
                  </Text>
                  <Text variant="body" style={styles.warningText}>{warning}</Text>
                </View>
              ) : null}
            </Card>
          );
        })}

        {/* Deep-dive chapters: cross-link to the standalone screens. */}
        <View style={styles.deeper}>
          <Text variant="subtitle" style={styles.deeperTitle}>{deeperTitle}</Text>
          <Text variant="muted" style={styles.deeperSubtitle}>{deeperSubtitle}</Text>
        </View>

        <Card
          accent="cyan"
          style={styles.linkCard}
          onPress={() => router.push('/anatomy')}
          accessibilityRole="button"
          accessibilityLabel={`${anatomyTitle}. Bavaria 46. ${anatomyDesc}`}
        >
          <Text style={styles.linkIcon}>🔧</Text>
          <Text variant="subtitle" style={styles.linkTitle}>{anatomyTitle}</Text>
          <Text variant="muted" style={styles.linkMeta}>Bavaria 46</Text>
          <Text variant="caption" style={styles.linkDesc}>{anatomyDesc}</Text>
        </Card>

        <Card
          accent="cyan"
          style={styles.linkCard}
          onPress={() => router.push('/checklist')}
          accessibilityRole="button"
          accessibilityLabel={`${checklistTitle}. ${checklistCaption}. ${checklistDesc}`}
        >
          <Text style={styles.linkIcon}>✅</Text>
          <Text variant="subtitle" style={styles.linkTitle}>{checklistTitle}</Text>
          <Text variant="muted" style={styles.linkMeta}>{checklistCaption}</Text>
          <Text variant="caption" style={styles.linkDesc}>{checklistDesc}</Text>
        </Card>

        <Card accent="success" style={styles.summaryCard}>
          <Text variant="caption" style={styles.summaryText}>{summary}</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  intro: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  introText: {
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
  },
  items: {
    marginTop: spacing.md,
    gap: spacing.xs + 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    width: 12,
    fontWeight: '700',
    fontSize: 16,
    marginTop: 1,
  },
  itemText: {
    flex: 1,
    lineHeight: 22,
  },
  warning: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: 'rgba(138, 97, 0, 0.10)',
    borderColor: 'rgba(138, 97, 0, 0.30)',
    borderWidth: 1,
  },
  warningLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  warningText: {
    color: colors.textPrimary,
  },
  deeper: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  deeperTitle: {
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  deeperSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  linkCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 44,
    gap: spacing.xs,
  },
  linkIcon: {
    fontSize: 24,
  },
  linkTitle: {
    fontSize: 16,
  },
  linkMeta: {
    fontSize: 11,
  },
  linkDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  summaryCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: colors.textSecondary,
  },
});
