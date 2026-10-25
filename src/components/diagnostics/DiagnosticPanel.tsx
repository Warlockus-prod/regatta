'use client';

import { useState, useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n";
import { diagnosticCopy as copy, diagnosticOutcomeCopy, diagnosticText } from "@/lib/diagnostic-copy";
import { EMPTY_DIAGNOSTIC_SNAPSHOT, type DiagnosticEntry } from "@/lib/diagnostics";
import { getWebDiagnosticJournal, flushWebDiagnostics } from "@/lib/diagnostics-web";

const button = "min-h-[44px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 text-sm";
const inactive = () => () => {};
export function diagnosticDetail(entry: DiagnosticEntry): string {
  return Object.entries(entry.event).filter(([key]) => !["type", "surface", "outcome"].includes(key)).map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
}
export default function DiagnosticPanel({ active = true }: { active?: boolean }) {
  const { lang } = useI18n();
  const native = useSyncExternalStore(inactive, () => Boolean((window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView), () => false);
  const journal = getWebDiagnosticJournal();
  const snapshot = useSyncExternalStore(active ? journal.subscribe : inactive, active ? journal.snapshot : () => EMPTY_DIAGNOSTIC_SNAPSHOT, () => EMPTY_DIAGNOSTIC_SNAPSHOT);
  const [failedOnly, setFailedOnly] = useState(false);
  const [copyState, setCopyState] = useState<"copied" | "copyFailed" | null>(null);
  const text = (key: keyof typeof copy) => diagnosticText(copy[key], lang);
  const entries = snapshot.entries.filter(entry => !failedOnly || ["failed", "rejected"].includes(entry.event.outcome));
  return <section aria-label={text("title")} data-testid="diagnostic-panel" className="space-y-3 text-sm">
    <h3 className="font-semibold">{text("title")}</h3>
    <p style={{ color: "var(--text-secondary)" }}>{text("intro")}</p>
    {native && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{text("scope")}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" className={button} aria-pressed={!failedOnly} onClick={() => setFailedOnly(false)}>{text("all")}</button>
      <button type="button" className={button} aria-pressed={failedOnly} onClick={() => setFailedOnly(true)}>{text("failures")}</button>
      <button type="button" className={button} onClick={() => { journal.clear(); flushWebDiagnostics(); setCopyState(null); }}>{text("clear")}</button>
      {!native && <button type="button" className={button} onClick={() => { void (async () => {
        try { if (!navigator.clipboard?.writeText) throw new Error("clipboard-unavailable"); await navigator.clipboard.writeText(JSON.stringify(journal.snapshot(), null, 2)); setCopyState("copied"); }
        catch { setCopyState("copyFailed"); }
      })(); }}>{text("copy")}</button>}
    </div>
    {copyState && <p role="status">{text(copyState)}</p>}
    {snapshot.dropped > 0 && <p className="text-xs">{text("dropped")}: {snapshot.dropped}</p>}
    {!entries.length ? <p>{text("empty")}</p> : <ol className="space-y-2" aria-label={text("title")}>
      {[...entries].reverse().map(entry => <li key={`${entry.session}-${entry.seq}`} className="rounded-lg border border-[var(--border-subtle)] p-3">
        <div className="flex flex-wrap justify-between gap-2"><span>{text("session")} {entry.session} · {(entry.elapsedMs / 1000).toFixed(1)}s {entry.count > 1 && `×${entry.count}`}</span><strong style={{ color: entry.event.outcome === "failed" ? "var(--danger)" : "var(--text-primary)" }}>{diagnosticText(diagnosticOutcomeCopy[entry.event.outcome], lang)}</strong></div>
        <p className="break-words font-mono text-xs">{entry.event.surface} / {entry.event.type}</p>
        <p className="break-words text-xs" style={{ color: "var(--text-secondary)" }}>{diagnosticDetail(entry)}</p>
      </li>)}
    </ol>}
  </section>;
}
