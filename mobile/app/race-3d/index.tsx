import { useI18n } from "../../src/i18n/context";
import { SimWebView } from "../../src/simulator/SimWebView";
import { useVenue } from "../../src/persistence/venue";
import { SHORE_STORAGE_KEY, VENUE_STORAGE_KEY } from "../../../src/data/venues/venues";

/**
 * The solo race seen from the boat: the website race (/game) in 3D, with the
 * venue and the shore switch picked in the Race hub. Online, like the other
 * web scenes; offline it falls back to the native top-down race.
 *
 * TestFlight build 57 opens the next renderer's vertical slice (ADR-0008:
 * WebGPU or WebGL2, tactical camera, frame-rate readout) to measure it on a
 * real iPhone. Before an App Store release this either becomes the default
 * race or the flags go.
 */
const SLICE = { scene: "next", camera: "high", fps: "1" } as const;
export default function Race3D() {
  const { tp } = useI18n();
  const { picked, shoreOn } = useVenue();
  // The race menu is taller than a phone, so the page scrolls (the race itself fits the screen).
  return <SimWebView path="/game" query={{ view: "3d", ...SLICE }} scrollEnabled
    title={tp("3D-гонка", "3D race", "Wyścig 3D", { es: "Regata en 3D", fr: "Course en 3D", de: "3D-Rennen", it: "Regata in 3D" })}
    localStorage={{ [VENUE_STORAGE_KEY]: picked.id, [SHORE_STORAGE_KEY]: shoreOn ? "on" : "off" }}
    fallbackRoute="/game"
    fallbackLabel={tp("Гонка без 3D, офлайн", "Race without 3D, offline", "Wyścig bez 3D, offline", { es: "Regata sin 3D, sin conexión", fr: "Course sans 3D, hors ligne", de: "Rennen ohne 3D, offline", it: "Regata senza 3D, offline" })} />;
}
