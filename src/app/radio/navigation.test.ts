import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmRadioLeave, initialRadioHref, parseRadioRoute, popRadioRoute, pushRadioRoute, replaceRadioRoute, RADIO_FREE_HREF, RADIO_GUIDED_HREF, radioHref, radioLeaveCopy, radioNavigationScript, setRadioExamDirty } from "./navigation";
import { radioRuntimeHash, radioRuntimeSearch } from "./runtimeSearch";

afterEach(() => vi.unstubAllGlobals());
describe("installed SRC navigation", () => {
  it("opens the working radio by default and only uses course home when explicitly requested", () => {
    expect(initialRadioHref()).toBe(RADIO_FREE_HREF);
    expect(initialRadioHref({ practice: "free" })).toBe(RADIO_FREE_HREF);
    expect(initialRadioHref({ view: "course" })).toBe("/radio");
    expect(initialRadioHref({ view: "https://outside.test" })).toBe(RADIO_FREE_HREF);
  });
  it("keeps guide, theory, exam and scroll context in the internal back stack", () => {
    let history = [parseRadioRoute(RADIO_FREE_HREF)!];
    history = pushRadioRoute(history, RADIO_GUIDED_HREF, 0);
    history = pushRadioRoute(history, "/radio/teoria#dsc", 180);
    history = pushRadioRoute(history, "/radio/test?mode=exam", 720);
    history = popRadioRoute(history);
    expect(history.at(-1)).toMatchObject({ path: "/radio/teoria", hash: "#dsc", scroll: 720 });
    history = popRadioRoute(history);
    expect(history.at(-1)).toMatchObject({ path: "/radio/obsluga", search: "?kurs=1", scroll: 180 });
    expect(radioHref(popRadioRoute(history)[0])).toBe(RADIO_FREE_HREF);
    expect(radioHref(popRadioRoute([parseRadioRoute(RADIO_GUIDED_HREF)!])[0])).toBe(RADIO_FREE_HREF);
  });
  it("bounds history, ignores repeat navigation and rejects non-SRC destinations or injected scripts", () => {
    let history = [parseRadioRoute(RADIO_FREE_HREF)!];
    expect(pushRadioRoute(history, RADIO_FREE_HREF)).toEqual(history);
    for (let i = 0; i < 100; i++) history = pushRadioRoute(history, `/radio/teoria?chapter=${i}`);
    expect(history).toHaveLength(40);
    for (const href of ["//outside.test/radio", "https://outside.test/radio", "javascript:alert(1)", "/\\[invalid", "/\\outside.test/radio", "/settings", "/radio/../../settings", "/radio?x=" + "x".repeat(501), null]) expect(parseRadioRoute(href)).toBeNull();
    expect(() => radioNavigationScript("navigate", "https://outside.test")).toThrow();
    expect(radioNavigationScript("navigate", RADIO_GUIDED_HREF)).toContain(JSON.stringify({ href: RADIO_GUIDED_HREF }));
    expect(radioNavigationScript("back")).toContain("regatta:radio-back");
  });
  it("replaces a selected chapter in the same history entry and restores its query, hash and scroll on Back", () => {
    let history = [parseRadioRoute(RADIO_FREE_HREF)!];
    history = pushRadioRoute(history, "/radio/teoria?lang=de#radio-system", 60);
    history = replaceRadioRoute(history, "/radio/teoria?lang=de#dsc");
    expect(history).toHaveLength(2);
    expect(radioHref(history[1])).toBe("/radio/teoria?lang=de#dsc");
    history = pushRadioRoute(history, "/radio/test?chapter=dsc", 840);
    history = popRadioRoute(history);
    expect(history[1]).toMatchObject({ search: "?lang=de", hash: "#dsc", scroll: 840 });
    expect(radioHref(popRadioRoute(history)[0])).toBe(RADIO_FREE_HREF);
    expect(replaceRadioRoute(history, "https://outside.test")).toEqual(history);
    expect(replaceRadioRoute([], "/radio/teoria#dsc")).toHaveLength(1);
  });
  it("uses the installed route query/hash without stale file-document hashes and retains normal web behavior", () => {
    const location = { search: "?lang=en", hash: "#old-chapter" };
    vi.stubGlobal("window", { location });
    expect(radioRuntimeHash()).toBe("#old-chapter");
    expect(radioRuntimeSearch()).toBe("?lang=en");
    vi.stubGlobal("window", { location, __REGATTA_OFFLINE_SEARCH__: "?lang=de", __REGATTA_OFFLINE_HASH__: "#dsc" });
    expect(radioRuntimeHash()).toBe("#dsc");
    expect(radioRuntimeSearch()).toBe("?lang=de");
  });
  it("confirms once per link gesture and keeps a cancelled or failed navigation protected", async () => {
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValue(true), postMessage = vi.fn();
    const host = Object.assign(new EventTarget(), { confirm, ReactNativeWebView: { postMessage }, __REGATTA_RADIO_EXAM_DIRTY__: false });
    vi.stubGlobal("window", host);
    vi.stubGlobal("document", { documentElement: { lang: "de" } });
    setRadioExamDirty(true);
    expect(confirmRadioLeave()).toBe(false);
    expect(host.__REGATTA_RADIO_EXAM_DIRTY__).toBe(true);
    expect(confirmRadioLeave()).toBe(true);
    expect(confirmRadioLeave()).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(confirm.mock.calls[0][0]).toContain("Probeprüfung verlassen?");
    await Promise.resolve();
    expect(host.__REGATTA_RADIO_EXAM_DIRTY__).toBe(true);
    expect(confirmRadioLeave()).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(3);
    setRadioExamDirty(false);
    expect(confirmRadioLeave()).toBe(true);
    expect(JSON.parse(postMessage.mock.calls.at(-1)![0])).toEqual({ type: "radio-exam-dirty", dirty: false });
  });
  it("adapts the unsaved-attempt warning to all seven languages without claiming saved study data is erased", () => {
    const languages = ["ru", "en", "pl", "es", "fr", "de", "it"];
    const copies = languages.map(radioLeaveCopy);
    expect(new Set(copies.map(copy => copy.title)).size).toBe(7);
    expect(new Set(copies.map(copy => copy.body)).size).toBe(7);
    for (const copy of copies) for (const value of Object.values(copy)) { expect(value.trim()).toBeTruthy(); expect(value).not.toMatch(/[\u2013\u2014]/); }
  });
});
