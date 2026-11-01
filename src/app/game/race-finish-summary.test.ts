import { describe, expect, it } from "vitest";
import { ENABLED_LANGUAGES } from "@/lib/languages";
import { FINISH_COPY, dnfStage, formatGapSeconds, placeOrdinal, summariseFinish } from "./race-finish-summary";

const row = (name: string, time: number, isPlayer = false) => ({ name, time, color: "#888", isPlayer });

describe("finish summary (M1-4)", () => {
  it("gives the place, time, gap to the winner and record difference", () => {
    const s = summariseFinish([row("A", 98), row("You", 101.5, true), row("B", Infinity)], { timeSec: 100, ts: 1 }, false);
    expect(s).toMatchObject({ finished: true, place: 2, total: 3, time: 101.5, winnerName: "A", aheadOfSecond: null, newRecord: false, recordTime: 100 });
    expect(s.behindWinner).toBeCloseTo(3.5);
    expect(s.recordDelta).toBeCloseTo(1.5);
  });

  it("a winner gets the lead over second, a new record no delta, no record nothing", () => {
    const won = summariseFinish([row("You", 95, true), row("A", 98)], { timeSec: 95, ts: 1 }, true);
    expect(won.behindWinner).toBeNull();
    expect(won.aheadOfSecond).toBeCloseTo(3);
    expect(won.newRecord).toBe(true);
    expect(won.recordDelta).toBeNull();
    const alone = summariseFinish([row("You", 95, true), row("A", Infinity)], null, false);
    expect(alone.aheadOfSecond).toBeNull();
    expect(alone.recordDelta).toBeNull();
  });

  it("a did-not-finish has no time, gap or record", () => {
    const s = summariseFinish([row("A", 98), row("You", Infinity, true)], { timeSec: 90, ts: 1 }, true);
    expect(s).toMatchObject({ finished: false, place: 2, time: null, behindWinner: null, aheadOfSecond: null, recordDelta: null, newRecord: false });
    expect(dnfStage(0)).toBe(0);
    expect(dnfStage(1)).toBe(1);
    expect(dnfStage(undefined)).toBeNull();
  });

  it("formats gaps with the language's decimal mark and places as each language reads them", () => {
    expect(formatGapSeconds(3.46, "en")).toBe("3.5 s");
    expect(formatGapSeconds(3.46, "ru")).toBe("3,5 с");
    expect(formatGapSeconds(-1.2, "de")).toBe("1,2 s");
    expect(formatGapSeconds(72.4, "en")).toBe("1:12.4");
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(n => placeOrdinal(n, "en"))).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
    expect(placeOrdinal(2, "pl")).toBe("2. miejsce");
    expect(placeOrdinal(1, "fr")).toBe("1re place");
    expect(placeOrdinal(2, "fr")).toBe("2e place");
    expect(placeOrdinal(3, "de")).toBe("Platz 3");
  });

  it("every finish text exists in all seven languages, without long dashes or unicode ellipsis", () => {
    for (const [key, text] of Object.entries(FINISH_COPY)) {
      for (const { id: lang } of ENABLED_LANGUAGES) {
        const value = (text as Record<string, string>)[lang];
        expect(value, `${key}.${lang}`).toBeTruthy();
        expect(value, `${key}.${lang}`).not.toMatch(/[\u2013\u2014\u2026\u201c\u201d\u2018\u2019]/);
      }
    }
  });
});
