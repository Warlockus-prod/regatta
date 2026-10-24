import { TextEncoder } from "node:util";
import { ORAL_PROMPTS } from "../../../src/app/sternik/ustny/oralPrompts";
import { gradeTypedAnswer } from "./oral";
import { examDirtyMessage, sternikEntries, sternikRoute, STERNIK_STORAGE_KEYS, STERNIK_STORAGE_LIMITS } from "./model";
beforeAll(() => { Object.assign(global, { TextEncoder }); });

describe("local Sternik route and storage contract", () => {
  it("keeps course search/anchors local and refuses other destinations", () => {
    expect(sternikRoute("/sternik/test?mode=errors#question")).toEqual({ path: "/sternik/test", search: "?mode=errors", hash: "#question" });
    expect(sternikRoute("https://weektoregatta.com/sternik/teoria#znaki")?.path).toBe("/sternik/teoria");
    for (const href of ["https://evil.test/sternik", "//evil.test/sternik", "/api/sternik-chat", "/radio", "javascript:alert(1)"]) expect(sternikRoute(href)).toBeNull();
  });
  it("imports exactly five durable keys, leaves the native marker out and forces Polish", () => {
    const source = { "sternik.progress.v1": '{"v":1,"q":{}}', "sternik.explLang.v1": "both" };
    expect(sternikEntries(source)).toEqual({ ...source, "sternik.explLang.v1": "pl" });
    expect(source["sternik.explLang.v1"]).toBe("both");
    expect(STERNIK_STORAGE_KEYS).toHaveLength(5);
    expect(sternikEntries({ "sternik.offline.native-owned.v1": "1" })).toBeNull();
    expect(sternikEntries({ regatta_sid: "private" })).toBeNull();
  });
  it("bounds UTF-8 bytes without truncating a large progress record", () => {
    const progress = '{"v":1,"q":{},"padding":"' + "a".repeat(150_000) + '"}';
    expect(sternikEntries({ "sternik.progress.v1": progress })?.["sternik.progress.v1"]).toBe(progress);
    expect(sternikEntries({ "sternik.examBase.v1": "€".repeat(30_000) })).toBeNull();
    expect(sternikEntries({ "sternik.progress.v1": "a".repeat(STERNIK_STORAGE_LIMITS.progress + 1) })).toBeNull();
    expect(sternikEntries(Object.fromEntries(STERNIK_STORAGE_KEYS.map((key, i) => [key, "a".repeat(i ? 60_000 : 255_000)])))).toBeNull();
  });
  it("recognizes only explicit exam-dirty booleans", () => {
    expect(examDirtyMessage('{"type":"exam-dirty","dirty":true}')).toBe(true);
    expect(examDirtyMessage('{"type":"exam-dirty","dirty":false}')).toBe(false);
    for (const raw of ["bad", '{"type":"exam-dirty","dirty":"false"}', '{"type":"other","dirty":true}']) expect(examDirtyMessage(raw)).toBeNull();
  });
});

describe("typed oral practice with the shared rubric", () => {
  it("checks the original model locally and does not grade blank or oversized text", () => {
    expect(gradeTypedAnswer(ORAL_PROMPTS[0], ORAL_PROMPTS[0].modelPl)?.passed).toBe(true);
    expect(gradeTypedAnswer(ORAL_PROMPTS[0], "   ")).toBeNull();
    expect(gradeTypedAnswer(ORAL_PROMPTS[0], "x".repeat(8001))).toBeNull();
  });
  it("rejects reversed IALA A facts even when all colour words occur", () => {
    const prompt = ORAL_PROMPTS.find(p => p.modelPl.includes("system IALA A"))!;
    expect(gradeTypedAnswer(prompt, prompt.modelPl)?.passed).toBe(true);
    const wrong = gradeTypedAnswer(prompt, "W Polsce system IALA A. Prawa strona toru jest czerwona i walcowa, lewa strona zielona i stożkowa. Patrzymy od morza do portu.")!;
    expect(wrong.passed).toBe(false);
    expect(wrong.checks.some(check => !check.ok)).toBe(true);
  });
});
