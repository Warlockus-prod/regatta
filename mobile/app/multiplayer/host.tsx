import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useI18n } from '../../src/i18n/context';
import { Screen, Text } from '../../src/design-system/components';
import { colors, radii, spacing } from '../../src/design-system/tokens';
import { generateRoomCode } from '../../src/multiplayer/room-code';
import { useRecentRooms } from '../../src/persistence/recent-rooms';

/**
 * Host a multiplayer room.
 *
 * v1 / Phase-3 skeleton: the code is generated on-device by
 * `generateRoomCode()` so we can ship the lobby UI without waiting on
 * the Phase-4 backend. When the real WebSocket lobby lands the code
 * comes from the server response (and the local fallback can stay as
 * an offline-stub).
 *
 * Three CTAs:
 *  - Copy: drops the code on the clipboard.
 *  - Share: RN core `Share.share` sheet so the user can DM the code.
 *  - Start race: pushes `/multiplayer/race/{code}` and persists the
 *    code as a host entry on the recent-rooms list.
 */
export default function MultiplayerHost() {
  const { tp } = useI18n();
  const router = useRouter();
  const { push } = useRecentRooms();
  // Generate the code ONCE per mount so a re-render does not roll a
  // fresh code under the user. Re-mount (back + open again) yields a
  // new code, which is the right model for "open the host screen, get
  // a fresh room".
  const code = useMemo(() => generateRoomCode(), []);
  const [copied, setCopied] = useState(false);

  const screenTitle = tp('Хост гонки', 'Host a race', 'Hostuj wyscig', {
    es: 'Crear regata',
    fr: 'Hote de course',
    de: 'Rennen-Host',
    it: 'Host gara',
  });

  const codeLabel = tp('Код комнаты', 'Room code', 'Kod pokoju', {
    es: 'Codigo de sala',
    fr: 'Code de salle',
    de: 'Raum-Code',
    it: 'Codice stanza',
  });

  const helper = tp(
    'Поделись кодом с тем, кого зовёшь в гонку. Они введут его в «Присоединиться».',
    'Share the code with whoever you are inviting. They paste it into "Join a race".',
    'Podziel sie kodem z osoba, ktora zapraszasz. Wpisze go w "Dolacz".',
    {
      es: 'Comparte el codigo con quien invites. Lo pegaran en "Unirse a la regata".',
      fr: 'Partage le code avec qui tu invites. Il le collera dans "Rejoindre".',
      de: 'Teile den Code mit deinen Gaesten. Sie geben ihn in "Beitreten" ein.',
      it: 'Condividi il codice con chi inviti. Lo incollera in "Unisciti".',
    },
  );

  const copyLabel = tp('Копировать', 'Copy', 'Kopiuj', {
    es: 'Copiar',
    fr: 'Copier',
    de: 'Kopieren',
    it: 'Copia',
  });
  const copiedLabel = tp('Скопировано', 'Copied', 'Skopiowano', {
    es: 'Copiado',
    fr: 'Copie',
    de: 'Kopiert',
    it: 'Copiato',
  });
  const shareLabel = tp('Поделиться', 'Share', 'Udostepnij', {
    es: 'Compartir',
    fr: 'Partager',
    de: 'Teilen',
    it: 'Condividi',
  });
  const startLabel = tp('Начать гонку', 'Start race', 'Rozpocznij wyscig', {
    es: 'Iniciar regata',
    fr: 'Lancer la course',
    de: 'Rennen starten',
    it: 'Inizia la regata',
  });
  const cancelLabel = tp('Отмена', 'Cancel', 'Anuluj', {
    es: 'Cancelar',
    fr: 'Annuler',
    de: 'Abbrechen',
    it: 'Annulla',
  });

  const shareTitleLabel = tp(
    'Гонка в Regatta',
    'Regatta race',
    'Wyscig w Regatta',
    {
      es: 'Regata en Regatta',
      fr: 'Course Regatta',
      de: 'Regatta-Rennen',
      it: 'Gara Regatta',
    },
  );

  const handleCopy = useCallback(() => {
    void Clipboard.setStringAsync(code);
    setCopied(true);
    // Reset the "Copied" pill after 2 sec so the button can be pressed
    // again with visible feedback.
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleShare = useCallback(async () => {
    const message = `${shareTitleLabel}: ${code}`;
    try {
      await Share.share({ message, title: shareTitleLabel });
    } catch {
      // Share sheet dismissed or unavailable; the inline code is still
      // on screen so the user has a fallback.
    }
  }, [code, shareTitleLabel]);

  const handleStart = useCallback(async () => {
    await push({ code, role: 'host' });
    router.push(`/multiplayer/race/${code}`);
  }, [code, push, router]);

  const handleCancel = useCallback(() => router.back(), [router]);

  return (
    <Screen>
      <Stack.Screen options={{ title: screenTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text variant="caption" style={styles.kicker}>
            {codeLabel.toUpperCase()}
          </Text>
          <Text style={styles.codeText} accessibilityLabel={`${codeLabel} ${code.split('').join(' ')}`}>
            {code}
          </Text>
          <Text variant="caption" style={styles.helper}>
            {helper}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={handleCopy}
            accessibilityRole="button"
            accessibilityLabel={copied ? copiedLabel : copyLabel}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>{copied ? copiedLabel : copyLabel}</Text>
          </Pressable>
          <Pressable
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel={shareLabel}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>{shareLabel}</Text>
          </Pressable>
        </View>

        <View style={styles.ctaCol}>
          <Pressable
            onPress={handleStart}
            accessibilityRole="button"
            accessibilityLabel={startLabel}
            style={({ pressed }) => [
              styles.cta,
              styles.ctaPrimary,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.ctaPrimaryText}>{startLabel}</Text>
          </Pressable>
          <Pressable
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            style={({ pressed }) => [
              styles.cta,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.ctaText}>{cancelLabel}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.accentCyan,
  },
  codeText: {
    color: colors.textPrimary,
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: 8,
    fontVariant: ['tabular-nums'],
  },
  helper: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.84,
  },
  buttonText: {
    color: colors.accentCyan,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ctaCol: {
    gap: spacing.sm,
  },
  cta: {
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
  },
  ctaPrimary: {
    backgroundColor: colors.accentCyan,
    borderColor: colors.accentCyan,
  },
  ctaPrimaryText: {
    color: colors.bgPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ctaText: {
    color: colors.accentCyan,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
