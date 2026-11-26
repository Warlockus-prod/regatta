'use client';

import { useLayoutEffect, useState, type RefObject } from "react";
import type { Language } from "../../lib/product/catalog";
import { adsCopy } from "../../lib/ads-copy";
import { BOARD_VIEW_SAMPLES, type BoardBlock } from "./board-viewability";
import type { BoardReading } from "./FloatingBoard";
import styles from "./AdsLab.module.css";

const BLOCK_COPY: Record<BoardBlock, keyof typeof adsCopy> = {
  image: "blockImage", hidden: "blockHidden", back: "blockBack", frame: "blockFrame", angle: "blockAngle", small: "blockSmall", occluded: "blockOccluded",
};
const percent = (value: number, lang: Language) => `${(value * 100).toFixed(2).replace(".", lang === "en" ? "." : ",")}%`;

/** Live figures over the scene. Owns its state, so five samples a second never re-render the Canvas. */
export function BoardMeter({ lang, channelRef }: { lang: Language; channelRef: RefObject<((reading: BoardReading) => void) | null> }) {
  const [reading, setReading] = useState<BoardReading | null>(null);
  useLayoutEffect(() => {
    channelRef.current = setReading;
    return () => { channelRef.current = null; };
  }, [channelRef]);
  if (!reading) return null;
  const state = reading.counted ? "counted" : reading.viewable ? "viewable" : "blocked";
  const headline = reading.counted ? adsCopy.counted[lang] : reading.block ? adsCopy[BLOCK_COPY[reading.block]][lang] : adsCopy.viewable[lang];
  return <div className={styles.meter} data-state={state} data-testid="board-meter" role="status" aria-live="off">
    <strong>{headline}</strong>
    <dl>
      <dt>{adsCopy.meterShare[lang]}</dt><dd>{percent(reading.visibleShare, lang)}</dd>
      <dt>{adsCopy.meterAngle[lang]}</dt><dd>{Math.round(reading.angleDeg)}°</dd>
      <dt>{adsCopy.meterBlocked[lang]}</dt><dd>{Math.round(reading.occluded * 100)}%</dd>
      <dt>{adsCopy.meterDistance[lang]}</dt><dd>{Math.round(reading.distance)} {adsCopy.metres[lang]}, {Math.round(reading.pixels[0])}x{Math.round(reading.pixels[1])} px</dd>
      <dt>{adsCopy.meterRun[lang]}</dt><dd>{Math.min(reading.streak, BOARD_VIEW_SAMPLES)} / {BOARD_VIEW_SAMPLES}</dd>
    </dl>
  </div>;
}
