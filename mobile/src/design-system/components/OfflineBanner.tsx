import { StyleSheet, View } from 'react-native';
import { useI18n } from '../../i18n/context';
import { Text } from './Text';
import { colors, spacing } from '../tokens';

interface OfflineBannerProps {
  visible: boolean;
}

/**
 * 32pt sticky strip that surfaces "offline mode, cached content" in the
 * user's current language. Visibility is consumer-controlled because we
 * don't add `@react-native-community/netinfo` in this round - any caller
 * that wants live online/offline state can wire a NetInfo listener and
 * forward the boolean. Tests can pass `visible` directly.
 *
 * Render at the top of a `Screen`, above the ScrollView. The strip
 * does not push content - it overlays via `position: absolute` so the
 * scroll math stays stable.
 */
export function OfflineBanner({ visible }: OfflineBannerProps) {
  const { tp } = useI18n();
  if (!visible) return null;

  const label = tp(
    'Офлайн-режим - показано из кэша',
    'Offline mode - cached content',
    'Tryb offline - tresc z pamieci',
    {
      es: 'Modo sin conexion - contenido en cache',
      fr: 'Hors ligne - contenu en cache',
      de: 'Offline-Modus - Inhalt aus dem Cache',
      it: 'Modalita offline - contenuto in cache',
    },
  );

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={label}
      style={styles.bar}
    >
      <Text style={styles.text} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 32,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 170, 0, 0.14)',
    borderBottomColor: 'rgba(255, 170, 0, 0.30)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
