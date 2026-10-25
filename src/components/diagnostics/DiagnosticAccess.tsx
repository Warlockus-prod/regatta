'use client';
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { diagnosticTitle, diagnosticText } from "@/lib/diagnostic-title";
import { initializeDiagnosticBridge } from "@/lib/diagnostics-bridge";
import DiagnosticPanel, { loadDiagnosticPanel } from "./DiagnosticPanelLoader";
/** Lives inside the existing dock; never overlays the boat or instrument. */
export default function DiagnosticAccess() {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  useEffect(() => { initializeDiagnosticBridge(); void loadDiagnosticPanel().catch(() => {}); }, []);
  return <details onToggle={event => setOpen(event.currentTarget.open)} className="w-full rounded-lg border border-[var(--border-subtle)] p-3">
    <summary className="flex min-h-[44px] cursor-pointer items-center">{diagnosticText(diagnosticTitle, lang)}</summary>
    {open && <DiagnosticPanel />}
  </details>;
}
