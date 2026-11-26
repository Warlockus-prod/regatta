import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Contract (M5 step 7): a replay draws its race at the model it was sailed
// in. A metric replay hands its course profile to the race scene (from the
// shared replay's stored raceContext, or the race just sailed); a legacy
// replay hands none, so it renders exactly as before.
const scene = vi.hoisted(() => ({ props: [] as Record<string, unknown>[] }));
vi.mock("next/dynamic", () => ({ default: () => (props: Record<string, unknown>) => { scene.props.push(props); return null; } }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en }) }));
vi.mock("@/features/venues/useVenue", () => ({ useVenue: () => ({ venue: { id: "gocek" } }) }));
vi.mock("@/features/race-3d/useRaceView", () => ({ useRaceView: () => ({ camera: "orbit", setCamera: () => {} }) }));
vi.mock("@/lib/diagnostics-controls", () => ({ recordControlChange: () => {}, recordDiagnostic: () => {} }));
vi.mock("@/lib/diagnostics-bridge", () => ({ initializeDiagnosticBridge: () => {} }));
import { RaceReplay } from "./RaceReplay";
import { replayRaceProfile } from "@/lib/race-replay";
import { LEGACY_RACE_CONTEXT, physicalRaceContext } from "@/lib/race-context";

const samples = Array.from({ length: 10 }, (_, i) => ({ t: i, x: 400, y: 900 - i, heading: 45, twa: 45, speed: 5, lap: 0 }));
const course = {} as Parameters<typeof RaceReplay>[0]["course"];
const sceneProfile = () => scene.props.find(p => "courseRef" in p)?.raceProfile;

beforeEach(() => { scene.props = []; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("the replay scene's race model (M5 step 7)", () => {
  it("draws a metric replay at its course profile", () => {
    renderToStaticMarkup(<RaceReplay samples={samples} course={course} onClose={() => {}} raceProfile="medium" />);
    expect(sceneProfile()).toBe("medium");
  });

  it("draws a legacy replay with no profile, as before", () => {
    renderToStaticMarkup(<RaceReplay samples={samples} course={course} onClose={() => {}} />);
    expect(scene.props.length).toBeGreaterThan(0);
    expect(sceneProfile()).toBeNull();
  });

  it("reads the profile of a shared replay from its stored context", () => {
    expect(replayRaceProfile({ metadata: { schema: 1, mode: "simple", penaltySeconds: 0, raceContext: physicalRaceContext("long") } })).toBe("long");
    expect(replayRaceProfile({ metadata: { schema: 1, mode: "pro", penaltySeconds: 0, raceContext: LEGACY_RACE_CONTEXT } })).toBeNull();
    expect(replayRaceProfile({ metadata: { schema: 1, mode: "simple", penaltySeconds: 0 } })).toBeNull();
  });
});
