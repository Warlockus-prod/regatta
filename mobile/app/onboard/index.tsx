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

  const headerTitle = tp('На борту', 'On board', 'Na pokladzie', {
    es: 'A bordo',
    fr: 'A bord',
    de: 'An Bord',
    it: 'A bordo',
  });

  const intro = tp(
    'Для тех, кто впервые идёт на регату или чартер. Не учим как управлять яхтой, а как вести себя на борту, чтобы быть полезным и не мешать.',
    'For first-time regatta or charter crew. Not how to sail - how to behave on board so you are useful and not in the way.',
    'Dla tych, ktorzy pierwszy raz ida na regate lub czarter. Nie uczymy jak sterowac - jak zachowac sie na pokladzie, aby byc pomocnym i nie przeszkadzac.',
    {
      es: 'Para tripulacion novata de regata o charter. No como navegar: como comportarse a bordo para ser util y no estorbar.',
      fr: "Pour l'equipage debutant en regate ou en charter. Pas comment naviguer : comment se comporter a bord pour etre utile et ne pas gener.",
      de: 'Fuer Crew, die zum ersten Mal auf Regatta oder Charter geht. Nicht wie man segelt - wie man sich an Bord verhaelt, um nuetzlich zu sein und nicht im Weg zu stehen.',
      it: "Per l'equipaggio alle prime regate o charter. Non come navigare: come comportarsi a bordo per essere utile e non intralciare.",
    },
  );

  const warningLabel = tp(
    'Предупреждение',
    'Warning',
    'Uwaga',
    {
      es: 'Advertencia',
      fr: 'Attention',
      de: 'Warnung',
      it: 'Attenzione',
    },
  );

  const deeperTitle = tp('Глубже по темам', 'Deeper by topic', 'Glebiej po tematach', {
    es: 'Mas a fondo por tema',
    fr: 'Plus en detail par theme',
    de: 'Tiefer nach Thema',
    it: 'Piu a fondo per argomento',
  });

  const deeperSubtitle = tp(
    'Краткий обзор здесь - подробности в отдельных разделах.',
    'Overview here - details on dedicated pages.',
    'Krotki przeglad tutaj - szczegoly w osobnych sekcjach.',
    {
      es: 'Resumen aqui: detalles en secciones aparte.',
      fr: 'Apercu ici : details dans des sections dediees.',
      de: 'Ueberblick hier - Details in eigenen Bereichen.',
      it: 'Panoramica qui: dettagli in sezioni dedicate.',
    },
  );

  const anatomyTitle = tp('Устройство яхты', 'Yacht anatomy', 'Budowa jachtu', {
    es: 'Anatomia del yate',
    fr: 'Anatomie du yacht',
    de: 'Yacht-Aufbau',
    it: 'Anatomia dello yacht',
  });

  const anatomyDesc = tp(
    '17 деталей с описанием, 2D профиль.',
    '17 parts described, 2D profile.',
    '17 czesci z opisem, profil 2D.',
    {
      es: '17 piezas descritas, perfil 2D.',
      fr: '17 pieces decrites, profil 2D.',
      de: '17 Teile beschrieben, 2D-Profil.',
      it: '17 parti descritte, profilo 2D.',
    },
  );

  const checklistTitle = tp('Чек-лист к регате', 'Pre-race checklist', 'Lista przed regata', {
    es: 'Lista pre-regata',
    fr: 'Checklist avant course',
    de: 'Pre-Race-Checkliste',
    it: 'Checklist pre-gara',
  });

  const checklistCaption = tp('Что взять, что знать', 'Pack, know, do', 'Co wziac, co wiedziec', {
    es: 'Que llevar, que saber',
    fr: 'Quoi emporter, quoi savoir',
    de: 'Was mitnehmen, was wissen',
    it: 'Cosa portare, cosa sapere',
  });

  const checklistDesc = tp(
    'Прогресс по пунктам сохраняется на устройстве.',
    'Progress saved on the device.',
    'Postep zapisuje sie na urzadzeniu.',
    {
      es: 'El progreso se guarda en el dispositivo.',
      fr: "La progression est enregistree sur l'appareil.",
      de: 'Fortschritt wird auf dem Geraet gespeichert.',
      it: 'I progressi vengono salvati sul dispositivo.',
    },
  );

  const summary = tp(
    'Это базовая подборка. Каждая яхта - свой маленький мир. Главное правило: не уверен - спроси, не трогай без команды.',
    'This is the basics. Each yacht has its own quirks. Main rule: not sure - ask. Do not touch without a command.',
    'To podstawy. Kazdy jacht ma swoje kwirki. Glowna zasada: nie jestes pewien - zapytaj, nie dotykaj bez komendy.',
    {
      es: 'Esto es lo basico. Cada yate tiene sus manias. Regla principal: si no estas seguro, pregunta; no toques sin orden.',
      fr: "Voici les bases. Chaque yacht a ses particularites. Regle principale : pas sur - demande ; ne touche a rien sans ordre.",
      de: 'Das sind die Grundlagen. Jede Yacht hat ihre Eigenheiten. Hauptregel: unsicher - frag, fass nichts ohne Kommando an.',
      it: "Queste sono le basi. Ogni yacht ha le sue manie. Regola principale: non sei sicuro - chiedi, non toccare senza un comando.",
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
    backgroundColor: 'rgba(255, 170, 0, 0.10)',
    borderColor: 'rgba(255, 170, 0, 0.30)',
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
