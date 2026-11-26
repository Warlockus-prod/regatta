import { View } from "react-native";
import { SailShapeIllustration } from "./SailShapeIllustration";
import { foundationLessonVisuals } from "../../../src/data/sailing-visuals";
import { UI_TERMS } from "../../../src/lib/product/catalog";
import { spacing } from "../design-system/tokens";
import { SubjectPicture } from "../learning/SubjectVisuals";
import { DiagramStates } from "../design-system/components";
import { useI18n } from "../i18n/context";
import { renderScene, type SceneId, type SceneState } from "../lessons/graphics/drawings";
import { lessonCopy } from "../lessons/pilots";
import { foundationGuides } from "./learning-guide";

export function FoundationScene({ id, selected, onSelect }: { id: string; selected: SceneState; onSelect: (value: SceneState) => void }) {
  const { lang } = useI18n();
  const guide = foundationGuides[id];
  if (!guide) return null;
  const diagram = <DiagramStates
    svg={i => renderScene(id as SceneId, i as SceneState)} aspectRatio={900 / 560}
    states={guide.states.map((label, i) => ({ label: label[lang], note: guide.notes[i][lang], description: guide.notes[i][lang] }))}
    stateGroup={lessonCopy.explanation[lang]} selected={selected} onSelect={i => onSelect(i as SceneState)}
    legend={guide.legend.map(label => label[lang])} legendFollowsState={id === "tacking" || id === "jibing"}
    limit={guide.limit[lang]} labels={{ legend: lessonCopy.legend[lang], limit: lessonCopy.limit[lang] }}
  />;
  if (id === "how-sail-works") return <SailShapeIllustration>{diagram}</SailShapeIllustration>;
  // Package 32: the same subject in the 3D scene, under the lesson's drawing.
  return <View style={{ gap: spacing.sm }}>{diagram}<SubjectPicture visuals={foundationLessonVisuals(id)} name={guide.states[0][lang]} label={UI_TERMS.visualOnWater[lang]} /></View>;
}
