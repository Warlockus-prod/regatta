import { recordNativeDiagnostic } from "../diagnostics/journal";
import { diagnosticDestination } from "../../../src/lib/diagnostic-destination";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter, type Href } from "expo-router";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../i18n/context";
import { Icon, Text, type IconName } from "../design-system/components";
import { colors } from "../design-system/tokens";
import { mainNavigationHiddenByScreen, showsMainNavigation, subscribeMainNavigationHidden } from "./visibility";
import { NavigationInsetContext } from "./NavigationContext";
import { nativeTabs, tabForPath } from "./tabs";

export function AppNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (previous.current === pathname) return;
    recordNativeDiagnostic({ type: "navigation", surface: "app", action: "confirmed", outcome: "accepted", source: "native", ...(previous.current ? { from: diagnosticDestination(previous.current) } : {}), to: diagnosticDestination(pathname) });
    previous.current = pathname;
  }, [pathname]);
  const { lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboard(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboard(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const hiddenByScreen = useSyncExternalStore(subscribeMainNavigationHidden, mainNavigationHiddenByScreen, mainNavigationHiddenByScreen);
  const visible = showsMainNavigation(pathname) && !keyboard && !hiddenByScreen;
  const selected = tabForPath(pathname);
  const palette = colors;
  return <NavigationInsetContext.Provider value={visible}>
    <View style={styles.root}>
      <View style={styles.content}>{children}</View>
      {visible && <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {nativeTabs.map(s => <Pressable key={s.id} accessibilityRole="tab" accessibilityLabel={s.title[lang]} accessibilityState={{ selected: selected === s.id }} onPress={() => { recordNativeDiagnostic({ type: "navigation", surface: "app", action: "request", outcome: pathname === s.route ? "noop" : "accepted", source: "native", from: diagnosticDestination(pathname), to: diagnosticDestination(s.route) }); if (pathname !== s.route) router.replace(s.route as Href); }} style={({ pressed }) => [styles.tab, selected === s.id && styles.selected, pressed && styles.pressed]}>
          <Icon name={s.icon as IconName} size={24} color={selected === s.id ? palette.accentCyan : palette.textSecondary} />
          <Text style={[styles.label, selected === s.id && styles.activeLabel, { color: selected === s.id ? palette.accentCyan : palette.textSecondary }]} numberOfLines={2} maxFontSizeMultiplier={1.3}>{s.title[lang]}</Text>
        </Pressable>)}
      </View>}
    </View>
  </NavigationInsetContext.Provider>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { flex: 1 },
  bar: { flexDirection: "row", paddingTop: 6, paddingHorizontal: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(18, 50, 71, 0.12)", backgroundColor: colors.surfaceRaised },
  tab: { flex: 1, minHeight: 54, paddingVertical: 6, paddingHorizontal: 2, alignItems: "center", gap: 4, borderRadius: 12 },
  selected: {},
  pressed: { backgroundColor: colors.bgCardHover },
  label: { fontSize: 11, lineHeight: 14, textAlign: "center", color: colors.textSecondary, fontWeight: "500" },
  activeLabel: { color: colors.accentCyan, fontWeight: "700" },
});
