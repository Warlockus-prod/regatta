import { describe, expect, it } from "vitest";
import { appendFreeTransmission, FREE_SPEECH_HOLD_MS, type FreeTransmission } from "./freeSpeechSession";

describe("private free transmission session bounds", () => {
  it("retains only the eight latest actual voice or typed entries", () => {
    let rows: readonly FreeTransmission[] = [];
    for (let id = 1; id <= 12; id++) rows = appendFreeTransmission(rows, `MESSAGE ${id}`, id % 2 ? "voice" : "typed", id);
    expect(rows.map(row => row.id)).toEqual([12, 11, 10, 9, 8, 7, 6, 5]);
    expect(rows[0].input).toBe("typed"); expect(rows[1].input).toBe("voice");
  });
  it("preserves the previous rows and limits complete Unicode characters", () => {
    const previous = Object.freeze([{ id: 1, input: "voice" as const, text: "OLD" }]);
    const rows = appendFreeTransmission(previous, "  " + "⛵".repeat(1200) + "  ", "typed", 2);
    expect(Array.from(rows[0].text)).toHaveLength(1000); expect(rows[1]).toBe(previous[0]);
    expect(previous).toHaveLength(1);
    expect(appendFreeTransmission(previous, " \n\t ", "voice", 3)).toBe(previous);
    expect(FREE_SPEECH_HOLD_MS).toBe(45_000);
  });
});
