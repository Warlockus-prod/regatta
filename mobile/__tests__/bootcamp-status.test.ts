import { isLessonPassed, lessonStatus, nextBootcampLesson, passedLessonIds, type BootcampEvidence } from '../src/bootcamp/status';
import { bootcampLessons } from '../src/data';
import { getQuizForLesson, hasQuiz } from '../src/bootcamp/quiz-data';

const evidence = (over: Partial<BootcampEvidence> = {}): BootcampEvidence => ({
  viewedIds: new Set(),
  quizResults: {},
  doneIds: new Set(),
  lastViewedLessonId: null,
  ...over,
});
const answered = (score: number, total: number) => ({ score, total, answeredAt: 1 });

describe('lesson status: viewed is not passed', () => {
  it('opening the practice and leaving leaves the lesson viewed, not passed', () => {
    const e = evidence({ viewedIds: new Set(['wind-direction']) });
    expect(lessonStatus('wind-direction', e)).toBe('viewed');
    expect(isLessonPassed('wind-direction', e)).toBe(false);
  });

  it('a failed check is viewed, a passed check is passed', () => {
    const total = getQuizForLesson('wind-direction').length;
    expect(total).toBeGreaterThan(0);
    expect(lessonStatus('wind-direction', evidence({ quizResults: { 'wind-direction': answered(0, total) } }))).toBe('viewed');
    expect(lessonStatus('wind-direction', evidence({ quizResults: { 'wind-direction': answered(total, total) } }))).toBe('passed');
  });

  it('every bootcamp lesson has a check, so passing always needs a passed check', () => {
    for (const lesson of bootcampLessons) expect(hasQuiz(lesson.id)).toBe(true);
  });

  it('a lesson without a check (none today) would pass only by the explicit mark', () => {
    const id = 'future-lesson-without-check';
    expect(hasQuiz(id)).toBe(false);
    expect(lessonStatus(id, evidence({ viewedIds: new Set([id]) }))).toBe('viewed');
    expect(lessonStatus(id, evidence({ doneIds: new Set([id]) }))).toBe('passed');
  });

  it('a done mark does not pass a lesson that has a check', () => {
    expect(isLessonPassed('wind-direction', evidence({ doneIds: new Set(['wind-direction']) }))).toBe(false);
  });

  it('the last opened lesson counts as viewed', () => {
    expect(lessonStatus('points-of-sail', evidence({ lastViewedLessonId: 'points-of-sail' }))).toBe('viewed');
    expect(lessonStatus('points-of-sail', evidence())).toBe('new');
  });

  it('old saves that marked every lesson "completed" keep their IDs as viewed, none passed', () => {
    const all = new Set(bootcampLessons.map((l) => l.id));
    const e = evidence({ viewedIds: all });
    expect(passedLessonIds(e).size).toBe(0);
    expect(nextBootcampLesson(e)?.id).toBe('wind-direction');
    expect(e.viewedIds.size).toBe(bootcampLessons.length);
  });
});

describe('next bootcamp lesson', () => {
  it('prefers the last opened lesson while it is not passed', () => {
    expect(nextBootcampLesson(evidence({ lastViewedLessonId: 'how-sail-works' }))?.id).toBe('how-sail-works');
  });

  it('ignores an unknown last opened ID', () => {
    expect(nextBootcampLesson(evidence({ lastViewedLessonId: 'removed-lesson' }))?.id).toBe('wind-direction');
  });

  it('is null when every lesson is passed', () => {
    const quizResults = Object.fromEntries(bootcampLessons.filter((l) => hasQuiz(l.id)).map((l) => [l.id, answered(9, 9)]));
    const doneIds = new Set(bootcampLessons.filter((l) => !hasQuiz(l.id)).map((l) => l.id));
    expect(nextBootcampLesson(evidence({ quizResults, doneIds }))).toBeNull();
  });
});
