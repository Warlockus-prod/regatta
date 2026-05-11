import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../i18n/context';
import { detectDeviceLang } from '../i18n/device-locale';
import { ENABLED_LANGUAGES, isLang, type Lang } from '../i18n/languages';
import { Button, Card, Text } from '../design-system/components';
import { colors, spacing } from '../design-system/tokens';
import { useFirstLaunch } from '../persistence/firstLaunch';

/**
 * First-launch gate. Sits below `<I18nProvider>` and above `<Stack />`.
 *
 * Day-1 behavior:
 *  1. Wait for i18n hydration AND the first-launch flag to load.
 *  2. If the flag is already done, render children immediately.
 *  3. Otherwise:
 *     a. Detect the device locale.
 *     b. If the device locale maps to an enabled `Lang`, persist it
 *        (via setLang) and mark the flag done. No UI shown.
 *     c. Otherwise show a modal with the 7-language picker; on Continue
 *        mark the flag done.
 *
 * Children always render so that the splash screen (handled by SplashGate
 * one level up) and the Stack stay mounted; the modal layers on top.
 */
export function FirstLaunchGate({ children }: { children: ReactNode }) {
  const { lang, setLang, ready: i18nReady } = useI18n();
  const { ready: flagReady, done, markDone } = useFirstLaunch();
  const [showPicker, setShowPicker] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (resolved) return;
    if (!i18nReady || !flagReady) return;
    if (done) {
      setResolved(true);
      return;
    }
    const device = detectDeviceLang();
    if (isLang(device)) {
      setLang(device);
      markDone();
      setResolved(true);
      return;
    }
    setShowPicker(true);
  }, [i18nReady, flagReady, done, resolved, setLang, markDone]);

  const closePicker = () => {
    markDone();
    setShowPicker(false);
    setResolved(true);
  };

  return (
    <>
      {children}
      {showPicker ? (
        <LanguagePickerModal
          currentLang={lang}
          onPick={(next) => setLang(next)}
          onContinue={closePicker}
        />
      ) : null}
    </>
  );
}

interface LanguagePickerModalProps {
  currentLang: Lang;
  onPick: (l: Lang) => void;
  onContinue: () => void;
}

function LanguagePickerModal({
  currentLang,
  onPick,
  onContinue,
}: LanguagePickerModalProps) {
  const { tp } = useI18n();

  const title = tp('Выберите язык', 'Pick your language', 'Wybierz jezyk', {
    es: 'Elige tu idioma',
    fr: 'Choisissez votre langue',
    de: 'Sprache waehlen',
    it: 'Scegli la lingua',
  });

  const subtitle = tp(
    'Можно сменить позже в настройках.',
    'You can change this later in Settings.',
    'Mozesz to zmienic pozniej w ustawieniach.',
    {
      es: 'Puedes cambiarlo mas tarde en Ajustes.',
      fr: 'Vous pouvez changer plus tard dans les Reglages.',
      de: 'Aenderung jederzeit in den Einstellungen moeglich.',
      it: 'Puoi cambiarlo in seguito nelle Impostazioni.',
    },
  );

  const continueLabel = tp('Продолжить', 'Continue', 'Kontynuuj', {
    es: 'Continuar',
    fr: 'Continuer',
    de: 'Weiter',
    it: 'Continua',
  });

  // Modal is intentionally non-dismissible (no transparent backdrop tap,
  // no swipe). Continue is the only exit.
  const cards = useMemo(() => ENABLED_LANGUAGES, []);

  return (
    <Modal
      visible
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onContinue}
    >
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.sheet}>
          <Text variant="title" style={modalStyles.title}>{title}</Text>
          <Text variant="caption" style={modalStyles.subtitle}>{subtitle}</Text>
          <ScrollView
            style={modalStyles.list}
            contentContainerStyle={modalStyles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {cards.map((langMeta) => {
              const isSelected = langMeta.id === currentLang;
              return (
                <Card
                  key={langMeta.id}
                  onPress={() => onPick(langMeta.id)}
                  style={[
                    modalStyles.langCard,
                    isSelected && modalStyles.langCardSelected,
                  ]}
                >
                  <View style={modalStyles.langRow}>
                    <View style={modalStyles.langText}>
                      <Text variant="subtitle">{langMeta.nativeName}</Text>
                      <Text variant="caption">{langMeta.name}</Text>
                    </View>
                    {isSelected ? (
                      <Text variant="accent" style={modalStyles.check}>OK</Text>
                    ) : null}
                  </View>
                </Card>
              );
            })}
          </ScrollView>
          <View style={modalStyles.footer}>
            <Button onPress={onContinue}>{continueLabel}</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 18, 36, 0.92)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderCyanFaint,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    maxHeight: '92%',
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  list: {
    flexShrink: 1,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
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
  footer: {
    marginTop: spacing.lg,
  },
});
