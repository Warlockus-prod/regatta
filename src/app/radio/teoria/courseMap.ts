const questionId = (part: 1 | 2, number: number) => `src-${part}-${number}`;

const range = (part: 1 | 2, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => questionId(part, from + index));

const combine = (...groups: string[][]) => [...new Set(groups.flat())];

export const THEORY_ORDER = [
  "system",
  "horizon",
  "power",
  "controls",
  "channels",
  "identity",
  "routine",
  "smcp",
  "dsc",
  "priority",
  "mayday",
  "receive",
  "navtex",
  "epirb",
  "sart",
  "ais-sart",
  "gmdss",
  "world",
] as const;

export type TheoryChapterId = (typeof THEORY_ORDER)[number];

export const CHAPTER_QUESTION_IDS: Record<TheoryChapterId, string[]> = {
  system: combine(
    [questionId(1, 1), questionId(1, 3), questionId(1, 4)],
    range(1, 24, 29),
    range(2, 1, 17),
  ),
  horizon: combine(range(1, 5, 7), range(2, 102, 111), range(2, 138, 150)),
  power: combine(range(2, 117, 127), range(2, 135, 137)),
  controls: combine(range(1, 78, 84), range(2, 112, 116)),
  channels: combine(range(1, 9, 20), range(1, 69, 77)),
  identity: combine(
    [questionId(1, 8)],
    range(1, 21, 23),
    [questionId(1, 30), questionId(1, 85)],
    range(1, 109, 114),
  ),
  routine: combine([questionId(1, 2)], range(1, 86, 108)),
  smcp: range(1, 115, 174),
  dsc: combine(range(1, 31, 39), [questionId(1, 58)], range(2, 18, 29)),
  priority: combine(range(1, 47, 57), range(1, 65, 68)),
  mayday: combine(
    [questionId(1, 40)],
    range(1, 59, 61),
    [questionId(1, 64)],
    range(1, 81, 84),
  ),
  receive: combine(range(1, 34, 46), range(1, 62, 64)),
  navtex: combine(range(2, 30, 56), [questionId(2, 149)]),
  epirb: combine(range(2, 57, 83), [questionId(2, 137)]),
  sart: combine(range(2, 84, 101), [questionId(2, 136)]),
  "ais-sart": combine(range(2, 128, 135)),
  gmdss: range(2, 1, 17),
  world: combine([questionId(1, 77)], range(1, 109, 114)),
};

export const ALL_MAPPED_QUESTION_IDS = [
  ...new Set(THEORY_ORDER.flatMap((chapterId) => CHAPTER_QUESTION_IDS[chapterId])),
];

export function chapterForQuestion(questionIdValue: string): TheoryChapterId | null {
  return THEORY_ORDER.find((chapterId) =>
    CHAPTER_QUESTION_IDS[chapterId].includes(questionIdValue),
  ) ?? null;
}

export function theoryHrefForQuestion(questionIdValue: string): string {
  const chapterId = chapterForQuestion(questionIdValue);
  return chapterId ? `/radio/teoria#${chapterId}` : "/radio/teoria";
}
