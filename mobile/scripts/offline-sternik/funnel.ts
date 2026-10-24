import type { ExamFinish } from "../../../src/lib/funnel";

// Native analytics owns consent. The local course never posts HTTP events.
export function trackExamStart() {}
export function trackExamFinish(result: ExamFinish) {
  window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "exam-finished", base: result.base, score: result.score, total: result.total, passed: result.passed }));
}
