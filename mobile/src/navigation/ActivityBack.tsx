import { useRouter, type Href } from "expo-router";
import { Pressable } from "react-native";
import { Text } from "../design-system/components/Text";
import { colors } from "../design-system/tokens";
import { useI18n } from "../i18n/context";
import { sectionForPath } from "../../../src/lib/product/catalog";

export function activityHubForRoute(routeName: string): Href {
  const path = `/${routeName.replace(/(^|\/)index$/, "").replace(/^\//, "")}`;
  const section = sectionForPath(path, "native");
  return section === "home" ? "/" : section === "learn" ? "/learn" : section === "race" ? "/race" : section === "practice" ? "/simulators" : "/menu";
}

/** An activity can also be opened by a deep link, without a native back stack. */
export function ActivityBack({ fallback, tintColor = colors.accentCyan }: { fallback: Href; tintColor?: string }) {
  const router = useRouter();
  const { tp } = useI18n();
  const label = tp("Назад", "Back", "Wróć", { es: "Volver", fr: "Retour", de: "Zurück", it: "Indietro" });
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    onPress={() => { if (router.canGoBack()) router.back(); else router.replace(fallback); }}
    style={{ minHeight: 44, minWidth: 44, justifyContent: "center", paddingRight: 12 }}>
    <Text style={{ color: tintColor, fontSize: 16 }}>‹ {label}</Text>
  </Pressable>;
}
