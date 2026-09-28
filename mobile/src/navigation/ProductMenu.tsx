import { useState } from "react";
import { Stack, useRouter, type Href } from "expo-router";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { copy } from "../../../src/lib/product/copy";
import { menuGroups } from "../../../src/lib/product/menu";
import { useI18n } from "../i18n/context";
import { Button, ListRow, Screen, Text } from "../design-system/components";
import { colors } from "../design-system/tokens";

/** Native directory stays a compact, thumb-friendly list with the bottom tabs. */
export function ProductMenu() {
  const { lang } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const groups = menuGroups(query, lang, "native");
  return <Screen noTopInset>
    <Stack.Screen options={{ title: copy.menu[lang], headerBackVisible: true, headerBackButtonDisplayMode: "minimal", headerRight: () => null }} />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text style={styles.intro}>{copy.allSections[lang]}</Text>
      <View style={styles.search}>
        <TextInput accessibilityLabel={copy.search[lang]} placeholder={copy.hint[lang]} placeholderTextColor={colors.textMuted} value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" style={styles.input} />
        {query ? <Button variant="ghost" onPress={() => setQuery("")}>{copy.clear[lang]}</Button> : null}
      </View>
      {groups.map(group => <View key={group.id} style={styles.group}>
        <Text accessibilityRole="header" style={styles.groupTitle}>{group.title[lang]}</Text>
        {group.entries.map(entry => <ListRow key={entry.id} title={entry.title[lang]} caption={entry.online ? copy.online[lang] : undefined} onPress={() => router.push(entry.native as Href)} />)}
      </View>)}
      {!groups.length && <Text accessibilityLiveRegion="polite">{copy.empty[lang]}</Text>}
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, gap: 24, maxWidth: 760, width: "100%", alignSelf: "center" },
  intro: { color: colors.textSecondary, fontSize: 16, lineHeight: 24 },
  group: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderCyanFaint },
  groupTitle: { paddingTop: 20, paddingBottom: 8, fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  search: { gap: 4 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.borderCyanFaint, backgroundColor: colors.bgSecondary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.textPrimary },
});
