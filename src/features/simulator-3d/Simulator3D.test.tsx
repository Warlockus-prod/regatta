import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SimTelemetry } from "./physics/useSailingSim";
import { Simulator3D } from "./Simulator3D";

const host = vi.hoisted(() => ({ compact: true, lang: "en", scenes: 0 }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useSyncExternalStore: (_subscribe: unknown, read: () => unknown) => read(),
}));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: host.lang, tl: (copy: Record<string, string>) => copy[host.lang] }) }));
vi.mock("./RegattaScene", () => ({ RegattaScene: () => { host.scenes++; return <div data-testid="shared-sailing-scene" />; } }));
vi.mock("../venues/useVenue", async () => {
  const { findVenue } = await import("@/data/venues/venues");
  return { useVenue: () => ({ venue: findVenue("gocek"), picked: findVenue("gocek"), shoreOn: true, setVenue: vi.fn(), setShoreOn: vi.fn() }) };
});
vi.mock("../trainer-controls", async original => {
  const actual = await original<typeof import("../trainer-controls")>();
  const { DEFAULT_CONTROL_PREFS } = await import("../trainer-controls/prefs");
  return { ...actual, useControlPrefs: () => ({ prefs: DEFAULT_CONTROL_PREFS, update: vi.fn() }) };
});
vi.mock("./audio/useSailAudio", () => ({ useSailAudio: () => ({ enabled: false, toggle: vi.fn(), update: vi.fn(), setActive: vi.fn() }) }));
vi.mock("./physics/useSailingSim", () => ({ useSailingSim: () => ({
  telemetry: { speedKn: 0, heelDeg: 0, twaSigned: 90, awaDeg: 90, awaSigned: 90, awsKn: 12, heading: 90,
    trimQuality: 0, vmg: 0, vmgTargetAngle: 48, targetSpeedKn: 0, coach: "reachOn", maneuver: "sailing",
    mainStatus: "drawing", jibStatus: "drawing", boomAngleDeg: 20, jibAngleDeg: 15, pos: { x: 0, z: 0 } } satisfies SimTelemetry,
  controls: { mainSheet: .3, jibSheet: .25, rudder: 0, reef: 0 }, wind: { twsKn: 12, fromDeg: 0 },
  setControl: vi.fn(), setWind: vi.fn(), reset: vi.fn(),
}) }));

beforeEach(() => {
  host.compact = true; host.lang = "en"; host.scenes = 0;
  vi.stubGlobal("React", React);
  vi.stubGlobal("window", { matchMedia: () => ({ matches: host.compact }) });
});
afterEach(() => vi.unstubAllGlobals());

describe("free 3D pose clarity and reserved layout", () => {
  it("keeps the shared scene and free angles in the same phone workspace without fake sheet wheels", () => {
    const html = renderToStaticMarkup(<Simulator3D initialMode="free" embed />);
    expect(html).toContain('data-testid="trainer-workspace"');
    expect(html).toContain('data-testid="pose-controls"');
    expect(host.scenes).toBe(1);
    expect(html).toContain("Angles directly pose the model");
    expect(html).toContain('aria-label="Boom angle"');
    expect(html).toContain('aria-label="Jib angle"');
    expect(html).toContain('min="0" max="85" step="1"');
    expect(html).toContain('min="0" max="70" step="1"');
    expect(html).toContain("Pinch or scroll to zoom");
    expect(html).not.toContain('data-testid="wheel-');
    expect(html).not.toContain('aria-label="Mainsheet');
  });

  it("uses the same angle meaning on desktop while Sailing keeps actual shared wheels", () => {
    host.compact = false;
    const desktop = renderToStaticMarkup(<Simulator3D initialMode="free" />);
    expect(desktop).toContain('aria-label="Boom angle"');
    expect(desktop).not.toContain('data-testid="trainer-workspace"');
    host.compact = true;
    const sailing = renderToStaticMarkup(<Simulator3D initialMode="sail" />);
    expect(sailing).toContain('data-testid="wheel-main"');
    expect(sailing).toContain('data-testid="wheel-jib"');
    expect(sailing).toContain('data-testid="wheel-helm"');
    expect(sailing).not.toContain('data-testid="pose-controls"');
  });

  it("names direct pose inspection and its boom angle in all seven languages", () => {
    for (const [lang, mode, boom] of [
      ["ru", "Осмотр формы", "Угол гика"], ["en", "Inspect shape", "Boom angle"], ["pl", "Oglądaj kształt", "Kąt bomu"],
      ["es", "Explorar forma", "Ángulo de botavara"], ["fr", "Observer la forme", "Angle de bôme"],
      ["de", "Form ansehen", "Baumwinkel"], ["it", "Esplora la forma", "Angolo del boma"],
    ]) {
      host.lang = lang;
      const html = renderToStaticMarkup(<Simulator3D initialMode="free" />);
      expect(html).toContain(mode); expect(html).toContain(`aria-label="${boom}"`);
    }
  });
});
