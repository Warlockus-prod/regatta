import { useRouter } from "expo-router";
import { Pressable } from "react-native";
import { Text } from "../design-system/components/Text";
import { useI18n } from "../i18n/context";
import { bootcampLessons } from "../data";
import { colors } from "../design-system/tokens";
import { foundationCopy } from "./learning-guide";

export function ReturnToLesson({ id, tintColor }: { id: string; tintColor?: string }) {
  const router = useRouter();
  const { tp, lang } = useI18n();
  const order = bootcampLessons.find(l => l.id === id)?.order;
  return <Pressable accessibilityRole="button" accessibilityLabel={foundationCopy.return[lang]} onPress={() => router.dismissTo({ pathname: "/bootcamp/[id]", params: { id } })} style={{ minHeight: 44, justifyContent: "center", paddingRight: 12 }}>
    <Text style={{ color: tintColor ?? colors.accentCyan, fontSize: 15 }}>‹ {tp("Урок", "Lesson", "Lekcja", { es: "Lección", fr: "Leçon", de: "Lektion", it: "Lezione" })} {order}</Text>
  </Pressable>;
}
