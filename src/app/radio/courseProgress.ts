import { SCENARIO_IDS, SRC_QUESTION_IDS, THEORY_CHAPTER_IDS } from "./courseIds";
import { loadQuestionProgress } from "./questionProgress";

// Counts against id lists, not the data itself: the hub is the course's front
// page and has no business downloading the question bank to print "40/324".

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
    ? theoryRaw.filter((id) => THEORY_CHAPTER_IDS.includes(id)).length
    : 0;

  const questionProgress = loadQuestionProgress();
  const questionsSeen = SRC_QUESTION_IDS.filter(
    (id) => (questionProgress[id]?.seen ?? 0) > 0,
  ).length;
  const questionsMastered = SRC_QUESTION_IDS.filter(
    (id) => (questionProgress[id]?.streak ?? 0) >= 2,
  ).length;

  const simulatorRaw = readJson(SIMULATOR_KEY);
  const simulatorProgress = simulatorRaw && typeof simulatorRaw === "object"
    ? simulatorRaw as Record<string, { best?: number }>
    : {};
  const scenariosPassed = SCENARIO_IDS.filter(
    (id) => (simulatorProgress[id]?.best ?? 0) >= 60,
  ).length;

  const guideRaw = readJson(GUIDE_KEY);
  const guide = guideRaw && typeof guideRaw === "object"
    ? guideRaw as Record<string, number>
    : {};
  const guideCompleted = Math.max(guide.M330 ?? 0, guide.M323 ?? 0);
  const guideTotal = 15;

  const theoryRatio = theoryCompleted / THEORY_CHAPTER_IDS.length;
  const questionRatio = questionsMastered / SRC_QUESTION_IDS.length;
  const scenarioRatio = scenariosPassed / SCENARIO_IDS.length;
  const guideRatio = Math.min(guideCompleted / guideTotal, 1);
  const overallPercent = Math.round(
    (theoryRatio * 0.35 + questionRatio * 0.25 + scenarioRatio * 0.3 + guideRatio * 0.1) * 100,
  );

  return {
    theoryCompleted,
    theoryTotal: THEORY_CHAPTER_IDS.length,
    questionsMastered,
    questionsSeen,
    questionsTotal: SRC_QUESTION_IDS.length,
    scenariosPassed,
    scenariosTotal: SCENARIO_IDS.length,
    guideCompleted,
    guideTotal,
    overallPercent,
  };
}
