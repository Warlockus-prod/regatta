export const RADIO_STARTUP_TIMEOUT_MS = 15000;
const HISTORY_LIMIT = 8;
const WK_DOMAINS = ["WKErrorDomain", "WebKitErrorDomain", "NSURLErrorDomain", "NSCocoaErrorDomain"] as const;

export type RadioStartupStage = "storage" | "bootstrap" | "webview" | "ready";
export type RadioStartupCode = "SRC-S01" | "SRC-S02" | "SRC-S03" | "SRC-B01" | "SRC-W01" | "SRC-W02" | "SRC-W03";
export interface RadioStartupDiagnostic {
  code: RadioStartupCode;
  stage: RadioStartupStage;
  wkDomain?: typeof WK_DOMAINS[number] | "other";
  wkCode?: number;
}

/** Session-only support history. Never retain storage, URLs, error messages or stacks. */
export function createRadioStartupDiagnostics() {
  let sequence = 0;
  let current: { id: number; stage: RadioStartupStage; failed: boolean } | null = null;
  const history: RadioStartupDiagnostic[] = [];
  const accepts = (id: number) => current?.id === id && !current.failed;
  const fail = (id: number, code: RadioStartupCode, event?: { domain?: unknown; code?: unknown }): RadioStartupDiagnostic | null => {
    if (!accepts(id) || !current) return null;
    const diagnostic: RadioStartupDiagnostic = { code, stage: current.stage };
    if (code === "SRC-W01" && event) {
      if (typeof event.domain === "string") {
        diagnostic.wkDomain = event.domain.length <= 32 && (WK_DOMAINS as readonly string[]).includes(event.domain)
          ? event.domain as typeof WK_DOMAINS[number] : "other";
      }
      if (typeof event.code === "number" && Number.isInteger(event.code) && Math.abs(event.code) <= 100000) diagnostic.wkCode = event.code;
    }
    current.failed = true;
    history.push(diagnostic);
    if (history.length > HISTORY_LIMIT) history.shift();
    return { ...diagnostic };
  };
  return {
    begin() {
      current = { id: ++sequence, stage: "storage", failed: false };
      return current.id;
    },
    invalidate(id?: number) { if (id === undefined || current?.id === id) current = null; },
    accepts,
    storageLoaded(id: number) {
      if (!accepts(id) || current?.stage !== "storage") return false;
      current.stage = "bootstrap";
      return true;
    },
    webViewStarted(id: number) {
      if (!accepts(id) || !current || current.stage === "ready") return false;
      current.stage = "webview";
      return true;
    },
    ready(id: number) {
      if (!accepts(id) || !current || current.stage === "storage") return false;
      current.stage = "ready";
      return true;
    },
    storageError(id: number, error: unknown) {
      return fail(id, error instanceof SyntaxError || (error instanceof Error && error.message === "invalid-radio-storage") ? "SRC-S01" : "SRC-S02");
    },
    timeout(id: number) {
      if (!accepts(id) || !current || current.stage === "ready") return null;
      return fail(id, current.stage === "storage" ? "SRC-S03" : current.stage === "bootstrap" ? "SRC-B01" : "SRC-W02");
    },
    webViewError: (id: number, event: { domain?: unknown; code?: unknown }) => fail(id, "SRC-W01", event),
    processTerminated: (id: number) => fail(id, "SRC-W03"),
    history: () => history.map(item => ({ ...item })),
  };
}
