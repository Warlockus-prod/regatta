import { createRadioStartupDiagnostics } from "../src/radio/startup-diagnostics";

it("times out a stalled read, refuses its late result and starts an independent retry", () => {
  const startup = createRadioStartupDiagnostics();
  const first = startup.begin();
  expect(startup.timeout(first)).toEqual({ code: "SRC-S03", stage: "storage" });
  expect(startup.storageLoaded(first)).toBe(false);
  expect(startup.ready(first)).toBe(false);
  const second = startup.begin();
  expect(startup.storageError(first, new Error("late"))).toBeNull();
  expect(startup.storageLoaded(second)).toBe(true);
  expect(startup.webViewStarted(second)).toBe(true);
  expect(startup.ready(second)).toBe(true);
  expect(startup.timeout(second)).toBeNull();
});

it("distinguishes native bootstrap, WebView and malformed-storage failures", () => {
  const startup = createRadioStartupDiagnostics();
  let id = startup.begin();
  startup.storageLoaded(id);
  expect(startup.timeout(id)).toEqual({ code: "SRC-B01", stage: "bootstrap" });
  id = startup.begin();
  startup.storageLoaded(id);
  startup.webViewStarted(id);
  expect(startup.timeout(id)).toEqual({ code: "SRC-W02", stage: "webview" });
  id = startup.begin();
  expect(startup.storageError(id, new SyntaxError("private raw data"))).toEqual({ code: "SRC-S01", stage: "storage" });
  id = startup.begin();
  expect(startup.storageError(id, new Error("invalid-radio-storage"))?.code).toBe("SRC-S01");
  id = startup.begin();
  expect(startup.storageError(id, new Error("private file path"))).toEqual({ code: "SRC-S02", stage: "storage" });
  expect(JSON.stringify(startup.history())).not.toMatch(/private|path|stack|message/);
});

it("retains only allowlisted domains and bounded integer WK codes", () => {
  const startup = createRadioStartupDiagnostics();
  let id = startup.begin();
  startup.storageLoaded(id);
  startup.webViewStarted(id);
  expect(startup.webViewError(id, { domain: "NSURLErrorDomain", code: -1100 })).toEqual({ code: "SRC-W01", stage: "webview", wkDomain: "NSURLErrorDomain", wkCode: -1100 });
  id = startup.begin();
  expect(startup.webViewError(id, { domain: "private-url-token".repeat(100), code: Infinity })).toEqual({ code: "SRC-W01", stage: "storage", wkDomain: "other" });
  id = startup.begin();
  expect(startup.webViewError(id, { domain: "unexpected", code: 100001 })).toEqual({ code: "SRC-W01", stage: "storage", wkDomain: "other" });
  id = startup.begin();
  expect(startup.webViewError(id, { domain: {}, code: 1.5 })).toEqual({ code: "SRC-W01", stage: "storage" });
  expect(JSON.stringify(startup.history())).not.toMatch(/private|token|unexpected/);
});

it("classifies a terminated ready process once and rejects callbacks after cleanup", () => {
  const startup = createRadioStartupDiagnostics();
  const id = startup.begin();
  startup.storageLoaded(id);
  startup.ready(id);
  expect(startup.processTerminated(id)).toEqual({ code: "SRC-W03", stage: "ready" });
  expect(startup.ready(id)).toBe(false);
  expect(startup.processTerminated(id)).toBeNull();
  const next = startup.begin();
  startup.invalidate(id);
  expect(startup.accepts(next)).toBe(true);
  startup.invalidate();
  expect(startup.accepts(next)).toBe(false);
  expect(startup.webViewError(next, { code: 1 })).toBeNull();
});

it("bounds the session-only support history to eight independent safe entries", () => {
  const startup = createRadioStartupDiagnostics();
  for (let i = 0; i < 20; i++) startup.storageError(startup.begin(), new Error("disk"));
  const history = startup.history();
  expect(history).toHaveLength(8);
  history[0].code = "SRC-W03";
  history.pop();
  expect(startup.history()).toHaveLength(8);
  expect(startup.history()[0].code).toBe("SRC-S02");
});
