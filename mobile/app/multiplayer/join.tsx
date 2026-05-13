import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Clipboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useI18n } from '../../src/i18n/context';
import { Screen, Text } from '../../src/design-system/components';
import { colors, radii, spacing } from '../../src/design-system/tokens';
import {
  isValidRoomCode,
  normaliseRoomCodeInput,
  ROOM_CODE_LENGTH,
} from '../../src/multiplayer/room-code';
import { useRecentRooms } from '../../src/persistence/recent-rooms';

/**
 * Join a multiplayer room.
 *
 * Cell-based 4-character input field. Each cell is a 50pt square with
 * its own TextInput so we can:
 *   - jump focus to the next cell when the user types a character,
 *   - jump back when the user backspaces,
 *   - hard-clamp to 1 character per cell (paste of "ABCD" still works
 *     via the dedicated Paste button which uses the full normalisation
 *     path; ad-hoc paste into a single cell is allowed but truncated).
 *
 * Validation runs on every change; the Join CTA enables only when the
 * 4 cells produce a valid code (`isValidRoomCode`). Invalid characters
 * are filtered by `normaliseRoomCodeInput`, so e.g. typing 'O' lands
 * 'Q' in the cell automatically.
 */
export default function MultiplayerJoin() {
  const { tp } = useI18n();
  const router = useRouter();
  const { push } = useRecentRooms();
  const [chars, setChars] = useState<string[]>(() =>
    Array.from({ length: ROOM_CODE_LENGTH }, () => ''),
  );
  const [error, setError] = useState<string | null>(null);
  const inputsRef = useRef<Array<TextInput | null>>([]);

  const code = useMemo(() => chars.join(''), [chars]);
  const valid = isValidRoomCode(code);

  const screenTitle = tp(
    'Присоединиться',
    'Join a race',
    'Dolacz do wyscigu',
    {
      es: 'Unirse a la regata',
      fr: 'Rejoindre une course',
      de: 'Rennen beitreten',
      it: 'Unisciti alla regata',
    },
  );
  const codeLabel = tp('Код комнаты', 'Room code', 'Kod pokoju', {
    es: 'Codigo de sala',
    fr: 'Code de salle',
    de: 'Raum-Code',
    it: 'Codice stanza',
  });
  const helper = tp(
    'Введи 4-символьный код. Цифры 0/1/5 и буквы O/I/S исключены, чтобы не путать.',
    'Type the 4-character code. The digits 0 / 1 / 5 and letters O / I / S are excluded to avoid confusion.',
    'Wpisz 4-znakowy kod. Cyfry 0 / 1 / 5 i litery O / I / S sa wykluczone.',
    {
      es: 'Escribe el codigo de 4 caracteres. Los digitos 0 / 1 / 5 y las letras O / I / S estan excluidos.',
      fr: 'Tape le code a 4 caracteres. Les chiffres 0 / 1 / 5 et les lettres O / I / S sont exclus.',
      de: 'Tippe den 4-Zeichen-Code ein. Ziffern 0 / 1 / 5 und Buchstaben O / I / S sind ausgeschlossen.',
      it: 'Digita il codice a 4 caratteri. Le cifre 0 / 1 / 5 e le lettere O / I / S sono escluse.',
    },
  );
  const joinLabel = tp('Войти', 'Join', 'Dolacz', {
    es: 'Unirse',
    fr: 'Rejoindre',
    de: 'Beitreten',
    it: 'Unisciti',
  });
  const pasteLabel = tp('Вставить', 'Paste', 'Wklej', {
    es: 'Pegar',
    fr: 'Coller',
    de: 'Einfuegen',
    it: 'Incolla',
  });
  const clearLabel = tp('Очистить', 'Clear', 'Wyczysc', {
    es: 'Borrar',
    fr: 'Effacer',
    de: 'Loeschen',
    it: 'Cancella',
  });
  const errorBadCodeLabel = tp(
    'Этот код пока неполный или содержит недопустимый символ.',
    'This code is incomplete or has an invalid character.',
    'Ten kod jest niepelny lub ma niedozwolony znak.',
    {
      es: 'Este codigo esta incompleto o tiene un caracter invalido.',
      fr: 'Ce code est incomplet ou contient un caractere invalide.',
      de: 'Dieser Code ist unvollstaendig oder enthaelt ein ungueltiges Zeichen.',
      it: 'Questo codice e incompleto o contiene un carattere non valido.',
    },
  );

  /** Apply a normalised string to the cells, left to right. */
  const setFromString = useCallback((raw: string) => {
    const normalised = normaliseRoomCodeInput(raw);
    const next = Array.from({ length: ROOM_CODE_LENGTH }, (_, i) =>
      normalised.charAt(i) ?? '',
    );
    setChars(next);
    setError(null);
    // Move focus to the first empty cell, or the last cell when full.
    const firstEmpty = next.findIndex((c) => c === '');
    const targetIdx = firstEmpty === -1 ? ROOM_CODE_LENGTH - 1 : firstEmpty;
    inputsRef.current[targetIdx]?.focus();
  }, []);

  /** Handle a per-cell change. We allow paste into a single cell by
   *  re-routing >1 char input through `setFromString`. */
  const handleCellChange = useCallback((idx: number, value: string) => {
    if (value.length > 1) {
      // Likely a paste. Re-route through the full normaliser so the
      // alphabet filter applies and the cells line up.
      setFromString(chars.slice(0, idx).join('') + value);
      return;
    }
    const normalised = normaliseRoomCodeInput(value);
    const ch = normalised.charAt(0) ?? '';
    setChars((prev) => {
      const next = prev.slice();
      next[idx] = ch;
      return next;
    });
    setError(null);
    if (ch && idx < ROOM_CODE_LENGTH - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  }, [chars, setFromString]);

  /** Backspace handling: when the cell is empty and the user backs
   *  out, jump focus to the previous cell so they can correct typos
   *  without tapping the previous square. */
  const handleCellKey = useCallback((idx: number, key: string) => {
    if (key === 'Backspace' && chars[idx] === '' && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
      setChars((prev) => {
        const next = prev.slice();
        next[idx - 1] = '';
        return next;
      });
      setError(null);
    }
  }, [chars]);

  const handlePaste = useCallback(async () => {
    try {
      const raw = await Clipboard.getString();
      if (!raw) return;
      setFromString(raw);
    } catch {
      // Clipboard unavailable; the cell input still works as a fallback.
    }
  }, [setFromString]);

  const handleClear = useCallback(() => {
    setChars(Array.from({ length: ROOM_CODE_LENGTH }, () => ''));
    setError(null);
    inputsRef.current[0]?.focus();
  }, []);

  const handleJoin = useCallback(async () => {
    if (!valid) {
      setError(errorBadCodeLabel);
      return;
    }
    await push({ code, role: 'join' });
    router.push(`/multiplayer/race/${code}`);
  }, [valid, code, push, router, errorBadCodeLabel]);

  return (
    <Screen>
      <Stack.Screen options={{ title: screenTitle }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text variant="caption" style={styles.kicker}>
            {codeLabel.toUpperCase()}
          </Text>
          <View style={styles.cellRow} accessibilityLabel={`${codeLabel} ${chars.join(' ')}`}>
            {chars.map((ch, idx) => (
              <CodeCell
                key={idx}
                value={ch}
                inputRef={(el) => {
                  inputsRef.current[idx] = el;
                }}
                onChange={(v) => handleCellChange(idx, v)}
                onKey={(k) => handleCellKey(idx, k)}
              />
            ))}
          </View>
          <Text variant="caption" style={styles.helper}>
            {helper}
          </Text>
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={handlePaste}
            accessibilityRole="button"
            accessibilityLabel={pasteLabel}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>{pasteLabel}</Text>
          </Pressable>
          <Pressable
            onPress={handleClear}
            accessibilityRole="button"
            accessibilityLabel={clearLabel}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>{clearLabel}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleJoin}
          accessibilityRole="button"
          accessibilityLabel={joinLabel}
          accessibilityState={{ disabled: !valid }}
          disabled={!valid}
          style={({ pressed }) => [
            styles.cta,
            valid ? styles.ctaPrimary : styles.ctaDisabled,
            pressed && valid && styles.buttonPressed,
          ]}
        >
          <Text style={valid ? styles.ctaPrimaryText : styles.ctaDisabledText}>
            {joinLabel}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

interface CodeCellProps {
  value: string;
  inputRef: (el: TextInput | null) => void;
  onChange: (value: string) => void;
  onKey: (key: string) => void;
}

/**
 * Single 50pt cell with a centered TextInput. Keyboard is `default` so
 * letters and digits are both reachable without an extra toggle, and
 * `autoCorrect` / `autoCapitalize` are off so iOS does not rewrite the
 * code mid-type.
 */
function CodeCell({ value, inputRef, onChange, onKey }: CodeCellProps) {
  return (
    <View style={[styles.cell, value ? styles.cellFilled : null]}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        onKeyPress={(e) => onKey(e.nativeEvent.key)}
        maxLength={1}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        textContentType="none"
        keyboardType="default"
        style={styles.cellInput}
        selectionColor={colors.accentCyan}
        accessibilityRole="text"
      />
    </View>
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
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.accentCyan,
  },
  cellRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  cell: {
    width: 50,
    height: 50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderCyanSoft,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    borderColor: colors.accentCyan,
    backgroundColor: colors.bgCardHover,
  },
  cellInput: {
    width: 50,
    height: 50,
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
  },
  helper: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: spacing.md,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
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
  cta: {
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  ctaPrimary: {
    backgroundColor: colors.accentCyan,
  },
  ctaPrimaryText: {
    color: colors.bgPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ctaDisabled: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderCyanFaint,
  },
  ctaDisabledText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
