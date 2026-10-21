import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { VENUES, venueLabel } from '../../../src/data/venues/venues';
import { useI18n } from '../i18n/context';
import { Text } from '../design-system/components';
import { colors, radii, spacing } from '../design-system/tokens';
import { useVenue } from '../persistence/venue';

/** Venue chips in the Race hub: which shore surrounds the race bay. */
export function VenuePicker() {
  const { lang } = useI18n();
  const [venue, setVenue] = useVenue();
  return (
    <View style={styles.wrap}>
      <Text variant="muted" style={styles.label}>{venueLabel[lang].toUpperCase()}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}
        accessibilityRole="radiogroup" accessibilityLabel={venueLabel[lang]}>
        {VENUES.map((v) => {
          const active = v.id === venue.id;
          return (
            <Pressable key={v.id} accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={() => setVenue(v.id)}
              style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{v.name[lang]}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text variant="caption" style={styles.place}>{venue.place[lang]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.6, marginBottom: spacing.sm },
  row: { gap: spacing.sm, paddingRight: spacing.md },
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
