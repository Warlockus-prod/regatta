import { useEffect, useState } from "react";
import { Stack, useRouter, type Href } from "expo-router";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { destinations, searchDestinations, sections, type Section } from "../../../src/lib/product/catalog";
import { copy } from "../../../src/lib/product/copy";
import { useI18n } from "../i18n/context";
import { Button, ListRow, Screen, Text } from "../design-system/components";
import { colors } from "../design-system/tokens";
import { fetchDaily, type DailyChallenge } from "../api/daily";

export function ProductHub({ section }: { section: Exclude<Section, "home"> }) {
  const { lang } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [daily, setDaily] = useState<DailyChallenge | null>(null);
  useEffect(() => {
    if (section !== "race") return;
    let active = true;
    fetchDaily().then(result => { if (active && result.ok && result.data) setDaily(result.data); });
    return () => { active = false; };
  }, [section]);
  const current = sections.find(s => s.id === section)!;
  const visible = section === "library" ? searchDestinations(query, lang, "native") : destinations.filter(d => d.section === section && d.native);
  const groups = section === "library" ? sections.filter(s => s.id !== "home").map(s => ({ id: s.id, title: s.title[lang], entries: visible.filter(d => d.section === s.id) }))
    : section === "learn" ? [
      { id: "sailing", title: copy.sailing[lang], entries: visible.filter(d => !d.certificate) },
      { id: "exam", title: copy.exam[lang], entries: visible.filter(d => d.certificate) },
    ] : [{ id: section, title: "", entries: visible }];
  return <Screen noTopInset>
    <Stack.Screen options={{ title: current.title[lang], headerBackVisible: false }} />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text style={styles.intro}>{current.description[lang]}</Text>
      {section === "library" && <View style={styles.search}>
        <TextInput accessibilityLabel={copy.search[lang]} placeholder={copy.hint[lang]} placeholderTextColor={colors.textMuted} value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" style={styles.input} />
        {query ? <Button variant="ghost" onPress={() => setQuery("")}>{copy.clear[lang]}</Button> : null}
      </View>}
      {groups.filter(g => g.entries.length).map(group => <View key={group.id} style={styles.group}>
        {group.title ? <Text style={styles.groupTitle} accessibilityRole="header">{group.title}</Text> : null}
        {group.entries.map((entry, index) => <ListRow key={entry.id} title={`${section === "practice" ? `${index + 1}. ` : ""}${entry.title[lang]}`} caption={[entry.detail?.[lang], entry.online ? copy.online[lang] : null].filter(Boolean).join(" ")} onPress={() => router.push(entry.native as Href)} />)}
      </View>)}
      {!visible.length && <Text accessibilityLiveRegion="polite">{copy.empty[lang]}</Text>}
      {section === "practice" && <Button variant="ghost" onPress={() => router.push("/simulator")}>{copy.fallback[lang]}</Button>}
      {section === "race" && daily && <ListRow title={copy.daily[lang]} caption={daily.day} onPress={() => router.push("/game?course=daily")} />}
    </ScrollView>
  </Screen>;
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, gap: 24, maxWidth: 820, width: "100%", alignSelf: "center" },
  intro: { color: colors.textSecondary, fontSize: 16, lineHeight: 24 },
  group: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderCyanFaint },
  groupTitle: { paddingTop: 20, paddingBottom: 8, fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  search: { gap: 4 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.borderCyanFaint, backgroundColor: colors.bgSecondary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.textPrimary },
});
