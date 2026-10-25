import { Stack } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useState, useSyncExternalStore } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { diagnosticCopy as copy, diagnosticOutcomeCopy, diagnosticText } from "../../src/lib/diagnostic-copy";
import { nativeDiagnostics } from "../src/diagnostics/journal";
import { useI18n } from "../src/i18n/context";
import { Screen, Text } from "../src/design-system/components";
import { DarkSurface, darkStackOptions } from "../src/design-system/surface";
import { darkColors as colors } from "../src/design-system/tokens";

export default function Diagnostics() {
  const { lang } = useI18n();
  const text = (key: keyof typeof copy) => diagnosticText(copy[key], lang);
  const snapshot = useSyncExternalStore(nativeDiagnostics.subscribe, nativeDiagnostics.snapshot, nativeDiagnostics.snapshot);
  const [failedOnly, setFailedOnly] = useState(false);
  const [status, setStatus] = useState<"copied" | "copyFailed" | null>(null);
  const entries = snapshot.entries.filter(entry => !failedOnly || entry.event.outcome === "failed" || entry.event.outcome === "rejected");
  const action = (label: string, onPress: () => void, selected?: boolean) => <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={selected === undefined ? undefined : { selected }} onPress={onPress} style={[styles.button, selected && styles.selected]}><Text>{label}</Text></Pressable>;
  return <DarkSurface><Screen><Stack.Screen options={{ ...darkStackOptions, title: text("title") }} />
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="subtitle">{text("title")}</Text><Text variant="muted">{text("intro")}</Text>
      <View style={styles.actions}>
        {action(text("all"), () => setFailedOnly(false), !failedOnly)}
        {action(text("failures"), () => setFailedOnly(true), failedOnly)}
        {action(text("copy"), () => { void (async () => { try { const copied = await Clipboard.setStringAsync(JSON.stringify(nativeDiagnostics.snapshot(), null, 2)); setStatus(copied ? "copied" : "copyFailed"); } catch { setStatus("copyFailed"); } })(); })}
        {action(text("clear"), () => { setStatus(null); void nativeDiagnostics.clear(); })}
      </View>
      {status && <Text accessibilityLiveRegion="polite">{text(status)}</Text>}
      {snapshot.dropped > 0 && <Text variant="caption">{text("dropped")}: {snapshot.dropped}</Text>}
      {!entries.length && <Text>{text("empty")}</Text>}
      {[...entries].reverse().map(entry => <View key={`${entry.session}-${entry.seq}`} style={styles.entry}>
        <Text variant="caption">{text("session")} {entry.session} · {(entry.elapsedMs / 1000).toFixed(1)}s{entry.count > 1 ? ` ×${entry.count}` : ""}</Text>
        <Text variant="subtitle">{diagnosticText(diagnosticOutcomeCopy[entry.event.outcome], lang)}</Text>
        <Text style={styles.code}>{entry.event.surface} / {entry.event.type}</Text>
        <Text variant="caption">{Object.entries(entry.event).filter(([key]) => !["type", "surface", "outcome"].includes(key)).map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}</Text>
      </View>)}
    </ScrollView>
  </Screen></DarkSurface>;
}
const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 32 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, justifyContent: "center", borderWidth: 1, borderColor: colors.borderCyanFaint, borderRadius: 10 },
  selected: { borderColor: colors.accentCyan },
  entry: { padding: 12, gap: 6, borderWidth: 1, borderColor: colors.borderCyanFaint, borderRadius: 10 },
  code: { fontFamily: "Courier", fontSize: 12 },
});
