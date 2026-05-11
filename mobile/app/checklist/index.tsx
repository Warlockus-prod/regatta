import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import { Button, Card, Screen, Text } from '../../src/design-system/components';
import { checklistSections } from '../../src/data';
import { legacyPick, legacyPickArray } from '../../src/i18n/languages';
import { itemKey, useChecklistProgress } from '../../src/persistence/checklist';
import { colors, radii, spacing } from '../../src/design-system/tokens';

const PROGRESS_TINT_THRESHOLD = 0.8;

export default function Checklist() {
  const { tp, lang } = useI18n();
  const { isChecked, toggle, reset } = useChecklistProgress();

  const headerTitle = tp('Чек-лист', 'Checklist', 'Lista', {
    es: 'Lista',
    fr: 'Liste',
    de: 'Liste',
    it: 'Lista',
  });

  const introText = tp(
    'Прочитай ДО того как впервые встанешь на палубу. Отмечай по мере того, как разобрался.',
    'Read this BEFORE stepping on deck for the first time. Tick items as you cover them.',
    'Przeczytaj PRZED wejsciem na poklad po raz pierwszy. Odhaczaj w miare jak ogarniasz.',
    {
      es: 'Lee esto ANTES de subir a la cubierta por primera vez. Marca a medida que avances.',
      fr: 'Lis ceci AVANT de monter sur le pont pour la premiere fois. Coche au fur et a mesure.',
      de: 'Lies das BEVOR du das erste Mal an Deck gehst. Hake ab, was du erledigt hast.',
      it: 'Leggi PRIMA di salire sul ponte la prima volta. Spunta man mano che procedi.',
    },
  );

  const warningLabel = tp('Важно', 'Important', 'Wazne', {
    es: 'Importante',
    fr: 'Important',
    de: 'Wichtig',
    it: 'Importante',
  });

  const resetLabel = tp('Сбросить', 'Reset', 'Wyczysc', {
    es: 'Reiniciar',
    fr: 'Reinitialiser',
    de: 'Zuruecksetzen',
    it: 'Azzera',
  });

  const resetConfirmTitle = tp(
    'Сбросить чек-лист?',
    'Reset the checklist?',
    'Wyczyscic liste?',
    {
      es: 'Reiniciar la lista?',
      fr: 'Reinitialiser la liste ?',
      de: 'Liste zuruecksetzen?',
      it: 'Azzerare la lista?',
    },
  );

  const resetConfirmMessage = tp(
    'Все отметки удалятся, но текст останется.',
    'All ticks will be cleared. The content stays.',
    'Wszystkie znaczniki znikna, ale tresc zostaje.',
    {
      es: 'Se borraran todas las marcas. El contenido se queda.',
      fr: 'Toutes les coches seront effacees. Le contenu reste.',
      de: 'Alle Haken werden geloescht. Der Inhalt bleibt.',
      it: 'Tutte le spunte saranno cancellate. Il testo resta.',
    },
  );

  const cancelLabel = tp('Отмена', 'Cancel', 'Anuluj', {
    es: 'Cancelar',
    fr: 'Annuler',
    de: 'Abbrechen',
    it: 'Annulla',
  });

  const sectionsView = useMemo(() => {
    return checklistSections.map((section) => {
      const items = legacyPickArray(section, 'items', lang);
      const checked = items.reduce(
        (acc, _, i) => (isChecked(itemKey(section.id, i)) ? acc + 1 : acc),
        0,
      );
      return { section, items, checked };
    });
  }, [lang, isChecked]);

  const totalItems = sectionsView.reduce((acc, s) => acc + s.items.length, 0);
  const totalChecked = sectionsView.reduce((acc, s) => acc + s.checked, 0);
  const fraction = totalItems > 0 ? totalChecked / totalItems : 0;
  const progressColor =
    fraction >= PROGRESS_TINT_THRESHOLD ? colors.success : colors.accentCyan;

  const totalLabel = tp(
    `Готово ${totalChecked} из ${totalItems}`,
    `${totalChecked} of ${totalItems} ready`,
    `Gotowe ${totalChecked} z ${totalItems}`,
    {
      es: `${totalChecked} de ${totalItems} listo`,
      fr: `${totalChecked} sur ${totalItems} pret`,
      de: `${totalChecked} von ${totalItems} bereit`,
      it: `${totalChecked} su ${totalItems} pronto`,
    },
  );

  const sectionProgressLabel = (done: number, total: number) =>
    tp(
      `${done} из ${total}`,
      `${done} of ${total}`,
      `${done} z ${total}`,
      {
        es: `${done} de ${total}`,
        fr: `${done} sur ${total}`,
        de: `${done} von ${total}`,
        it: `${done} su ${total}`,
      },
    );

  const onResetPress = () => {
    Alert.alert(resetConfirmTitle, resetConfirmMessage, [
      { text: cancelLabel, style: 'cancel' },
      { text: resetLabel, style: 'destructive', onPress: reset },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Text variant="caption" style={styles.introText}>{introText}</Text>
          <Text variant="subtitle" style={styles.totalLabel}>{totalLabel}</Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, Math.round(fraction * 100))}%`,
                  backgroundColor: progressColor,
                },
              ]}
            />
          </View>
        </View>

        {sectionsView.map(({ section, items, checked }) => {
          const title = legacyPick(section, 'title', lang);
          const intro = legacyPick(section, 'intro', lang);
          const warning = legacyPick(section, 'warning', lang);
          return (
            <Card key={section.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.icon}>{section.icon}</Text>
                <View style={styles.headerText}>
                  <Text variant="subtitle" style={styles.title}>{title}</Text>
                  <Text variant="muted" style={styles.sectionProgress}>
                    {sectionProgressLabel(checked, items.length)}
                  </Text>
                </View>
              </View>
              {intro ? (
                <Text variant="caption" style={styles.intro2}>{intro}</Text>
              ) : null}
              <View style={styles.items}>
                {items.map((item, i) => {
                  const id = itemKey(section.id, i);
                  const done = isChecked(id);
                  return (
                    <Pressable
                      key={id}
                      onPress={() => toggle(id)}
                      style={({ pressed }) => [
                        styles.itemRow,
                        pressed && styles.itemRowPressed,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: done }}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          done ? styles.checkboxChecked : styles.checkboxEmpty,
                        ]}
                      >
                        {done ? <Text style={styles.checkmark}>{'✓'}</Text> : null}
                      </View>
                      <Text
                        variant="body"
                        style={[styles.itemText, done && styles.itemTextDone]}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {warning ? (
                <View style={styles.warning}>
                  <Text variant="muted" style={styles.warningLabel}>
                    {warningLabel.toUpperCase()}
                  </Text>
                  <Text variant="body" style={styles.warningText}>{warning}</Text>
                </View>
              ) : null}
            </Card>
          );
        })}

        <View style={styles.footer}>
          <Button variant="ghost" onPress={onResetPress}>{resetLabel}</Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

const CHECKBOX_SIZE = 22;

const styles = StyleSheet.create({
  scroll: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  intro: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  introText: {
    lineHeight: 18,
  },
  totalLabel: {
    marginTop: spacing.md,
    fontSize: 16,
  },
  progressTrack: {
    marginTop: spacing.sm,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.borderCyanFaint,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
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
  headerText: {
    flex: 1,
  },
  title: {
    flexShrink: 1,
  },
  sectionProgress: {
    marginTop: 2,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  intro2: {
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  items: {
    marginTop: spacing.md,
    gap: spacing.xs + 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  itemRowPressed: {
    backgroundColor: colors.surfaceCyanFaint,
  },
  checkbox: {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderRadius: CHECKBOX_SIZE / 2,
    marginRight: spacing.sm + 2,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  checkboxEmpty: {
    borderColor: colors.accentCyan,
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    borderColor: colors.accentCyan,
    backgroundColor: colors.accentCyan,
  },
  checkmark: {
    color: colors.bgPrimary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 13,
  },
  itemText: {
    flex: 1,
    lineHeight: 22,
  },
  itemTextDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  warning: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 68, 68, 0.10)',
    borderColor: 'rgba(255, 68, 68, 0.30)',
    borderWidth: 1,
  },
  warningLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  warningText: {
    color: colors.textPrimary,
  },
  footer: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
});
