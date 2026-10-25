import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMainTrim } from "../../../sailing-lab/rig/main-trim";
import { newTrimStudy } from "../../../sailing-lab/lessons/trim-study";
import { newTrimAssessment } from "../../../sailing-lab/lessons/trim-assessment";
import { DEFAULT_UI, FREE_TRAINER_UI, type SimulationModel, type TpFn } from "../shared";
import { TrimStudyGoal, TrimStudyPanel } from "../panels/TrimStudyPanel";
import { TrimAssessmentGoal, TrimAssessmentPanel } from "../panels/TrimAssessmentPanel";
import { MainTrimPod } from "./MainTrimPod";
import { ViewPod } from "./ViewPod";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());
const tp: TpFn = (_ru, en) => en;
const callbacks = () => ({ start: vi.fn(), cancel: vi.fn(), record: vi.fn(), answer: vi.fn() });
function visibleButtons(node: React.ReactNode): React.ReactElement<{ onClick(): void; children: React.ReactNode }>[] {
  if (!React.isValidElement<{ children?: React.ReactNode }>(node) || node.type === "details") return [];
  return [
    ...(node.type === "button" ? [node as React.ReactElement<{ onClick(): void; children: React.ReactNode }>] : []),
    ...React.Children.toArray(node.props.children).flatMap(visibleButtons),
  ];
}
const text = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);

describe("compact trim lesson controls and actions", () => {
  it("keeps all diagram views available beside the selected free 3D view", () => {
    const html = text(<ViewPod section="camera" ui={FREE_TRAINER_UI} setUi={vi.fn()} tp={tp} paused={false} togglePause={vi.fn()} applyOptimal={vi.fn()} resetAll={vi.fn()} setPreset={vi.fn()} />);
    expect(html).toMatch(/aria-pressed="true"[^>]*>3D<\/button>/);
    for (const label of ["Top", "Rear", "Side"]) expect(html).toContain(`>${label}</button>`);
  });
  it("places a current goal and both real line controls before full instructions", () => {
    const study = newTrimStudy();
    const mainTrim = { workingLength: 9, traveler: 0 };
    const rig = createMainTrim({ yaw: -15, rise: 0 }, mainTrim);
    const sim = { session: { mainTrim: rig } } as SimulationModel;
    const html = renderToStaticMarkup(<MainTrimPod ui={{ ...DEFAULT_UI, mainTrim }} setUi={vi.fn()} sim={sim} tp={tp}
      goal={<TrimStudyGoal study={study} tp={tp} />} studyActive>
      <TrimStudyPanel study={study} tp={tp} {...callbacks()} />
    </MainTrimPod>);
    const goal = html.indexOf('data-testid="trim-study-goal"');
    const primary = html.indexOf('data-testid="main-trim-primary"');
    const lesson = html.indexOf('aria-label="Experiment:');
    expect(goal).toBeGreaterThan(0); expect(primary).toBeGreaterThan(goal); expect(lesson).toBeGreaterThan(primary);
    const controls = html.slice(primary, lesson);
    expect(controls).toContain('min="6.4" max="32" step="0.1"');
    expect(controls).toContain('min="-0.8" max="0.8" step="0.05"');
    expect(controls.match(/height:44px/g)).toHaveLength(2);
    expect(controls).toContain("9.0 m"); expect(controls).toContain("0.00 m");
    expect(controls).not.toContain("Wait for stability, then record");
  });

  it("keeps record, explanation and completion outside collapsed study details", () => {
    const handlers = callbacks();
    for (const phase of ["baseline", "ease"] as const) {
      const tree = TrimStudyPanel({ study: { ...newTrimStudy(), phase }, tp, ...handlers });
      visibleButtons(tree).find(button => text(button.props.children) === "Record observation")!.props.onClick();
    }
    expect(handlers.record).toHaveBeenCalledTimes(2);
    const explain = TrimStudyPanel({ study: { ...newTrimStudy(), phase: "explain" }, tp, ...handlers });
    for (const button of visibleButtons(explain).filter(button => /camera|Mainsheet/.test(text(button.props.children)))) button.props.onClick();
    expect(handlers.answer.mock.calls).toEqual([["angle-only"], ["shape"]]);
    const complete = text(<TrimStudyPanel study={{ ...newTrimStudy(), phase: "complete" }} tp={tp} {...handlers} />);
    expect(complete.indexOf("Experiment complete.")).toBeLessThan(complete.indexOf("<details"));
    expect(complete).toContain("Instructions and observations");
  });

  it("retains independent assessment checks, both answers and full goal criteria", () => {
    const record = vi.fn(), answer = vi.fn(), restart = vi.fn(), close = vi.fn();
    const a = newTrimAssessment("depth");
    const perform = TrimAssessmentPanel({ assessment: { ...a, phase: "perform" }, lang: "en", record, answer, restart, close });
    visibleButtons(perform).find(button => text(button.props.children) === "Check result")!.props.onClick();
    expect(record).toHaveBeenCalledOnce();
    const explain = TrimAssessmentPanel({ assessment: { ...a, phase: "explain" }, lang: "en", record, answer, restart, close });
    for (const button of visibleButtons(explain).filter(button => /camera|outhaul/.test(text(button.props.children)))) button.props.onClick();
    expect(answer.mock.calls).toEqual([[false], [true]]);
    const html = text(perform);
    expect(html.indexOf("Check result")).toBeLessThan(html.indexOf("<details"));
    expect(html).toContain("Keep boom angle within 1° and twist within 0.5°");
    const goal = text(<TrimAssessmentGoal assessment={{ ...a, phase: "perform" }} lang="en" />);
    expect(goal).toContain("at least 15%"); expect(goal).toContain("within 0.5°");
  });
});
