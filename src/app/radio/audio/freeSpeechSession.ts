export const FREE_SPEECH_MAX_ROWS = 8;
export const FREE_SPEECH_MAX_CHARACTERS = 1000;
export const FREE_SPEECH_HOLD_MS = 45_000;
export interface FreeTransmission { readonly id: number; readonly input: "voice" | "typed"; readonly text: string }

/** Private component state only. This never reads/writes storage, sends audio,
 * grades an answer or produces a diagnostic payload. */
export function appendFreeTransmission(rows: readonly FreeTransmission[], value: string,
  input: FreeTransmission["input"], id: number): readonly FreeTransmission[] {
  const text = Array.from(value.trim()).slice(0, FREE_SPEECH_MAX_CHARACTERS).join("");
  return text ? [{ id, input, text }, ...rows].slice(0, FREE_SPEECH_MAX_ROWS) : rows;
}
