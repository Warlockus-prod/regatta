import type { DiagnosticInput, DiagnosticSurface } from "./diagnostics";
import { recordWebDiagnostic } from "./diagnostics-web";

type Control = Extract<DiagnosticInput, { type: "control.change" }>;
type Preference = Extract<DiagnosticInput, { type: "control.preferences" }>;

/** Instrumentation never owns, returns or interrupts the actual command. */
export function recordDiagnostic(input: DiagnosticInput): void {
  try { recordWebDiagnostic(input); } catch { /* Controls must work even if instrumentation fails. */ }
}
export function recordControlChange<K extends Control["control"]>(surface: DiagnosticSurface, control: K,
  value: Extract<Control, { control: K }>["value"], previous?: Extract<Control, { control: K }>["value"]): void {
  const unchanged = previous !== undefined && Object.is(value, previous);
  recordDiagnostic({ type: "control.change", surface, control, value, ...(previous === undefined ? {} : { previous }),
    outcome: unchanged ? "noop" : "accepted", ...(unchanged ? { reason: "unchanged" } : {}) } as Control);
}
export function recordPreferenceChange<K extends Preference["preference"]>(surface: DiagnosticSurface, preference: K,
  value: Extract<Preference, { preference: K }>["value"], previous: Extract<Preference, { preference: K }>["value"], changed = !Object.is(value, previous)): void {
  recordDiagnostic({ type: "control.preferences", surface, preference, value, previous,
    outcome: changed ? "accepted" : "noop", ...(changed ? {} : { reason: "unchanged" }) } as Preference);
}
