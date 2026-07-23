import { SRC_BANK } from "@/data/src-radio";
import { SCENARIOS } from "./symulator/scenarios";
import { THEORY_CHAPTERS } from "./teoria/courseData";
import { loadQuestionProgress } from "./questionProgress";

const THEORY_KEY = "radio.src.theory.progress.v2";
const SIMULATOR_KEY = "sternik.radio.progress.v1";
const GUIDE_KEY = "sternik.radio.guide.v2";

export interface RadioCourseProgress {
  theoryCompleted: number;
  theoryTotal: number;
  questionsMastered: number;
  questionsSeen: number;
  questionsTotal: number;
  scenariosPassed: number;
  scenariosTotal: number;
  guideCompleted: number;
  guideTotal: number;
  overallPercent: number;
}

function readJson(key: string): unknown {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

export function loadRadioCourseProgress(): RadioCourseProgress {
  const theoryRaw = readJson(THEORY_KEY);
  const theoryCompleted = Array.isArray(theoryRaw)
    ? theoryRaw.filter((id) => THEORY_CHAPTERS.some((chapter) => chapter.id === id)).length
    : 0;

  const questionProgress = loadQuestionProgress();
  const questionsSeen = SRC_BANK.filter(
    (question) => (questionProgress[question.id]?.seen ?? 0) > 0,
  ).length;
  const questionsMastered = SRC_BANK.filter(
    (question) => (questionProgress[question.id]?.streak ?? 0) >= 2,
  ).length;

  const simulatorRaw = readJson(SIMULATOR_KEY);
  const simulatorProgress = simulatorRaw && typeof simulatorRaw === "object"
    ? simulatorRaw as Record<string, { best?: number }>
    : {};
  const scenariosPassed = SCENARIOS.filter(
    (scenario) => (simulatorProgress[scenario.id]?.best ?? 0) >= 60,
  ).length;

  const guideRaw = readJson(GUIDE_KEY);
  const guide = guideRaw && typeof guideRaw === "object"
    ? guideRaw as Record<string, number>
    : {};
  const guideCompleted = Math.max(guide.M330 ?? 0, guide.M323 ?? 0);
  const guideTotal = 15;

  const theoryRatio = theoryCompleted / THEORY_CHAPTERS.length;
  const questionRatio = questionsMastered / SRC_BANK.length;
  const scenarioRatio = scenariosPassed / SCENARIOS.length;
  const guideRatio = Math.min(guideCompleted / guideTotal, 1);
  const overallPercent = Math.round(
    (theoryRatio * 0.35 + questionRatio * 0.25 + scenarioRatio * 0.3 + guideRatio * 0.1) * 100,
  );

  return {
    theoryCompleted,
    theoryTotal: THEORY_CHAPTERS.length,
    questionsMastered,
    questionsSeen,
    questionsTotal: SRC_BANK.length,
    scenariosPassed,
    scenariosTotal: SCENARIOS.length,
    guideCompleted,
    guideTotal,
    overallPercent,
  };
}
