import { DIAGNOSTIC_BATCH_MAX_EVENTS, serializeDiagnosticBatch, type DiagnosticInput } from "./diagnostics";
import { subscribeWebDiagnosticInput } from "./diagnostics-web";

type Host = Window & { ReactNativeWebView?: { postMessage(value: string): void } };
const owners = new WeakSet<Window>();
const flushers = new WeakMap<Window, () => void>();
/** Flush before a native exit can unmount the embedded page. */
export function flushDiagnosticBridge(): void {
  if (typeof window !== "undefined") flushers.get(window)?.();
}
/** Append validated local events to the native journal. No network or commands. */
export function initializeDiagnosticBridge(): void {
  if (typeof window === "undefined" || owners.has(window)) return;
  const owner = window as Host;
  if (!owner.ReactNativeWebView?.postMessage) return;
  owners.add(owner);
  let pending: DiagnosticInput[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    const events = pending; pending = [];
    if (!events.length) return;
    const serialized = serializeDiagnosticBatch(events);
    if (!serialized) return;
    try { owner.ReactNativeWebView?.postMessage(JSON.stringify({ type: "diagnostic-events", ...JSON.parse(serialized) })); }
    catch { /* A log transport failure must never interrupt the instrument. */ }
  };
  flushers.set(owner, flush);
  subscribeWebDiagnosticInput(input => {
    pending.push(input);
    if (pending.length >= DIAGNOSTIC_BATCH_MAX_EVENTS) flush();
    else if (timer === null) timer = setTimeout(flush, 400);
  });
  owner.addEventListener("pagehide", flush);
  owner.addEventListener("visibilitychange", () => { if (owner.document.visibilityState === "hidden") flush(); });
}
