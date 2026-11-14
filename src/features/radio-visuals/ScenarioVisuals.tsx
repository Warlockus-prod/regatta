"use client";

// Package 32, step 5: the two visuals of a practice scenario (scenarioCalls.ts).
import { useRadioI18n } from "@/app/radio/localization/context";
import { UI_TERMS } from "@/lib/product/ui-terms";
import { RadioScreenFrame } from "@/app/radio/symulator/RadioFront";
import { chapterScreen, scenarioCall, scenarioScreen, voiceChannel, type CallParty, type CallPriority, type ScenarioCall } from "./scenarioCalls";
import type { Venue } from "@/app/radio/symulator/venues";

const INK = "#123247", MUTED = "#607583", PAPER = "#fffefa", HULL = "#e0e9ec";
// Distress red, urgency amber, safety teal, routine ink: the order of priority on air.
const PRIORITY_COLOR: Record<CallPriority, string> = { distress: "#b3261e", urgency: "#8a6100", safety: "#006d70", routine: INK, settings: MUTED };

const line = (d: string, color: string, width = 6, dash?: string) => <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} />;
/** Our yacht: a hull and a sail, seen from the side. */
const yacht = (x: number, y: number, scale = 1, key?: string) => (
  <g key={key} transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M-70 30H70L52 58H-50Z" fill={HULL} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    <path d="M0 22V-88L52 14Z" fill={PAPER} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    <path d="M-8 22V-70L-48 16Z" fill={PAPER} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
  </g>
);
/** A shore station: a mast with an aerial on a hut. */
const tower = (x: number, y: number) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M-44 58H44V14H-44Z" fill={HULL} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    {line("M0 14V-86M-26 -52H26M-16 -72H16", INK, 5)}
    <circle cx="0" cy="-92" r="7" fill={INK} />
  </g>
);
/** A ship: a hull with a bridge. */
const ship = (x: number, y: number) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M-86 16H86L66 58H-70Z" fill={HULL} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    <path d="M-30 16V-26H26V16M-8 -26V-58H8V-26" fill={PAPER} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
  </g>
);
/** A marina: a pier with berths. */
const marina = (x: number, y: number) => (
  <g transform={`translate(${x} ${y})`}>
    {line("M-70 40H70M-70 40V-30M-30 40V-10M10 40V-10M50 40V-10", INK, 7)}
    <path d="M-70 -30H-36V-52H-70Z" fill={HULL} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
  </g>
);
const PARTY: Record<Exclude<CallParty, "none">, React.ReactNode> = {
  coast: tower(620, 320),
  vts: tower(620, 320),
  marina: marina(620, 330),
  ship: ship(620, 320),
  group: <>{yacht(560, 250, 0.62, "a")}{yacht(680, 300, 0.62, "b")}{yacht(590, 390, 0.62, "c")}</>,
  all: <>{tower(690, 250)}{ship(600, 400)}{yacht(560, 250, 0.55, "a")}</>,
};

/** One arrow of the call with the channel it goes on: dashed for DSC, solid for voice. */
function lane(y: number, channel: string, color: string, dashed: boolean, back: boolean) {
  const from = back ? 470 : 250, to = back ? 250 : 470, head = back ? 22 : -22;
  return (
    <g>
      {line(`M${from} ${y}H${to}`, color, 9, dashed ? "18 14" : undefined)}
      {line(`M${to + head} ${y - 18}L${to} ${y}L${to + head} ${y + 18}`, color, 9)}
      <text x="360" y={y - 24} textAnchor="middle" fill={color} fontFamily="system-ui,sans-serif" fontSize="74" fontWeight="600">{channel}</text>
    </g>
  );
}

/**
 * The call as a drawing, 4:3: our yacht on the left, the other party on the right, a dashed arrow
 * for the DSC call on channel 70 and a solid one for the voice on its channel, in the colour of
 * the call's priority. A task on the radio itself shows the radio and its MENU key.
 */
export function ScenarioDiagram({ call, venue, label }: { call: ScenarioCall; venue?: Venue; label: string }) {
  const color = PRIORITY_COLOR[call.priority], voice = voiceChannel(call, venue), back = call.direction === "rx";
  return (
    <svg viewBox="0 0 800 600" role="img" aria-label={label} style={{ display: "block", width: "100%", height: "auto" }} data-testid="scenario-diagram" data-priority={call.priority}>
      <rect width="800" height="600" fill={PAPER} />
      {call.party === "none" ? (
        <g>
          <rect x="170" y="150" width="460" height="300" rx="28" fill={HULL} stroke={INK} strokeWidth="5" />
          <rect x="210" y="190" width="250" height="150" rx="10" fill={PAPER} stroke={INK} strokeWidth="4" />
          {line("M236 228H430M236 264H380M236 300H406", MUTED, 7)}
          <circle cx="540" cy="266" r="52" fill={PAPER} stroke={INK} strokeWidth="5" />
          <rect x="210" y="370" width="150" height="50" rx="10" fill={PAPER} stroke={color} strokeWidth="6" />
          <text x="285" y="408" textAnchor="middle" fill={color} fontFamily="system-ui,sans-serif" fontSize="34" fontWeight="700">MENU</text>
        </g>
      ) : (
        <g>
          {yacht(150, 320)}
          {PARTY[call.party]}
          {call.dsc && lane(voice ? 250 : 330, "70", color, true, back)}
          {voice && lane(call.dsc ? 440 : 330, voice, color, false, back && !call.dsc)}
        </g>
      )}
    </svg>
  );
}

const TILE = { margin: 0, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "#f5f3ee" } as const;
const CAPTION = { margin: 0, padding: "4px 8px", textAlign: "center", fontSize: 12, lineHeight: "16px", color: "#3f5568" } as const;

/** The schematic alone, small: the thumbnail of a row in the list of scenarios (the row names it). */
export function ScenarioThumb({ id, width = 64 }: { id: string; width?: number }) {
  const call = scenarioCall(id);
  if (!call) return null;
  return <span aria-hidden="true" style={{ display: "block", width, flexShrink: 0, overflow: "hidden", borderRadius: 6, border: "1px solid var(--border-subtle)" }} data-testid="scenario-thumb"><ScenarioDiagram call={call} label="" /></span>;
}

/** Both visuals of a scenario: the call as a drawing and the radio's screen at its key moment. */
export function ScenarioVisuals({ id, name, venue }: { id: string; name: string; venue?: Venue }) {
  const { tl } = useRadioI18n();
  const call = scenarioCall(id), screen = scenarioScreen(id, venue);
  if (!call || !screen) return null;
  const diagram = tl(UI_TERMS.visualDiagram), radio = tl(UI_TERMS.visualRadioScreen);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8, marginTop: 8 }} data-testid="scenario-visuals">
      <figure style={TILE}>
        <ScenarioDiagram call={call} venue={venue} label={`${name}: ${diagram}`} />
        <figcaption style={CAPTION}>{diagram}</figcaption>
      </figure>
      <figure style={TILE} role="img" aria-label={`${name}: ${radio}`}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", background: "#0b1418" }}><RadioScreenFrame s={screen} /></div>
        <figcaption style={CAPTION}>{radio}</figcaption>
      </figure>
    </div>
  );
}

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
