'use client';
import { useI18n } from "@/lib/i18n";
import { diagnosticTitle, diagnosticText } from "@/lib/diagnostic-title";
import DiagnosticPanel from "@/components/diagnostics/DiagnosticPanelLoader";
export default function DiagnosticsPage() {
  const { lang } = useI18n();
  return <div className="mx-auto w-full max-w-5xl space-y-5 px-5 py-8"><h1 className="text-2xl font-semibold">{diagnosticText(diagnosticTitle, lang)}</h1><DiagnosticPanel /></div>;
}
