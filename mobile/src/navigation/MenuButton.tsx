import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { copy } from "../../../src/lib/product/copy";
import { Text } from "../design-system/components";
import { colors } from "../design-system/tokens";
import { useI18n } from "../i18n/context";

/**
 * A labelled entry, not an unexplained hamburger or another bottom tab.
 * `onPhoto` is the translucent pill that sits on the Home hero photo. In a
 * stack header, `tint` is the header tint, so dark instrument screens get
 * their cyan instead of the paper blue.
 */
export function MenuButton({ tone = "default", tint }: { tone?: "default" | "onPhoto"; tint?: string }) {
  const { lang } = useI18n();
  const router = useRouter();
  const photo = tone === "onPhoto";
  return <Pressable accessibilityRole="button" accessibilityLabel={copy.menu[lang]}
    accessibilityHint={copy.allSections[lang]} onPress={() => router.push("/menu")}
    style={({ pressed }) => [styles.button, photo && styles.photoButton, pressed && (photo ? styles.photoPressed : styles.pressed)]}>
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.glyph}>
      <View style={[styles.line, photo && styles.photoInk, tint ? { backgroundColor: tint } : null]} /><View style={[styles.line, photo && styles.photoInk, tint ? { backgroundColor: tint } : null]} /><View style={[styles.line, photo && styles.photoInk, tint ? { backgroundColor: tint } : null]} />
    </View>
    <Text style={[styles.label, photo && styles.photoLabel, tint ? { color: tint } : null]}>{copy.menu[lang]}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { minHeight: 44, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 22 },
  pressed: { backgroundColor: colors.bgCardHover },
  photoButton: { backgroundColor: "rgba(255, 255, 255, 0.2)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255, 255, 255, 0.45)" },
  photoPressed: { backgroundColor: "rgba(255, 255, 255, 0.32)" },
  label: { color: colors.accentCyan, fontSize: 15, fontWeight: "600" },
  photoLabel: { color: colors.onPhoto },
  glyph: { width: 18, gap: 4 },
  line: { height: 1.5, backgroundColor: colors.accentCyan, borderRadius: 1 },
  photoInk: { backgroundColor: colors.onPhoto },
});
