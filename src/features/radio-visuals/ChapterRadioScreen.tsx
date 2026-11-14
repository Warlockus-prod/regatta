"use client";

// Package 32, step 5: the radio's screen beside a theory chapter's drawing (chapterScreens.ts).
import { useRadioI18n } from "@/app/radio/localization/context";
import { RadioScreenFrame } from "@/app/radio/symulator/RadioFront";
import { UI_TERMS } from "@/lib/product/ui-terms";
import { chapterScreen } from "./chapterScreens";

const TILE = { margin: 0, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "#f5f3ee" } as const;
const CAPTION = { margin: 0, padding: "4px 8px", textAlign: "center", fontSize: 12, lineHeight: "16px", color: "#3f5568" } as const;

/** The picture of a theory chapter: the radio's screen it is about, beside the chapter's own drawing. Nothing for a chapter without one. */
export function ChapterRadioScreen({ chapterId }: { chapterId: string }) {
  const { tl } = useRadioI18n();
  const screen = chapterScreen(chapterId);
  if (!screen) return null;
  const radio = tl(UI_TERMS.visualRadioScreen);
  return (
    <figure style={{ ...TILE, maxWidth: 320, marginTop: 12 }} role="img" aria-label={radio} data-testid="chapter-radio-screen">
      <div style={{ background: "#0b1418" }}><RadioScreenFrame s={screen} /></div>
      <figcaption style={CAPTION}>{radio}</figcaption>
    </figure>
  );
}
