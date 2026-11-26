import { Pressable, StyleSheet, View } from "react-native";
import { useI18n } from "../i18n/context";
import { legacyPick } from "../i18n/languages";
import { Text } from "../design-system/components";
import { colors, radii, spacing } from "../design-system/tokens";
import {
  HUB_DIFFICULTIES, HUB_WINDS, choosePreset, difficultyLabel, hubMissions, hubSetupCopy,
  type HubPreset, type HubRaceSetup,
} from "./race-setup";

/**
 * The Race hub's one race setup (M1-1): preset, then level and wind for a free
 * race or the mission. The hub's start hands it to the race; the race does
 * not ask again. F1: the easy preset is "First race" until this device has
 * raced, then "Easy race". No animation; every target is at least 44 pt.
 */
export function RaceSetupPanel({ value, onChange, racedBefore = false }: { value: HubRaceSetup; onChange: (next: HubRaceSetup) => void; racedBefore?: boolean }) {
  const { lang } = useI18n();
  const c = hubSetupCopy;
  return <View style={styles.wrap}>
    <Text variant="muted" style={styles.label}>{c.setup[lang].toUpperCase()}</Text>
    <Segment label={c.setup[lang]} options={(["learn", "free", "mission"] as HubPreset[]).map(id => ({ id, text: id === "learn" && racedBefore ? c.learnAgain[lang] : c[id][lang] }))}
      value={value.preset} onPick={preset => onChange(choosePreset(value, preset))} />
    {value.preset === "learn" && <Text variant="caption" style={styles.note}>{c.learnNote[lang]}</Text>}
    {value.preset === "free" && <>
      <Text variant="muted" style={[styles.label, styles.gap]}>{c.level[lang].toUpperCase()}</Text>
      <Segment label={c.level[lang]} options={HUB_DIFFICULTIES.map(id => ({ id, text: difficultyLabel(id, lang) }))}
        value={value.difficulty} onPick={difficulty => onChange({ ...value, difficulty })} />
      <Text variant="muted" style={[styles.label, styles.gap]}>{c.wind[lang].toUpperCase()}</Text>
      <Segment label={c.wind[lang]} options={HUB_WINDS.map(id => ({ id, text: c[id][lang] }))}
        value={value.wind} onPick={wind => onChange({ ...value, wind })} />
    </>}
    {value.preset === "mission" && <View style={[styles.missions, styles.gap]} accessibilityRole="radiogroup" accessibilityLabel={c.mission[lang]}>
      {hubMissions.map(m => {
        const active = m.id === value.missionId;
        return <Pressable key={m.id} accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={() => onChange({ ...value, missionId: m.id })}
          style={({ pressed }) => [styles.mission, active && styles.active, pressed && styles.pressed]}>
          <Text style={[styles.optionText, styles.left, active && styles.activeText]}>{m.emoji} {legacyPick(m, "title", lang)}</Text>
          <Text variant="caption">{legacyPick(m, "desc", lang)}</Text>
        </Pressable>;
      })}
    </View>}
  </View>;
}

function Segment<T extends string>({ label, options, value, onPick }: { label: string; options: { id: T; text: string }[]; value: T; onPick: (id: T) => void }) {
  return <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={label}>
    {options.map(o => {
      const active = o.id === value;
      return <Pressable key={o.id} accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={() => onPick(o.id)}
        style={({ pressed }) => [styles.option, active && styles.active, pressed && styles.pressed]}>
        <Text style={[styles.optionText, active && styles.activeText]} numberOfLines={2}>{o.text}</Text>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { fontSize: 13, fontWeight: "600", letterSpacing: 0.6 },
  gap: { marginTop: spacing.sm },
  note: { color: colors.textSecondary },
  segment: { flexDirection: "row", gap: spacing.sm },
  option: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: "rgba(18, 50, 71, 0.16)", backgroundColor: colors.bgCard },
  missions: { gap: spacing.sm },
  mission: { minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2, borderRadius: radii.md, borderWidth: 1, borderColor: "rgba(18, 50, 71, 0.16)", backgroundColor: colors.bgCard },
  active: { borderColor: colors.accentCyan },
  pressed: { opacity: 0.85 },
  optionText: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: colors.textPrimary, textAlign: "center" },
  activeText: { color: colors.accentCyan },
  left: { textAlign: "left" },
});
