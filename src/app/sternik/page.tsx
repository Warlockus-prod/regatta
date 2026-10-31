import { STERNIK_BANK, STERNIK_CATEGORIES, STERNIK_EXAM, type SternikCatId } from '@/data/sternik';
import SternikHub, { type SternikHubData } from './SternikHub';

// ============================================================================
// /sternik - hub. A server component on purpose: the hub only needs counts and
// an id-to-category map to draw the learner's progress, and importing the
// 879-question bank into a client component shipped it (about 175 KB gzip) to
// every first visit of the course. The bank stays on the server; the client
// gets the numbers. The trainer and the exam load the questions at run time
// from the versioned JSON (scripts/build-sternik-bank.mjs, bank.ts).
// ============================================================================

function hubData(): SternikHubData {
  const catTotals = Object.fromEntries(STERNIK_CATEGORIES.map((c) => [c.id, 0])) as Record<SternikCatId, number>;
  const idCat: Record<string, SternikCatId> = {};
  for (const q of STERNIK_BANK) {
    catTotals[q.cat] += 1;
    idCat[q.id] = q.cat;
  }
  const examPoolSize = STERNIK_BANK.filter((q) => q.options.length === 3).length;
  return {
    bankSize: STERNIK_BANK.length,
    examPoolSize,
    categories: STERNIK_CATEGORIES,
    catTotals,
    idCat,
    exam: {
      questions: STERNIK_EXAM.questions,
      minutes: STERNIK_EXAM.minutes,
      passCorrect: STERNIK_EXAM.passCorrect,
      passPct: STERNIK_EXAM.passPct,
    },
  };
}

export default function SternikHubPage() {
  return <SternikHub data={hubData()} />;
}
