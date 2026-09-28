import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { copy } from "../../../src/lib/product/copy";
import { Text } from "../design-system/components";
import { colors } from "../design-system/tokens";
import { useI18n } from "../i18n/context";
import { showsMainNavigation } from "./visibility";

/** Full-screen activities need an entry when the bottom navigation is hidden. */
export function MenuButton() {
  const { lang } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  if (showsMainNavigation(pathname)) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel={copy.menu[lang]}
    accessibilityHint={copy.allSections[lang]} onPress={() => router.push("/menu")}
    style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.glyph}>
      <View style={styles.line} /><View style={styles.line} /><View style={styles.line} />
    </View>
    <Text style={styles.label}>{copy.menu[lang]}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { minHeight: 44, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8 },
  pressed: { backgroundColor: colors.bgCardHover },
  label: { color: colors.accentCyan, fontSize: 15, fontWeight: "600" },
  glyph: { width: 18, gap: 4 },
  line: { height: 1.5, backgroundColor: colors.accentCyan, borderRadius: 1 },
});
