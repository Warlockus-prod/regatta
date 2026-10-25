import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import type { MouseEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { raceNativeDestination } from "../../../mobile/src/navigation/race-entry";
import { Link as OfflineLink } from "../../../mobile/scripts/offline-sailing/next";

const locale = vi.hoisted(() => ({ value: "en" }));
// Read the client snapshot while rendering the menu without mounting WebGL or
// running race effects. Keep real React state and the actual offline Link.
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));
vi.mock("next/link", async () => ({ default: (await import("../../../mobile/scripts/offline-sailing/next")).Link }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./GameMenu", () => ({ GameMenu: () => <div data-testid="race-setup" /> }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({
  lang: locale.value,
  tl: (text: Record<string, string>) => text[locale.value],
  tp: (ru: string, en: string, pl: string, rest: Record<string, string> = {}) => ({ ru, en, pl, ...rest })[locale.value],
}) }));
import GameClient from "./GameClient";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { vi.unstubAllGlobals(); locale.value = "en"; });

describe("fullscreen native race menu escape", () => {
  it.each([
    ["ru", "Вернуться к гонкам"], ["en", "Back to races"], ["pl", "Wróć do regat"],
    ["es", "Volver a regatas"], ["fr", "Retour aux courses"], ["de", "Zurück zu den Rennen"], ["it", "Torna alle regate"],
  ])("shows a 44px inline native exit before race setup in %s", (lang, label) => {
    locale.value = lang;
    vi.stubGlobal("window", { __REGATTA_RACE_NATIVE__: true, location: { search: "" } });
    const html = renderToStaticMarkup(<GameClient />);
    expect(html).toContain(`>${label}</a>`);
    expect(html).toMatch(/<a href="\/" class="inline-flex[^"]*min-h-11/);
    expect(html.indexOf(label)).toBeLessThan(html.indexOf('data-testid="race-setup"'));
    vi.stubGlobal("window", { location: { search: "" } });
    expect(renderToStaticMarkup(<GameClient />)).not.toContain(`>${label}</a>`);
  });

  it("sends the visible root link through the real offline shim to the native Race hub", () => {
    const postMessage = vi.fn();
    vi.stubGlobal("window", { __REGATTA_RACE_NATIVE__: true, location: { search: "" }, ReactNativeWebView: { postMessage } });
    const html = renderToStaticMarkup(<GameClient />);
    const href = html.match(/<a href="([^"]+)"/)?.[1];
    expect(href).toBe("/");
    const event = { defaultPrevented: false, preventDefault: vi.fn() };
    OfflineLink({ href }).props.onClick(event as unknown as MouseEvent<HTMLAnchorElement>);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    const message = JSON.parse(postMessage.mock.calls[0][0]);
    expect(message).toEqual({ type: "native-navigate", href: "/" });
    expect(raceNativeDestination(message.href)).toBe("/race");
  });
});
