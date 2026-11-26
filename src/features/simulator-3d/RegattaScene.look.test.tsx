import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { VENUE_LOOKS, venueLook } from "@/data/venues/look";
import { findVenue } from "@/data/venues/venues";
import { loadQualityStep, qualityAt, settle } from "@/features/race-scene/quality";

// Package 32 stage D. Contract: the trainers draw the venue's own light and
// colours, the same look the race reads for that venue, so the race and the
// trainers are one world. Before, they passed no look and kept an older light.
const seen = vi.hoisted(() => ({ environment: [] as Array<{ look?: unknown; venue?: { id: string }; quality?: { id: string; glow: number } }>, canvas: [] as Array<{ dpr?: unknown }>, yacht: [] as Array<{ light?: boolean }> }));
vi.mock("@react-three/fiber", () => ({ Canvas: ({ children, dpr }: { children: ReactNode; dpr?: unknown }) => { seen.canvas.push({ dpr }); return <div data-testid="canvas">{children}</div>; }, useThree: () => ({}), useFrame: () => {} }));
vi.mock("@/features/race-scene/SailingEnvironment", () => ({ SailingEnvironment: (props: { look?: unknown; venue?: { id: string }; quality?: { id: string; glow: number } }) => { seen.environment.push(props); return null; } }));
vi.mock("@/features/race-scene/renderer", () => ({ createSailingRenderer: () => null }));
vi.mock("./Yacht", () => ({ Yacht: (props: { light?: boolean }) => { seen.yacht.push(props); return null; } }));
vi.mock("./ocean/WindFlow", () => ({ WindFlow: () => null }));
vi.mock("./stage-view", () => ({ StageView: () => null, StageCameraRig: () => null }));
vi.mock("./SceneBoundary", () => ({ SceneBoundary: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("./SceneStartup", () => ({ FirstSceneFrame: () => null, SceneStartup: ({ children }: { children: (ready: () => void) => ReactNode }) => <>{children(() => {})}</> }));

import { RegattaScene } from "./RegattaScene";

const labels = { loadingLabel: "", sceneLabel: "", errorLabel: "", retryLabel: "" };
const state = { current: {} } as never;

describe("trainer scene: one world with the race", () => {
  it("draws each venue in the look the race uses for it", () => {
    for (const id of ["gocek", "split", "mazury"] as const) {
      seen.environment.length = 0;
      renderToStaticMarkup(<RegattaScene stateRef={state} venue={findVenue(id)} {...labels} />);
      expect(seen.environment.at(-1)?.look).toBe(VENUE_LOOKS[id]);
      expect(seen.environment.at(-1)?.look).toBe(venueLook(id));
    }
  });
  // The trainers used a fixed pixel ratio of 1 (blurred on a 3x phone). They now start on the race's
  // quality ladder: one number for the canvas, the ladder's scene profile, the full yacht.
  it("starts on the race's quality ladder instead of a fixed low pixel ratio", () => {
    seen.environment.length = 0; seen.canvas.length = 0; seen.yacht.length = 0;
    renderToStaticMarkup(<RegattaScene stateRef={state} venue={findVenue("gocek")} maxDpr={2} {...labels} />);
    const start = qualityAt(settle(loadQualityStep(), 1), 1);
    // No window on the server: the device ratio reads as 1, and the ladder still gives its best profile for it.
    expect(seen.canvas.at(-1)?.dpr).toBe(start.dpr);
    expect(typeof seen.canvas.at(-1)?.dpr).toBe("number");
    expect(seen.environment.at(-1)?.quality).toBe(start.profile);
    expect(seen.yacht.at(-1)?.light).toBe(false);
  });
  it("keeps the light yacht for an explicit cap of 1", () => {
    seen.yacht.length = 0;
    renderToStaticMarkup(<RegattaScene stateRef={state} maxDpr={1} {...labels} />);
    expect(seen.yacht.at(-1)?.light).toBe(true);
  });
  it("uses the open-water look when there is no venue", () => {
    seen.environment.length = 0;
    renderToStaticMarkup(<RegattaScene stateRef={state} {...labels} />);
    expect(seen.environment.at(-1)?.look).toBe(VENUE_LOOKS.open);
  });
});
