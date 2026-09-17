import { useLocalSearchParams } from "expo-router";
import { SailingCourseScreen } from "../../../src/sailing/SailingCourseScreen";

export default function Page() {
  const { lesson } = useLocalSearchParams<{ lesson: string }>();
  const id = Array.isArray(lesson) ? lesson[0] : lesson;
  return <SailingCourseScreen key={id} lessonId={id} />;
}
