'use client';

import { useEffect, useState, type CSSProperties } from "react";

/**
 * Package 32: the schematic of a sailing subject, drawn on the site from src/data/sailing-schematics.ts.
 *
 * The drawings are loaded on demand, once, into one chunk every page shares: imported directly, they
 * were copied into the code of each of the eight pages that show them (the glossary, the points of
 * sail, the 15-minute cards, the rules, the tactics, the first lessons, the sail lessons, the
 * trainer), and the site's JS budget counts every copy (docs/STATUS.md). Until they arrive the tile
 * keeps the drawing's 4:3 place, so nothing moves when it appears. The app's bundled pages
 * (mobile/scripts/build-sailing-offline.mjs) inline the import.
 *
 * The drawing is decorative markup inside a labelled element: its own English label is dropped.
 */
type Schematics = typeof import("@/data/sailing-schematics");
let loading: Promise<Schematics> | null = null;
const load = () => (loading ??= import("@/data/sailing-schematics"));

const DECORATIVE = ' aria-hidden="true" style="display:block;width:100%;height:auto"';

export function SubjectSchematic({ id, label, style, testId }: { id: string; /** For assistive technology; none for a tile its row already names. */ label?: string; style?: CSSProperties; testId?: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    load().then(module => {
      if (live) setSvg(module.subjectSchematic(id)?.replace(/ role="img" aria-label="[^"]*"/, DECORATIVE) ?? null);
    }).catch(() => { /* a failed chunk keeps the empty tile; the picture beside it still shows */ });
    return () => { live = false; };
  }, [id]);
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return svg
    ? <div {...a11y} style={style} data-testid={testId} data-ready="true" dangerouslySetInnerHTML={{ __html: svg }} />
    : <div {...a11y} style={{ ...style, aspectRatio: "4 / 3" }} data-testid={testId} />;
}
