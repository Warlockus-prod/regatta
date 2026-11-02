import { Pressable, StyleSheet, View } from 'react-native';
import { HELM_ASSIST_COPY, HELM_CONTROL_TERMS } from '../../../src/data/helm-assist-copy';
import { RACE_HELM_CONTROLS } from '../../../src/lib/race-helm';
import { useI18n } from '../i18n/context';
import { Text } from '../design-system/components';
import { colors, radii, spacing } from '../design-system/tokens';
import { useRaceHelmSetting } from '../persistence/race-helm';

/**
 * Package 13 (ADR-0022): the race's helm control, arrows by default for a new
 * install. The race hub and Settings show it; the race's own settings before
 * the start (the web RaceSetupSettings) write the same row. Words come from
 * the shared dictionary (HELM_CONTROL_TERMS, part of UI_TERMS) and the race's helm copy.
 */
export function RaceHelmChoice({ withLabel = true }: { withLabel?: boolean }) {
  const { lang } = useI18n();
  const { helm, ready, setHelm } = useRaceHelmSetting();
  const title = HELM_ASSIST_COPY.settingsTitle[lang];
  return (
    <View style={styles.wrap}>
      {withLabel && <Text variant="muted" style={styles.label}>{title.toUpperCase()}</Text>}
      <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={title}>
        {RACE_HELM_CONTROLS.map((value) => {
          const active = helm === value;
          return (
            <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: active, disabled: !ready }} disabled={!ready}
              onPress={() => setHelm(value)} testID={`race-helm-${value}`}
              style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && styles.itemPressed]}>
              <Text style={[styles.text, active && styles.textActive]}>{HELM_CONTROL_TERMS[value][lang]}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="caption" style={styles.note}>{HELM_ASSIST_COPY.settingsNote[lang]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.6, marginBottom: spacing.sm },
  segment: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: {
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(18, 50, 71, 0.16)',
    backgroundColor: colors.bgCard,
  },
  itemActive: { borderColor: colors.accentCyan },
  itemPressed: { opacity: 0.85 },
  text: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  textActive: { color: colors.accentCyan },
  note: { marginTop: spacing.xs },
});
