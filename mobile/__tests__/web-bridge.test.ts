import { parseExamFinished } from '../src/analytics/web-bridge';

describe('parseExamFinished (exam result relayed from the embedded web page)', () => {
  const msg = (o: Record<string, unknown>) => JSON.stringify({ type: 'exam-finished', ...o });

  it('accepts a sternik result', () => {
    expect(parseExamFinished(msg({ base: 'sternik', score: 66, total: 75, passed: true }))).toEqual({
      base: 'sternik', score: 66, total: 75, passed: true,
    });
  });

  it('accepts an SRC result and drops extra fields', () => {
    expect(parseExamFinished(msg({ base: 'src', score: 4, total: 10, passed: false, name: 'x' }))).toEqual({
      base: 'src', score: 4, total: 10, passed: false,
    });
  });

  it.each([
    ['not JSON', 'ready'],
    ['another message type', JSON.stringify({ type: 'exam-dirty', dirty: true })],
    ['unknown base', msg({ base: 'ppl', score: 1, total: 2, passed: true })],
    ['score above total', msg({ base: 'src', score: 11, total: 10, passed: true })],
    ['fractional score', msg({ base: 'src', score: 1.5, total: 10, passed: true })],
    ['string passed', msg({ base: 'src', score: 5, total: 10, passed: 'yes' })],
    ['zero total', msg({ base: 'src', score: 0, total: 0, passed: false })],
    ['JSON null', 'null'],
  ])('rejects %s', (_label, data) => {
    expect(parseExamFinished(data)).toBeNull();
  });
});
