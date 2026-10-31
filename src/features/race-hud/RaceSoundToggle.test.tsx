import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RaceSoundToggle } from "./RaceSoundToggle";

// Contract (M1-5): the race sound toggle is a 44 px button with a localized
// accessible name and its state in aria-pressed; it is cyan only while sound
// is on (the active control) and turns the state over on click.

const locale = vi.hoisted(() => ({ value: "en" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ tl: (copy: Record<string, string>) => copy[locale.value] }) }));
beforeEach(() => { vi.stubGlobal("React", React); locale.value = "en"; });
afterEach(() => vi.unstubAllGlobals());

const render = (on: boolean, showLabel = false) => renderToStaticMarkup(<RaceSoundToggle on={on} onChange={() => undefined} showLabel={showLabel} />);

it("names itself in every language and states on or off through aria-pressed", () => {
  for (const [lang, name] of [["ru", "Звук гонки"], ["en", "Race sound"], ["pl", "Dźwięk wyścigu"], ["es", "Sonido de la regata"], ["fr", "Son de la course"], ["de", "Rennton"], ["it", "Audio della regata"]] as const) {
    locale.value = lang;
    const on = render(true), off = render(false);
    expect(on, lang).toContain(`aria-label="${name}"`);
    expect(on, lang).toContain('aria-pressed="true"');
    expect(off, lang).toContain('aria-pressed="false"');
    expect(on + off, lang).not.toMatch(/[\u2013\u2014\u2026\u201c\u201d]/);
  }
});

it("is a 44 px target, cyan only while on, with a local icon", () => {
  const on = render(true), off = render(false);
  for (const html of [on, off]) {
    expect(html).toContain("min-h-11");
    expect(html).toContain("min-w-11");
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toMatch(/href|url\(|https?:|animate|transition/);
  }
  expect(on).toContain("--accent-cyan");
  expect(on).toContain('data-sound-icon="on"');
  expect(off).not.toContain("--accent-cyan");
  expect(off).toContain('data-sound-icon="off"');
});

it("shows the name and the state as text in the pause sheet row", () => {
  locale.value = "pl";
  const html = render(false, true);
  expect(html).not.toContain("aria-label=");
  expect(html).toContain(">Dźwięk wyścigu</span>");
  expect(html).toContain(">Wył.</span>");
  expect(html).toContain("text-base leading-6");
});

it("asks for the opposite state on click", () => {
  const onChange = vi.fn();
  const element = RaceSoundToggle({ on: true, onChange }) as React.ReactElement<{ onClick: () => void }>;
  element.props.onClick();
  expect(onChange).toHaveBeenCalledWith(false);
});
