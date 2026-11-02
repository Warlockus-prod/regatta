import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const i18n = vi.hoisted(() => ({ lang: "en" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: i18n.lang,
  tl: (text: Record<string, string>) => text[i18n.lang] ?? text.en,
  tp: (ru: string, en: string, pl: string, rest?: Record<string, string>) =>
    ({ ru, en, pl, ...rest } as Record<string, string>)[i18n.lang] ?? en }) }));
import { MultiplayerMenu, MultiplayerRoom, type LobbyPlayer } from "./MultiplayerLobby";
import { sections } from "@/lib/product/catalog";

// M2-8 lobby (D4): a way back to the Race section, Create never looks
// disabled and says what is missing, no text under 14 px, the room code shared
// through the system sheet where there is one, cyan only on actions.
const noop = () => {};
const LANGS = ["ru", "en", "pl", "es", "fr", "de", "it"] as const;
const CYAN = /#00d4ff|0,\s*212,\s*255|accent-cyan/i;

function menu(patch: Partial<ComponentProps<typeof MultiplayerMenu>> = {}) {
  return renderToStaticMarkup(<MultiplayerMenu embed={false} nickname="Sailor 42" setNickname={noop} nicknameInvalid={false} nicknameHint="Nickname: at least 2"
    joinCode="" setJoinCode={noop} createBlocker={null} connecting={false} onCreate={noop} onJoin={noop} joinDisabled error={null} {...patch} />);
}
const players: LobbyPlayer[] = [
  { id: "p1", nickname: "Ola", ready: false, isBot: false, connected: true },
  { id: "p2", nickname: "Jan", ready: true, isBot: false, connected: false },
  { id: "b1", nickname: "Mistral", ready: true, isBot: true, connected: true },
];
function room(patch: Partial<ComponentProps<typeof MultiplayerRoom>> = {}) {
  return renderToStaticMarkup(<MultiplayerRoom room={{ code: "AB2C", hostId: "p1", myId: "p1", missionId: null, maxPlayers: 10 }} players={players}
    colors={["#f68", "#8df"]} reconnecting error="x" canShare={false} share={null} onShare={noop} inviteUrl="https://weektoregatta.com/multiplayer?code=AB2C" onLeave={noop} onPickMission={noop}
    onAddBot={noop} onRemoveBot={noop} onStart={noop} onReady={noop} {...patch} />);
}
const createButton = (html: string) => html.match(/<button[^>]*data-testid="mp-create"[^>]*>/)![0];
/** Every font size class used: Tailwind's text-xs is 12 px, text-sm 14 px. */
const SMALL_TEXT = /\btext-(xs|\[(?:[0-9]|1[0-3])px\])/;
/** The tag that carries a test id. */
const tagOf = (html: string, testId: string) => html.match(new RegExp(`<[a-z]+[^>]*data-testid="${testId}"[^>]*>`))![0];

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { vi.unstubAllGlobals(); i18n.lang = "en"; });

describe("multiplayer lobby screens (M2-8)", () => {
  it("links back to the Race section with its own name in every language, as a 44 px target", () => {
    const race = sections.find(section => section.id === "race")!;
    for (const lang of LANGS) {
      i18n.lang = lang;
      const link = menu().match(/<a[^>]*data-testid="mp-back-to-race"[^>]*>[\s\S]*?<\/a>/)![0];
      expect(link).toContain(`href="${race.web}"`);
      expect(link).toContain(race.title[lang]);
      expect(link).toContain("min-h-11");
    }
    // In the app's embedded web view the native shell owns the way back.
    expect(menu({ embed: true })).not.toContain("mp-back-to-race");
  });

  it("never disables or dims Create, and names what is missing under it", () => {
    const cases = [
      [null, null],
      ["nickname-empty", "Enter a nickname to create a lobby."],
      ["nickname-invalid", "Fix the nickname above to create a lobby."],
      ["session", "Connecting to the server, one moment."],
    ] as const;
    for (const [createBlocker, hint] of cases) {
      const html = menu({ createBlocker });
      const button = createButton(html);
      expect(button).not.toMatch(/\sdisabled=|opacity|aria-disabled/);
      expect(button).toContain("background:var(--accent-cyan)");
      const status = html.match(/<p id="mp-create-hint" role="status"[^>]*>([^<]*)<\/p>/)![1];
      expect(status).toBe(hint ?? "");
      if (hint) expect(button).toContain('aria-describedby="mp-create-hint"');
      else expect(button).not.toContain("aria-describedby");
    }
    const busy = menu({ connecting: true });
    expect(createButton(busy)).toContain('aria-busy="true"');
    expect(createButton(busy)).not.toMatch(/\sdisabled=|opacity/);
    expect(busy).toContain(">Creating the lobby...</p>");
  });

  it("calls Create on every tap, also with something missing", () => {
    const onCreate = vi.fn();
    const tree = MultiplayerMenuTree({ createBlocker: "nickname-empty", onCreate });
    tree.props.onClick();
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("shows the given default nickname in the field, ready to create", () => {
    const html = menu({ nickname: "Żeglarz 42" });
    expect(html).toMatch(/<input[^>]*id="mp-nickname"[^>]*value="Żeglarz 42"/);
  });

  it("uses no text smaller than 14 px before a room and inside one", () => {
    for (const html of [menu({ nicknameInvalid: true, error: "Room closed", createBlocker: "session" }), room(),
      room({ room: { code: "AB2C", hostId: "p2", myId: "p1", missionId: "clean-laps", maxPlayers: 10 } })]) {
      expect(html).not.toMatch(SMALL_TEXT);
      expect(html).toMatch(/text-(sm|base)/);
    }
  });

  it("offers the system share sheet where the browser has one and a copy link elsewhere", () => {
    expect(tagOf(room({ canShare: true }), "mp-share-code")).toBeTruthy();
    expect(room({ canShare: true })).toMatch(/data-testid="mp-share-code"[^>]*>Share the code</);
    expect(room({ canShare: false })).toMatch(/data-testid="mp-share-code"[^>]*>Copy link</);
    // The button keeps naming the action; the outcome goes to the status line.
    expect(room({ canShare: false, share: "copied" })).toMatch(/data-testid="mp-share-code"[^>]*>Copy link</);
    i18n.lang = "pl";
    expect(room({ canShare: true })).toMatch(/data-testid="mp-share-code"[^>]*>Udostępnij kod</);
    const onShare = vi.fn();
    const button = MultiplayerRoomTree({ canShare: true, onShare });
    button.props.onClick();
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it("says what a tap does before it, what was copied after it, and a failure as a failure with the link to select", () => {
    const status = (html: string) => html.match(/<p id="mp-share-status" role="status"[^>]*data-state="([a-z]+)"[^>]*>([^<]*)<\/p>/)!;
    expect(tagOf(room(), "mp-share-code")).toContain('aria-describedby="mp-share-status"');
    expect(status(room()).slice(1)).toEqual(["idle", "Tap to copy an invite link to this lobby."]);
    expect(status(room({ canShare: true })).slice(1)).toEqual(["idle", "Tap to send a friend an invite link to this lobby."]);
    expect(status(room({ share: "cancelled" }))[1]).toBe("idle");

    const copied = room({ share: "copied" });
    expect(status(copied).slice(1)).toEqual(["copied", "Invite link to lobby AB2C copied. Paste it into a message to a friend."]);
    expect(copied).toMatch(/data-testid="mp-share-copied-link"[^>]*>weektoregatta\.com\/multiplayer\?code=AB2C</);
    expect(copied).not.toContain("mp-invite-link");
    // The copied link is body text: 16 px like the status line, never text-sm (14 px).
    expect(tagOf(copied, "mp-share-copied-link")).toContain("text-base");
    expect(tagOf(copied, "mp-share-copied-link")).not.toMatch(/\btext-(xs|sm)\b/);
    expect(status(room({ share: "shared" }))[2]).toContain("AB2C");

    const failed = room({ share: "failed" });
    const [, state, text] = status(failed);
    expect(state).toBe("failed");
    expect(text).toBe("Could not copy. Select the link below and copy it by hand.");
    expect(text).not.toMatch(/copied|shared|done/i);
    expect(failed).not.toContain("mp-share-copied-link");
    const link = tagOf(failed, "mp-invite-link");
    expect(failed).toMatch(/data-testid="mp-invite-link"[^>]*>https:\/\/weektoregatta\.com\/multiplayer\?code=AB2C<\/textarea>/);
    expect(link).toContain("readOnly");
    expect(link).toContain("min-h-11");
    expect(link).not.toMatch(CYAN);

    // Every language has its own wording for each state, never the English one.
    const english = new Set(["idle", "copied", "failed"].map(share => status(room({ share: share === "idle" ? null : share as "copied" | "failed" }))[2]));
    for (const lang of LANGS.filter(l => l !== "en")) {
      i18n.lang = lang;
      for (const share of [null, "copied", "shared", "failed"] as const) {
        const text = status(room({ share }))[2];
        expect(text.length).toBeGreaterThan(10);
        expect(english.has(text)).toBe(false);
      }
    }
  });

  it("keeps the room code, the role badge and the input borders neutral; cyan is left to actions", () => {
    const card = room().match(/<div[^>]*data-testid="mp-code-card"[\s\S]*?<button/)![0];
    expect(card).toContain(">AB2C</div>");
    expect(card).not.toMatch(CYAN);
    expect(tagOf(room(), "mp-role-badge")).not.toMatch(CYAN);
    for (const input of menu().match(/<input[^>]*>/g)!) {
      expect(input).not.toMatch(CYAN);
      expect(input).toContain("border:1px solid var(--border-subtle)");
    }
    // The "you" marker beside your own name is a label, not a control.
    expect(room()).toMatch(/text-\[var\(--text-secondary\)\]">you</);
    // A selected race setting keeps the cyan border (the selected control).
    const host = room({ room: { code: "AB2C", hostId: "p1", myId: "p1", missionId: null, maxPlayers: 10 } });
    expect(host).toMatch(/aria-pressed="true"[^>]*style="border-color:var\(--accent-cyan\)/);
  });
});

// Find the Create and Share buttons in the element tree, to call their handlers.
type Element = { type: unknown; props: { children?: unknown; onClick: () => void; [key: string]: unknown } };
function find(node: unknown, testId: string): Element | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) { for (const child of node) { const hit = find(child, testId); if (hit) return hit; } return null; }
  const element = node as Element;
  if (element.props?.["data-testid"] === testId) return element;
  return find(element.props?.children, testId);
}
function MultiplayerMenuTree(patch: Partial<ComponentProps<typeof MultiplayerMenu>>) {
  const props = { embed: false, nickname: "", setNickname: noop, nicknameInvalid: false, nicknameHint: "", joinCode: "", setJoinCode: noop,
    createBlocker: null, connecting: false, onCreate: noop, onJoin: noop, joinDisabled: true, error: null, ...patch } as ComponentProps<typeof MultiplayerMenu>;
  return withHooks(() => find(MultiplayerMenu(props), "mp-create")!);
}
function MultiplayerRoomTree(patch: Partial<ComponentProps<typeof MultiplayerRoom>>) {
  const props = { room: { code: "AB2C", hostId: "p1", myId: "p1", missionId: null, maxPlayers: 10 }, players, colors: ["#f68"], reconnecting: false,
    error: null, canShare: false, share: null, onShare: noop, inviteUrl: "https://weektoregatta.com/multiplayer?code=AB2C", onLeave: noop, onPickMission: noop, onAddBot: noop, onRemoveBot: noop, onStart: noop,
    onReady: noop, ...patch } as ComponentProps<typeof MultiplayerRoom>;
  return withHooks(() => find(MultiplayerRoom(props), "mp-share-code")!);
}
/** Calls a component as a plain function with React's hook dispatcher set up
 * by rendering a probe, so useRef inside works outside a renderer. */
function withHooks<T>(run: () => T): T {
  let out: T | undefined;
  function Probe() { out = run(); return null; }
  renderToStaticMarkup(<Probe />);
  return out!;
}
