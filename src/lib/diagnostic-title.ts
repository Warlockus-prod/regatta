import type { Lang, LocalizedText } from "./languages";
export const diagnosticTitle: LocalizedText = { ru: "Диагностика", en: "Diagnostics", pl: "Diagnostyka", es: "Diagnóstico", fr: "Diagnostic", de: "Diagnose", it: "Diagnostica" };
export function diagnosticText(value: LocalizedText, lang: Lang): string { return value[lang] ?? value.en; }
