import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Dispatch, SetStateAction } from "react";
import type { UiState } from "./ui/shared";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";
import { createDiagnosticJournal } from "@/lib/diagnostics";
const capture = vi.hoisted(() => ({ setUi: null as Dispatch<SetStateAction<UiState>> | null }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/components/FoundationReturn", () => ({ FoundationReturn: () => null }));
vi.mock("./ui/pods/MainPod", () => ({ MainPod: ({ setUi }: { setUi: Dispatch<SetStateAction<UiState>> }) => { capture.setUi = setUi; return null; } }));
vi.mock("../trainer-controls", async original => ({ ...await original<typeof import("../trainer-controls")>(),
  ControlDock: ({ tabs }: { tabs: { cards: { id: string; node: React.ReactNode }[] }[] }) => <>{tabs.flatMap(tab => tab.cards.map(card => <React.Fragment key={card.id}>{card.node}</React.Fragment>))}</>,
}));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
import SimulatorV3Page from "./SimulatorV3Page";
beforeEach(() => { capture.setUi = null; vi.mocked(recordWebDiagnostic).mockReset(); vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });
describe("actual trainer UI command boundary", () => {
  it("uses the canonical reef and open-sail mapping, and keeps rapid working-length/traveler targets", () => {
    const journal = createDiagnosticJournal({ now: () => 0 });
    vi.mocked(recordWebDiagnostic).mockImplementation(event => journal.record(event));
    renderToStaticMarkup(<SimulatorV3Page />);
    const setUi = capture.setUi!;
    expect(setUi).toBeTypeOf("function");
    setUi(ui => ({ ...ui, reefLevel: 1, jibFurlPct: 50 }));
    setUi(ui => ({ ...ui, mainTrim: { workingLength: 9, traveler: 0 } }));
    setUi(ui => ({ ...ui, mainTrim: { ...ui.mainTrim!, workingLength: 11, traveler: .25 } }));
    const events = journal.snapshot().entries.map(entry => entry.event);
    expect(events).toContainEqual(expect.objectContaining({ control: "reef", value: .45 }));
    expect(events).toContainEqual(expect.objectContaining({ control: "jib-furl", value: .5, previous: 0 }));
    expect(events).toContainEqual(expect.objectContaining({ control: "main-working-length", value: 11, previous: 9 }));
    expect(events).toContainEqual(expect.objectContaining({ control: "traveler", value: .25, previous: 0 }));
  });
  it("continues applying sequential UI updates if recording fails", () => {
    vi.mocked(recordWebDiagnostic).mockImplementation(() => { throw new Error("diagnostic blocked"); });
    renderToStaticMarkup(<SimulatorV3Page />);
    let received = 0;
    expect(() => {
      capture.setUi!(ui => ({ ...ui, windSpeed: 18 }));
      capture.setUi!(ui => { received = ui.windSpeed; return { ...ui, windMode: "gust" }; });
    }).not.toThrow();
    expect(received).toBe(18);
  });
});
