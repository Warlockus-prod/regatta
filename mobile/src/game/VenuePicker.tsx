import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { PICKABLE_VENUES, shoreLabel, venueLabel } from '../../../src/data/venues/venues';
import { useI18n } from '../i18n/context';
import { Text } from '../design-system/components';
import { colors, radii, spacing } from '../design-system/tokens';
import { useVenue, type RaceMode } from '../persistence/venue';
import { raceCopy } from './copy';

/** Race hub setup: race mode (simple or pro), the shore switch and the venue chips. */
export function VenuePicker() {
  const { lang } = useI18n();
  const { picked, shoreOn, mode, setVenue, setShoreOn, setRaceMode } = useVenue();
  return (
    <View style={styles.wrap}>
      <Text variant="muted" style={styles.label}>{raceCopy.mode[lang].toUpperCase()}</Text>
      <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={raceCopy.mode[lang]}>
        {(['simple', 'pro'] as RaceMode[]).map((m) => {
          const active = mode === m;
          return (
            <Pressable key={m} accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={() => setRaceMode(m)}
              style={({ pressed }) => [styles.segmentItem, active && styles.chipActive, pressed && styles.chipPressed]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{raceCopy[m][lang]}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="caption" style={styles.place}>{mode === 'pro' ? raceCopy.proNote[lang] : raceCopy.simpleNote[lang]}</Text>

      <View style={styles.shoreRow}>
        <Text variant="muted" style={[styles.label, styles.shoreLabel]}>{venueLabel[lang].toUpperCase()}</Text>
        <Text style={styles.switchText}>{shoreLabel[lang]}</Text>
        <Switch
          value={shoreOn}
          onValueChange={setShoreOn}
          accessibilityLabel={shoreLabel[lang]}
          trackColor={{ true: colors.accentCyan, false: 'rgba(18, 50, 71, 0.16)' }}
          ios_backgroundColor="rgba(18, 50, 71, 0.16)"
          thumbColor="#ffffff"
        />
      </View>
      {shoreOn && <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}
          accessibilityRole="radiogroup" accessibilityLabel={venueLabel[lang]}>
          {PICKABLE_VENUES.map((v) => {
            const active = v.id === picked.id;
            return (
              <Pressable key={v.id} accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={() => setVenue(v.id)}
                style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{v.name[lang]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text variant="caption" style={styles.place}>{picked.place[lang]}</Text>
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.6, marginBottom: spacing.sm },
  segment: { flexDirection: 'row', gap: spacing.sm },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(18, 50, 71, 0.16)',
    backgroundColor: colors.bgCard,
  },
  shoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, minHeight: 44 },
  shoreLabel: { flex: 1, marginBottom: 0 },
  switchText: { fontSize: 15, color: colors.textPrimary },
  row: { gap: spacing.sm, paddingRight: spacing.md, marginTop: spacing.xs },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(18, 50, 71, 0.16)',
    backgroundColor: colors.bgCard,
  },
  chipActive: { borderColor: colors.accentCyan },
  chipPressed: { opacity: 0.85 },
  chipText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  chipTextActive: { color: colors.accentCyan },
  place: { marginTop: spacing.xs },
});
