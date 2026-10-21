import { DiagramStates } from "../design-system/components";
import { useI18n } from "../i18n/context";
import { renderScene, type SceneId, type SceneState } from "../lessons/graphics/drawings";
import { lessonCopy } from "../lessons/pilots";
import { foundationGuides } from "./learning-guide";

export function FoundationScene({ id, selected, onSelect }: { id: string; selected: SceneState; onSelect: (value: SceneState) => void }) {
  const { lang } = useI18n();
  const guide = foundationGuides[id];
  if (!guide) return null;
  return <DiagramStates
    svg={i => renderScene(id as SceneId, i as SceneState)} aspectRatio={900 / 560}
    states={guide.states.map((label, i) => ({ label: label[lang], note: guide.notes[i][lang], description: guide.notes[i][lang] }))}
    stateGroup={lessonCopy.explanation[lang]} selected={selected} onSelect={i => onSelect(i as SceneState)}
    legend={guide.legend.map(label => label[lang])} legendFollowsState={id === "tacking" || id === "jibing"}
    limit={guide.limit[lang]} labels={{ legend: lessonCopy.legend[lang], limit: lessonCopy.limit[lang] }}
  />;
}
