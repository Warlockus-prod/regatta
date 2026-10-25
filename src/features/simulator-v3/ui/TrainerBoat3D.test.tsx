import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBoatParams } from "@/lib/sailing-physics";
import type { CameraView } from "../../simulator-3d/camera";
import type { RegattaScene } from "../../simulator-3d/RegattaScene";
type RegattaSceneProps = React.ComponentProps<typeof RegattaScene>;
import { createRuntimeState } from "../runtime/create-runtime-state";
import { FREE_TRAINER_UI, type SimulationModel, type TpFn } from "./shared";
import { BoatViewPresets } from "./pods/ViewPod";
import TrainerBoat3D from "./TrainerBoat3D";

const captured = vi.hoisted(() => ({ scene: null as RegattaSceneProps | null }));
vi.mock("../../simulator-3d/RegattaScene", () => ({ RegattaScene: (props: RegattaSceneProps) => { captured.scene = props; return <div data-testid="mock-canvas" />; } }));
vi.mock("../../venues/useVenue", () => ({ useVenue: () => ({ venue: null }) }));
beforeEach(() => { vi.stubGlobal("React", React); captured.scene = null; });
afterEach(() => vi.unstubAllGlobals());
const tp: TpFn = (_ru, en) => en;

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

describe("reserved trainer camera controls", () => {
  it("keeps camera buttons outside the scene while forwarding each controlled view to the shared renderer", () => {
    const session = freeze(createRuntimeState({ ui: FREE_TRAINER_UI, params: getBoatParams() }));
    const sim = { session } as unknown as SimulationModel;
    const before = structuredClone(session);
    for (const view of ["sails", "deck", "whole"] as CameraView[]) {
      const html = renderToStaticMarkup(<TrainerBoat3D sim={sim} tp={tp} view={view} />);
      expect(html).toContain('data-testid="trainer-boat-3d"');
      expect(html).toContain('data-testid="mock-canvas"');
      expect(html).not.toContain("<button");
      expect(captured.scene?.view).toBe(view);
      expect(captured.scene?.stateRef.current.speedKn).toBe(session.boat.boatSpeed);
      expect(session).toEqual(before);
    }
  });

  it("keeps the rig closeup restricted to an actual rig lesson", () => {
    for (const rig of [false, true]) {
      const session = createRuntimeState({ ui: { ...FREE_TRAINER_UI, ...(rig ? { mainTrim: { workingLength: 9, traveler: 0 } } : {}) }, params: getBoatParams() });
      renderToStaticMarkup(<TrainerBoat3D sim={{ session } as unknown as SimulationModel} tp={tp} view="mainsheet" />);
      expect(captured.scene?.view).toBe(rig ? "mainsheet" : "sails");
      const presets = renderToStaticMarkup(<BoatViewPresets view="sails" onSelect={vi.fn()} mainTrim={rig} tp={tp} />);
      expect(presets.includes(">Mainsheet</button>")).toBe(rig);
    }
  });

  it("selects every free camera preset through the parent controller with 44px targets", () => {
    const select = vi.fn();
    const tree = BoatViewPresets({ view: "deck", onSelect: select, mainTrim: false, tp });
    const buttons = React.Children.toArray(tree.props.children) as React.ReactElement<{ onClick: () => void; className: string }>[];
    for (const button of buttons) {
      expect(button.props.className).toContain("min-h-11 min-w-11");
      button.props.onClick();
    }
    expect(select.mock.calls).toEqual([["sails"], ["deck"], ["whole"]]);
    expect(renderToStaticMarkup(tree)).toMatch(/aria-pressed="true"[^>]*>Deck<\/button>/);
  });
});
