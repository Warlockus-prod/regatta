'use client';

import { useI18n, type Lang } from "@/lib/i18n";
import type { RaceGuidance } from "@/lib/race-guidance";
import { routeCaption, type RouteCaptionKind } from "./route-caption";

// ============================================================================
// Package 8 (TestFlight 74 feedback, audit K5): the route hint says in words
// when to tack or gybe and on what course, next to the yellow band it
// explains (the swatch is the band's colour). Solo and online read the same
// caption; the race settings switch "Route and hints" hides both.
// ============================================================================

/** The yellow of the route on the water (GUIDANCE_TURN in RaceScene.tsx), not imported: that module loads three.js. */
const ROUTE_YELLOW = "#ffd23f";

/** {h}: the course to hold now, {d}: distance to the turn, {c}: the course after it (or to steer to). */
export const ROUTE_CAPTION_COPY: Record<Exclude<RouteCaptionKind, "other">, Record<Lang, string>> = {
  "tack-now": { ru: "Поворот оверштаг сейчас, курс {c}°", en: "Tack now, course {c}°", pl: "Zwrot przez sztag teraz, kurs {c}°", es: "Vira ahora, rumbo {c}°", fr: "Vire maintenant, cap {c}°", de: "Jetzt wenden, Kurs {c}°", it: "Vira ora, rotta {c}°" },
  "gybe-now": { ru: "Поворот фордевинд сейчас, курс {c}°", en: "Gybe now, course {c}°", pl: "Zwrot przez rufę teraz, kurs {c}°", es: "Traslucha ahora, rumbo {c}°", fr: "Empanne maintenant, cap {c}°", de: "Jetzt halsen, Kurs {c}°", it: "Abbatti ora, rotta {c}°" },
  "tack-ahead": { ru: "Держи {h}°, через {d} оверштаг на {c}°", en: "Hold {h}°, tack in {d} to {c}°", pl: "Trzymaj {h}°, za {d} zwrot przez sztag na {c}°", es: "Mantén {h}°, en {d} vira a {c}°", fr: "Garde {h}°, dans {d} vire au cap {c}°", de: "Halte {h}°, in {d} Wende auf {c}°", it: "Tieni {h}°, tra {d} vira a {c}°" },
  "gybe-ahead": { ru: "Держи {h}°, через {d} фордевинд на {c}°", en: "Hold {h}°, gybe in {d} to {c}°", pl: "Trzymaj {h}°, za {d} zwrot przez rufę na {c}°", es: "Mantén {h}°, en {d} traslucha a {c}°", fr: "Garde {h}°, dans {d} empanne au cap {c}°", de: "Halte {h}°, in {d} Halse auf {c}°", it: "Tieni {h}°, tra {d} abbatti a {c}°" },
  hold: { ru: "Держи {c}°", en: "Hold {c}°", pl: "Trzymaj {c}°", es: "Mantén {c}°", fr: "Garde {c}°", de: "Halte {c}°", it: "Tieni {c}°" },
  steer: { ru: "Поверни на {c}°", en: "Turn to {c}°", pl: "Skręć na {c}°", es: "Gira a {c}°", fr: "Viens au {c}°", de: "Auf {c}° drehen", it: "Accosta a {c}°" },
};

/** The route call: what to do and on what course, then (unless `target` is
 * false, where the route row below already says it) how far the target is. */
export function RouteCaption({ guidance, metres, fallback, target = true }: {
  guidance: RaceGuidance;
  /** Formats a distance in metres with the unit ("120 м"). */
  metres: (value: number) => string;
  /** The hint's own words for a step without a course (round the mark, return behind the line). */
  fallback: string;
  target?: boolean;
}) {
  const { tl } = useI18n();
  const caption = routeCaption(guidance);
  const text = caption.kind === "other" ? fallback
    : tl(ROUTE_CAPTION_COPY[caption.kind]).replace("{h}", String(caption.hold)).replace("{d}", metres(caption.turnIn)).replace("{c}", String(caption.course));
  return <span data-testid="race-route-caption" data-leg={guidance.leg} data-action={guidance.action} data-kind={caption.kind}
    data-course={caption.course} data-steer={caption.hold}>
    {/* Inline, so the words flow beside the hint log button like the coach line they replace. */}
    <span aria-hidden="true" style={{ display: "inline-block", width: 14, height: 5, marginRight: 8, verticalAlign: "middle", borderRadius: 3, background: ROUTE_YELLOW, border: "1px solid #0a1a2a" }} />
    {target ? `${text} · ${metres(caption.target)}` : text}
  </span>;
}
