import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { VENUE_LOOKS, venueLook } from "@/data/venues/look";
import { findVenue } from "@/data/venues/venues";

// Package 32 stage D. Contract: the trainers draw the venue's own light and
// colours, the same look the race reads for that venue, so the race and the
// trainers are one world. Before, they passed no look and kept an older light.
const seen = vi.hoisted(() => ({ environment: [] as Array<{ look?: unknown; venue?: { id: string } }> }));
vi.mock("@react-three/fiber", () => ({ Canvas: ({ children }: { children: ReactNode }) => <div data-testid="canvas">{children}</div>, useThree: () => ({}) }));
vi.mock("@/features/race-scene/SailingEnvironment", () => ({ SailingEnvironment: (props: { look?: unknown; venue?: { id: string } }) => { seen.environment.push(props); return null; } }));
vi.mock("@/features/race-scene/renderer", () => ({ createSailingRenderer: () => null }));
vi.mock("./Yacht", () => ({ Yacht: () => null }));
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
  it("uses the open-water look when there is no venue", () => {
    seen.environment.length = 0;
    renderToStaticMarkup(<RegattaScene stateRef={state} {...labels} />);
    expect(seen.environment.at(-1)?.look).toBe(VENUE_LOOKS.open);
  });
});
