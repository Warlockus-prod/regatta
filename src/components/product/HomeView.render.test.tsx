import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Package 9 (audit K1, K2, rule 11 of AGENTS.md): the home has exactly ONE
// primary action. A new visitor, and a visitor who only looked at /sternik,
// gets "Start from scratch"; "Continue learning" needs a passed check. The
// radio and motorboat courses are quiet entrances, never the primary.

vi.mock("next/link", () => ({
  default: ({ href, prefetch: _p, children, ...rest }: { href: string; prefetch?: boolean; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("@/lib/funnel", () => ({ appStoreUrl: () => "https://apps.apple.com/app", trackAppStoreClick: () => {} }));
import { HomeView } from "./HomeView";
import { bookmarkForPath, emptyLearningSnapshot, type LearningSnapshot } from "@/lib/product/learning";
import { SCENE_STILL_WEB } from "@/lib/product/home-entry";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());

const RACE = "/game?difficulty=easy&wind=medium&play=1";
const render = (snapshot: LearningSnapshot | null, lang: "ru" | "en" = "ru", error = false) =>
  renderToStaticMarkup(<HomeView lang={lang} snapshot={snapshot} error={error} onRetry={() => {}} raceHref={RACE} />);
const primaries = (html: string) => [...html.matchAll(/<a [^>]*data-action="primary"[^>]*>(.*?)<\/a>/g)].map(m => ({ tag: m[0], text: m[1].replace(/<[^>]+>/g, "") }));
const withFoundation = (checked: string[], visited: string[] = checked): LearningSnapshot => ({ ...emptyLearningSnapshot(), foundation: { current: visited.at(-1) ?? null, checked, visited } });

describe("website home", () => {
  it("a new visitor: value line, the race frame, one Start from scratch and a quieter Go straight to a race", () => {
    const html = render(withFoundation([], []));
    expect(html).toContain("<h1>Научись ходить под парусом за неделю</h1>");
    expect(html).toContain(`src="${SCENE_STILL_WEB}"`);
    const [primary, ...rest] = primaries(html);
    expect(rest).toHaveLength(0);
    expect(primary.text).toBe("Начать с нуля→");
    expect(primary.tag).toContain('href="/start?lesson=wind-direction"');
    expect(html).toContain(`href="${RACE.replace(/&/g, "&amp;")}"`);
    expect(html).toContain("Сразу в гонку");
    expect(html).not.toContain("Продолжить обучение");
    // SRC and sternik are separate, quiet entrances.
    expect(html).toContain("Готовишься к экзамену?");
    expect(html).toContain('href="/radio"');
    expect(html).toContain('href="/sternik"');
  });

  it("a visit to /sternik or opened lessons do not turn the home into Continue", () => {
    for (const snapshot of [
      { ...emptyLearningSnapshot(), foundation: { current: null, checked: [], visited: [] }, bookmark: JSON.stringify(bookmarkForPath("/sternik", "web")) },
      { ...emptyLearningSnapshot(), foundation: { current: null, checked: [], visited: [] }, bookmark: JSON.stringify(bookmarkForPath("/radio/teoria", "web")) },
      withFoundation([], ["wind-direction", "points-of-sail"]),
    ]) {
      const html = render(snapshot);
      const list = primaries(html);
      expect(list).toHaveLength(1);
      expect(list[0].text).toBe("Начать с нуля→");
      expect(html).not.toContain("Моторный рулевой Моторный рулевой");
      expect(html).not.toMatch(/Моторный рулевой<\/p><h2>Моторный рулевой/);
    }
  });

  it("after a passed check: Continue learning to the next lesson, still one primary action", () => {
    const html = render(withFoundation(["wind-direction"]), "en");
    const list = primaries(html);
    expect(list).toHaveLength(1);
    expect(list[0].text).toBe("Continue learning→");
    expect(list[0].tag).toContain('href="/start?lesson=points-of-sail"');
    expect(html).toContain("Go straight to a race");
    expect(html).toContain("Theory checks passed");
  });

  it("before storage is read there is no action to guess, and an error offers a retry", () => {
    expect(primaries(render(null))).toHaveLength(0);
    expect(render(null)).toContain('role="status"');
    expect(render(null, "en", true)).toContain("Try again");
  });
});
