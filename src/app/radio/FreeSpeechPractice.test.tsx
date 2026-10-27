import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FreeSpeechPractice, type FreeSpeechHandle } from "./FreeSpeechPractice";
import { FREE_SPEECH_COPY } from "@/data/radio/free-speech-copy";

const h = vi.hoisted(() => ({ lang: "en", buttons: new Map<string, React.ButtonHTMLAttributes<HTMLButtonElement>>(),
  engine: { available: false as boolean | null, phase: "idle", error: false, draft: "", outcome: null as string | null,
    start: vi.fn(), stop: vi.fn(), cancel: vi.fn(), reset: vi.fn() }, diagnostic: vi.fn() }));
vi.mock("./localization/context", async () => {
  const { FREE_SPEECH_COPY } = await import("@/data/radio/free-speech-copy");
  return { useRadioI18n: () => ({ rt: (source: string) => Object.values(FREE_SPEECH_COPY).find(values => values.pl === source)?.[h.lang as keyof typeof FREE_SPEECH_COPY.title] ?? source }) };
});
vi.mock("./audio/useLocalRecognition", () => ({ useLocalRecognition: () => h.engine }));
vi.mock("./audio/speech-diagnostics", () => ({ recordRadioSpeech: h.diagnostic }));
vi.mock("react", async original => ({ ...await original<typeof import("react")>(),
  useImperativeHandle: (ref: React.MutableRefObject<unknown> | null, create: () => unknown) => { if (ref) ref.current = create(); },
}));
vi.mock("react/jsx-runtime", async original => {
  const actual = await original<typeof import("react/jsx-runtime")>();
  return { ...actual, jsx: (...args: Parameters<typeof actual.jsx>) => {
    const props = args[1] as React.ButtonHTMLAttributes<HTMLButtonElement> & { "data-testid"?: string };
    if (args[0] === "button" && props["data-testid"]) h.buttons.set(props["data-testid"], props);
    return actual.jsx(...args);
  }, jsxs: (...args: Parameters<typeof actual.jsxs>) => {
    const props = args[1] as React.ButtonHTMLAttributes<HTMLButtonElement> & { "data-testid"?: string };
    if (args[0] === "button" && props["data-testid"]) h.buttons.set(props["data-testid"], props);
    return actual.jsxs(...args);
  } };
});
vi.mock("react/jsx-dev-runtime", async original => {
  const actual = await original<typeof import("react/jsx-dev-runtime")>();
  return { ...actual, jsxDEV: (...args: Parameters<typeof actual.jsxDEV>) => {
    const props = args[1] as React.ButtonHTMLAttributes<HTMLButtonElement> & { "data-testid"?: string };
    if (args[0] === "button" && props["data-testid"]) h.buttons.set(props["data-testid"], props);
    return actual.jsxDEV(...args);
  } };
});
beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal("React", React); h.lang = "en"; h.buttons.clear(); h.diagnostic.mockReset();
  Object.assign(h.engine, { available: false, phase: "idle", error: false, draft: "", outcome: null });
  for (const fn of [h.engine.start, h.engine.stop, h.engine.cancel, h.engine.reset]) fn.mockReset();
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });
function render(power = true, voiceChannel = true) {
  const ref = React.createRef<FreeSpeechHandle>(), release = vi.fn();
  const html = renderToStaticMarkup(<FreeSpeechPractice ref={ref} power={power} voiceChannel={voiceChannel} onReleasePtt={release} />);
  return { html, handle: ref.current!, release };
}

describe("free speech dock and actual PTT handle", () => {
  it("keeps typing usable with no model and does not invent a score or microphone success", () => {
    const { html } = render();
    expect(html).toContain("On-device English recognition is unavailable");
    expect(html).toContain('maxLength="1000"'); expect(html).toContain('rows="2"');
    expect(html.match(/<textarea[^>]+>/)?.[0]).not.toMatch(/\sdisabled(?:=|\s|>)/);
    expect(html).toContain("Session transmissions (0/8)"); expect(html).not.toContain("100%");
    expect(h.engine.start).not.toHaveBeenCalled();
  });
  it.each([[false, true, "Turn on the radio"], [true, false, "Channel 70 is for DSC"]] as const)("blocks PTT for power=%s voice=%s while leaving typing available", (power, voice, label) => {
    const { html, handle } = render(power, voice); handle.startRecording(); vi.advanceTimersByTime(60_000);
    expect(html).toContain(label); expect(h.engine.start).not.toHaveBeenCalled(); expect(h.engine.stop).not.toHaveBeenCalled();
    expect(html.match(/<textarea[^>]+>/)?.[0]).not.toMatch(/\sdisabled(?:=|\s|>)/);
  });
  it("caps an actual hold at45seconds, ignoring repeated starts and releasing the modelled PTT", () => {
    h.engine.available = true; const { handle, release } = render();
    handle.startRecording(); handle.startRecording(); vi.advanceTimersByTime(44_999);
    expect(h.engine.start).toHaveBeenCalledTimes(1); expect(h.engine.stop).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(h.engine.stop).toHaveBeenCalledTimes(1); expect(release).toHaveBeenCalledTimes(1);
  });
  it("cancels a hold instead of submitting it and removes its deadline", () => {
    h.engine.available = true; const { handle, release } = render();
    handle.startRecording(); handle.cancelRecording(); vi.advanceTimersByTime(60_000);
    expect(h.engine.cancel).toHaveBeenCalledTimes(1); expect(h.engine.stop).not.toHaveBeenCalled(); expect(release).not.toHaveBeenCalled();
  });
  it("keeps a released utterance pending when pointerleave or blur follows pointerup", () => {
    h.engine.available = true; const { handle } = render();
    handle.startRecording(); handle.stopRecording(); handle.cancelRecording();
    vi.advanceTimersByTime(60_000);
    expect(h.engine.stop).toHaveBeenCalledTimes(1); expect(h.engine.cancel).not.toHaveBeenCalled();
    handle.startRecording(); handle.cancelRecording();
    expect(h.engine.cancel).toHaveBeenCalledTimes(1);
  });
  it("renders a provisional draft separately and disables typing while recording", () => {
    Object.assign(h.engine, { phase: "recording", draft: "RADIO CHECK", available: true });
    const { html } = render();
    expect(html).toContain("Live draft"); expect(html).toContain("RADIO CHECK");
    expect(html.match(/<textarea[^>]+>/)?.[0]).toMatch(/\sdisabled(?:=|\s|>)/);
    expect(html).toContain("Session transmissions (0/8)");
  });
  it("Clear cancels the request and releases PTT without sending text to diagnostics", () => {
    Object.assign(h.engine, { phase: "recording", draft: "PRIVATE WORDS", available: true });
    const { handle, release } = render(); handle.startRecording();
    h.buttons.get("free-speech-clear")!.onClick!({} as React.MouseEvent<HTMLButtonElement>);
    vi.advanceTimersByTime(60_000);
    expect(h.engine.reset).toHaveBeenCalledTimes(1); expect(release).toHaveBeenCalledTimes(1);
    expect(h.engine.stop).not.toHaveBeenCalled();
    expect(h.diagnostic).toHaveBeenCalledWith({ action: "clear", input: "typed", outcome: "accepted" });
    expect(JSON.stringify(h.diagnostic.mock.calls)).not.toContain("PRIVATE");
  });
  it("uses explicit translated status and typing labels in all seven languages", () => {
    for (const lang of ["pl", "ru", "en", "es", "fr", "de", "it"] as const) {
      h.lang = lang; const { html } = render();
      expect(html).toContain(FREE_SPEECH_COPY.title[lang].replaceAll("'", "&#x27;"));
      expect(html).toContain(FREE_SPEECH_COPY.typedLabel[lang]);
    }
  });
});
