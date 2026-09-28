import { useEffect, useState, type ReactNode } from "react";
import { Stack, useRouter, type Href } from "expo-router";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { destinations, searchDestinations, sections, type Destination, type Section } from "../../../src/lib/product/catalog";
import { copy } from "../../../src/lib/product/copy";
import { useI18n } from "../i18n/context";
import { Button, ListRow, Screen, Text } from "../design-system/components";
import { colors, radii, shadow } from "../design-system/tokens";
import { fetchDaily, type DailyChallenge } from "../api/daily";
import { PhotoCard } from "../home/PhotoCard";
import { MenuButton } from "./MenuButton";

const racePhoto = require("../../assets/design/race-card.jpg");

/**
 * A section hub (Learn, Practice, Race, Library) or, with `menu`, the list of
 * all sections. Hubs are tabs: large in-content title, grouped rows on white
 * cards. The menu keeps the stack header with a back button.
 */
export function ProductHub({ section, menu = false }: { section: Exclude<Section, "home">; menu?: boolean }) {
  const { lang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [daily, setDaily] = useState<DailyChallenge | null>(null);
  useEffect(() => {
    if (section !== "race") return;
    let active = true;
    fetchDaily().then(result => { if (active && result.ok && result.data) setDaily(result.data); });
    return () => { active = false; };
  }, [section]);
  const current = sections.find(s => s.id === section)!;
  const solo = destinations.find(d => d.id === "solo")!;
  const visible = section === "library" ? searchDestinations(query, lang, "native") : destinations.filter(d => d.section === section && d.native && !(section === "race" && d.id === "solo"));
  const groups = section === "library" ? sections.filter(s => s.id !== "home").map(s => ({ id: s.id, title: s.title[lang], entries: visible.filter(d => d.section === s.id) }))
    : section === "learn" ? [
      { id: "sailing", title: copy.sailing[lang], entries: visible.filter(d => !d.certificate) },
      { id: "exam", title: copy.exam[lang], entries: visible.filter(d => d.certificate) },
    ] : [{ id: section, title: "", entries: visible }];
  const row = (entry: Destination, index: number, count: number) => <ListRow key={entry.id} noBorder={index === count - 1}
    title={`${section === "practice" ? `${index + 1}. ` : ""}${entry.title[lang]}`} caption={entry.detail?.[lang]}
    badge={entry.online ? copy.online[lang] : undefined} onPress={() => router.push(entry.native as Href)} />;
  return <Screen noTopInset>
    <Stack.Screen options={menu
      ? { title: copy.allSections[lang], headerBackVisible: true, headerRight: () => null }
      : { title: current.title[lang], headerShown: false, animation: "fade" }} />
    <ScrollView contentContainerStyle={[styles.content, !menu && { paddingTop: insets.top + 8 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      {!menu && <View style={styles.titleRow}>
        <Text variant="title" accessibilityRole="header" style={styles.title}>{current.title[lang]}</Text>
        <MenuButton />
      </View>}
      <Text style={styles.intro}>{menu ? copy.menuIntro[lang] : current.description[lang]}</Text>
      {section === "race" && !menu && <PhotoCard source={racePhoto} height={188} eyebrow={current.title[lang]} title={solo.title[lang]} caption={solo.detail?.[lang]} onPress={() => router.push(solo.native as Href)} />}
      {section === "library" && <View style={styles.search}>
        <View style={styles.field}>
          <Svg width={18} height={18} viewBox="0 0 18 18" accessibilityElementsHidden importantForAccessibility="no">
            <Circle cx={7.5} cy={7.5} r={5.5} stroke={colors.textSecondary} strokeWidth={1.8} fill="none" />
            <Path d="m11.8 11.8 4.2 4.2" stroke={colors.textSecondary} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
          <TextInput accessibilityLabel={copy.search[lang]} placeholder={copy.hint[lang]} placeholderTextColor={colors.textMuted} value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" style={styles.input} />
        </View>
        {query ? <Button variant="ghost" onPress={() => setQuery("")}>{copy.clear[lang]}</Button> : null}
      </View>}
      {menu && !query.trim() && <Group title={copy.navigation[lang]}>
        {sections.map((entry, index) => <ListRow key={entry.id} noBorder={index === sections.length - 1} title={entry.title[lang]} onPress={() => router.replace(entry.native as Href)} />)}
      </Group>}
      {groups.filter(g => g.entries.length).map(group => <Group key={group.id} title={group.title}>
        {group.entries.map((entry, index) => row(entry, index, group.entries.length))}
      </Group>)}
      {!visible.length && <Text accessibilityLiveRegion="polite" style={styles.empty}>{copy.empty[lang]}</Text>}
      {section === "practice" && <Button variant="ghost" onPress={() => router.push("/simulator")}>{copy.fallback[lang]}</Button>}
      {section === "race" && daily && <Group title="">
        <ListRow noBorder title={copy.daily[lang]} caption={daily.day} onPress={() => router.push("/game?course=daily")} />
      </Group>}
    </ScrollView>
  </Screen>;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.group}>
    {title ? <Text style={styles.groupTitle} accessibilityRole="header">{title}</Text> : null}
    <View style={styles.groupShadow}><View style={styles.groupCard}>{children}</View></View>
  </View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, gap: 20, maxWidth: 820, width: "100%", alignSelf: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 48 },
  title: { flexShrink: 1 },
  intro: { color: colors.textSecondary, fontSize: 16, lineHeight: 24, marginTop: -8 },
  group: { gap: 8 },
  groupTitle: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: colors.textSecondary, paddingHorizontal: 4 },
  groupShadow: { backgroundColor: colors.bgCard, borderRadius: radii.card, ...shadow.card },
  groupCard: { borderRadius: radii.card, overflow: "hidden" },
  search: { gap: 4 },
  field: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(18, 50, 71, 0.18)", backgroundColor: colors.bgCard, borderRadius: radii.control, paddingHorizontal: 14 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.textPrimary },
  empty: { color: colors.textSecondary },
});
