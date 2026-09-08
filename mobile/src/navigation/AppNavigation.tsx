import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, type Href } from "expo-router";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sections, sectionForPath } from "../../../src/lib/product/catalog";
import { useI18n } from "../i18n/context";
import { Icon, Text, type IconName } from "../design-system/components";
import { colors } from "../design-system/tokens";
import { showsMainNavigation } from "./visibility";
import { NavigationInsetContext } from "./NavigationContext";

export function AppNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboard(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboard(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const visible = showsMainNavigation(pathname) && !keyboard;
  const selected = sectionForPath(pathname, "native");
  return <NavigationInsetContext.Provider value={visible}>
    <View style={styles.root}>
      <View style={styles.content}>{children}</View>
      {visible && <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {sections.map(s => <Pressable key={s.id} accessibilityRole="tab" accessibilityLabel={s.title[lang]} accessibilityState={{ selected: selected === s.id }} onPress={() => { if (pathname !== s.native) router.replace(s.native as Href); }} style={({ pressed }) => [styles.tab, selected === s.id && styles.selected, pressed && styles.pressed]}>
          <Icon name={s.icon as IconName} size={22} color={selected === s.id ? colors.accentCyan : colors.textSecondary} />
          <Text style={[styles.label, selected === s.id && styles.activeLabel]}>{s.title[lang]}</Text>
        </Pressable>)}
      </View>}
    </View>
  </NavigationInsetContext.Provider>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { flex: 1 },
  bar: { flexDirection: "row", paddingTop: 4, paddingHorizontal: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderCyanFaint, backgroundColor: colors.bgSecondary },
  tab: { flex: 1, minHeight: 58, paddingVertical: 8, paddingHorizontal: 2, alignItems: "center", gap: 5, borderTopWidth: 2, borderTopColor: "transparent" },
  selected: { borderTopColor: colors.accentCyan },
  pressed: { backgroundColor: colors.bgCardHover },
  label: { fontSize: 11, lineHeight: 15, textAlign: "center", color: colors.textSecondary },
  activeLabel: { color: colors.accentCyan, fontWeight: "600" },
});
