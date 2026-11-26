import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mainTrimWheelTarget } from "../simulator-v3/ui/pods/MainTrimPod";
import { DEFAULT_CONTROL_PREFS } from "./prefs";
import { useControlLabels } from "./labels";
import { CORNER_DECK_MAX_H, CORNER_DECK_MIN_W, WheelDeck, cornerDeck } from "./WheelDeck";
import type { WheelProps } from "./Wheel";

const captured = vi.hoisted(() => new Map<string, WheelProps>());
vi.mock("./Wheel", () => ({ Wheel: (props: WheelProps) => { captured.set(props.testId!, props); return null; } }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ tl: (copy: Record<string, string>) => copy.en }) }));
beforeEach(() => { vi.stubGlobal("React", React); captured.clear(); });
afterEach(() => vi.unstubAllGlobals());
const helm = { mapping: "course" as const, value: "50°", unit: "course", ariaNow: 50, ariaMin: -180, ariaMax: 180 };

function Deck({ main }: { main: React.ComponentProps<typeof WheelDeck>["main"] }) {
  return <WheelDeck helm={helm} main={main} jib={{ ease: .3, setEase: vi.fn() }} labels={useControlLabels()}
    prefs={DEFAULT_CONTROL_PREFS} layout="bottom" hideHint />;
}

describe("physical mainsheet wheel adapter", () => {
  it("reaches the study's exact 9 m and 11 m with successive keyboard steps", () => {
    let length = 9;
    const target = mainTrimWheelTarget({ workingLength: length, traveler: 0 }, -15, value => { length = value; });
    renderToStaticMarkup(<Deck main={target} />);
    const main = captured.get("wheel-main")!;
    expect(main.valueText).toBe("9.0 m (15.0°)");
    expect([main.ariaNow, main.ariaMin, main.ariaMax]).toEqual([9, 6.4, 32]);
    for (let step = 0; step < 20; step++) main.onStep(1);
    expect(length).toBeCloseTo(11, 10);
    for (let step = 0; step < 20; step++) main.onStep(-1);
    expect(length).toBeCloseTo(9, 10);
    main.onStep(-Infinity); expect(length).toBe(6.4);
    main.onStep(Infinity); expect(length).toBe(32);
  });

  it("turns the real working-length command, clamps its limits and leaves traveler untouched", () => {
    const command = { workingLength: 9, traveler: -.4 };
    renderToStaticMarkup(<Deck main={mainTrimWheelTarget(command, 15, value => { command.workingLength = value; })} />);
    captured.get("wheel-main")!.onTurn(-360);
    expect(command.workingLength).toBeCloseTo(9 + (32 - 6.4) * .25);
    expect(command.traveler).toBe(-.4);
    captured.get("wheel-main")!.onTurn(10000); expect(command.workingLength).toBe(6.4);
    captured.get("wheel-main")!.onTurn(-10000); expect(command.workingLength).toBe(32);
  });

  it("preserves the ordinary percentage sheet's 5% step and spoken scale", () => {
    const setEase = vi.fn();
    renderToStaticMarkup(<Deck main={{ ease: .2, angleDeg: 25, setEase }} />);
    const main = captured.get("wheel-main")!;
    main.onStep(1); main.onStep(1);
    expect(setEase.mock.calls).toEqual([[.25], [.3]]);
    expect(main.valueText).toContain("20% (25°)");
    expect([main.ariaNow, main.ariaMin, main.ariaMax]).toEqual([20, 0, 100]);
  });
});

// Package 32, game screen. Contract: only a bottom deck laid across a turned phone (wide and
// short) with both sheets moves its wheels to the corners; an upright phone, a side column and
// a helm-only deck keep the helm in the middle.
describe("wheels in the corners of a turned phone", () => {
  it("uses the corner layout for a wide, short bottom deck with sheets", () => {
    expect(cornerDeck("bottom", 816, 200, true)).toBe(true);
    expect(cornerDeck("bottom", CORNER_DECK_MIN_W, CORNER_DECK_MAX_H, true)).toBe(true);
  });
  it("keeps the helm in the middle everywhere else", () => {
    expect(cornerDeck("bottom", 390, 212, true)).toBe(false);
    expect(cornerDeck("bottom", 816, 320, true)).toBe(false);
    expect(cornerDeck("column", 816, 200, true)).toBe(false);
    expect(cornerDeck("bottom", 816, 200, false)).toBe(false);
  });
});

