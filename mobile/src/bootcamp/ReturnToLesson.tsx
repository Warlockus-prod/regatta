import { useRouter } from "expo-router";
import { HeaderBackButton } from "../navigation/HeaderBackButton";
import { useI18n } from "../i18n/context";
import { bootcampLessons } from "../data";
import { colors } from "../design-system/tokens";
import { foundationCopy } from "./learning-guide";

export function ReturnToLesson({ id, tintColor }: { id: string; tintColor?: string }) {
  const router = useRouter();
  const { tp, lang } = useI18n();
  const order = bootcampLessons.find(l => l.id === id)?.order;
  return <HeaderBackButton accessibilityLabel={foundationCopy.return[lang]} tintColor={tintColor ?? colors.accentCyan}
    label={`${tp("Урок", "Lesson", "Lekcja", { es: "Lección", fr: "Leçon", de: "Lektion", it: "Lezione" })} ${order ?? ""}`.trim()}
    onPress={() => router.dismissTo({ pathname: "/bootcamp/[id]", params: { id } })} />;
}
