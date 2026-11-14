// Package 32, step 5 (owner 2026-11-13: "a diagram and a picture, never one without the other"):
// the two visuals of every practice scenario of the radio simulator.
//   - the schematic: who calls whom, with or without a DSC alert on channel 70, and on which
//     channel the voice goes (ScenarioDiagram.tsx draws it from SCENARIO_CALLS);
//   - the picture: the radio's own screen at the moment the scenario turns on, built from the same
//     model the simulator runs (scenarioScreen), so it can never show a screen the radio does not have.
// It lives outside src/app/radio: the course's text catalogue is built from every literal there
// (src/app/radio/localization/build-catalog.mjs), and these files hold drawing code, not copy.
// scenarioCalls.test.tsx fails for a scenario without either.
import { CHANNELS, DSC_VOICE_CHANNELS, INITIAL_RADIO, NATURES, OTHERDSC_CATEGORIES, OTHERDSC_TYPES, VESSEL_POOL, type RadioState } from "@/app/radio/symulator/radioModel";
import { SCENARIOS } from "@/app/radio/symulator/scenarios";
import { DEFAULT_VENUE, placeRadio, type Venue } from "@/app/radio/symulator/venues";

export type CallPriority = "distress" | "urgency" | "safety" | "routine" | "settings";
export type CallParty = "all" | "coast" | "ship" | "marina" | "vts" | "group" | "none";

export interface ScenarioCall {
  priority: CallPriority;
  /** Who the call goes to, or comes from. "none": a task on the radio itself, nothing goes on air. */
  party: CallParty;
  direction: "tx" | "rx" | "none";
  /** A DSC call on channel 70 comes first. */
  dsc: boolean;
  /** The voice channel the drawing names: a number, the venue's marina or VTS channel, or none (a DSC test has no voice part). */
  voice: "16" | "06" | "72" | "marina" | "vts" | null;
}

const settings: ScenarioCall = { priority: "settings", party: "none", direction: "none", dsc: false, voice: null };

/** What each scenario puts on air, by scenario id. */
export const SCENARIO_CALLS: Readonly<Record<string, ScenarioCall>> = {
  "fire-mayday": { priority: "distress", party: "all", direction: "tx", dsc: true, voice: "16" },
  "mob-mayday": { priority: "distress", party: "all", direction: "tx", dsc: true, voice: "16" },
  // The alert is already out; the cancellation is spoken to all stations on 16.
  "false-cancel": { priority: "distress", party: "all", direction: "tx", dsc: true, voice: "16" },
  // Someone else's distress, repeated by voice: no alert of our own.
  "mayday-relay": { priority: "distress", party: "all", direction: "tx", dsc: false, voice: "16" },
  "receive-distress": { priority: "distress", party: "ship", direction: "rx", dsc: true, voice: "16" },
  "engine-panpan": { priority: "urgency", party: "all", direction: "tx", dsc: true, voice: "16" },
  "panpan-medico": { priority: "urgency", party: "all", direction: "tx", dsc: true, voice: "16" },
  "securite-hazard": { priority: "safety", party: "all", direction: "tx", dsc: true, voice: "16" },
  "radio-check": { priority: "routine", party: "marina", direction: "tx", dsc: false, voice: "marina" },
  "routine-marina": { priority: "routine", party: "marina", direction: "tx", dsc: false, voice: "marina" },
  "vts-report": { priority: "routine", party: "vts", direction: "tx", dsc: false, voice: "vts" },
  "routine-ship": { priority: "routine", party: "ship", direction: "tx", dsc: true, voice: "06" },
  "group-call": { priority: "routine", party: "group", direction: "tx", dsc: true, voice: "06" },
  "receive-call": { priority: "routine", party: "ship", direction: "rx", dsc: true, voice: "72" },
  "dsc-test": { priority: "routine", party: "coast", direction: "tx", dsc: true, voice: null },
  "scan-memory": settings,
  "position-input": settings,
  "id-add-lyngby": settings,
  "id-delete-lyngby": settings,
};

export function scenarioCall(id: string): ScenarioCall | null {
  return Object.prototype.hasOwnProperty.call(SCENARIO_CALLS, id) ? SCENARIO_CALLS[id] : null;
}

/** The channel number the drawing prints for a call in this venue ("12", "71"), or null. */
export function voiceChannel(call: ScenarioCall, venue: Venue = DEFAULT_VENUE): string | null {
  if (call.voice === "marina") return venue.marina?.channel ?? "12";
  if (call.voice === "vts") return venue.vts?.channel ?? "71";
  return call.voice;
}

const channelIndex = (num: string) => Math.max(0, CHANNELS.findIndex(channel => channel.num === num));
/** A DSC call being composed. A routine call names a working channel (06), never 16; urgency and safety go to 16. */
const otherDsc = (type: (typeof OTHERDSC_TYPES)[number], category: (typeof OTHERDSC_CATEGORIES)[number]) =>
  ({ screen: "otherdsc-compose", odType: OTHERDSC_TYPES.indexOf(type), odCategory: OTHERDSC_CATEGORIES.indexOf(category),
    odChannel: DSC_VOICE_CHANNELS.indexOf(category === "Routine" ? "06" : "16") }) as const;

/**
 * The radio at the moment the scenario turns on: the screen a learner has to reach (or, for a
 * scenario that starts with a prepared radio, the screen it starts with). Null for an unknown id.
 */
export function scenarioScreen(id: string, venue: Venue = DEFAULT_VENUE): RadioState | null {
  const scenario = SCENARIOS.find(item => item.id === id);
  const call = scenarioCall(id);
  if (!scenario || !call) return null;
  // A scenario that starts with a prepared, powered radio (an alert already sent, a call coming
  // in) shows that screen. One that prepares a radio still switched off (its memory, its list of
  // addresses) keeps what it prepared and is shown switched on.
  const prepared = scenario.init?.(VESSEL_POOL[0], venue);
  if (prepared?.power) return placeRadio(prepared, venue);
  const on: RadioState = placeRadio({ ...(prepared ?? INITIAL_RADIO), power: true, screen: "standby" }, venue);
  const voice = voiceChannel(call, venue);
  switch (id) {
    case "fire-mayday": return { ...on, screen: "distress-nature", natureCursor: NATURES.indexOf("Fire,Explosion") };
    case "mob-mayday": return { ...on, screen: "distress-nature", natureCursor: NATURES.indexOf("Man Overboard") };
    case "engine-panpan": case "panpan-medico": return { ...on, ...otherDsc("All Ships", "Urgency") };
    case "securite-hazard": return { ...on, ...otherDsc("All Ships", "Safety") };
    case "routine-ship": return { ...on, ...otherDsc("Individual", "Routine") };
    case "group-call": return { ...on, ...otherDsc("Group", "Routine") };
    case "dsc-test": return { ...on, ...otherDsc("Test", "Safety") };
    // A radio check is made on low power, on the marina's working channel.
    case "radio-check": return { ...on, channelIndex: channelIndex(voice ?? "12"), hiPower: false };
    case "scan-memory": return { ...on, scanActive: true };
    case "position-input": return { ...on, screen: "position-input" };
    case "id-add-lyngby": return { ...on, screen: "individual-id-add-mmsi" };
    case "id-delete-lyngby": return { ...on, screen: "individual-id-delete" };
    // Voice calls on a working channel, and the relay on 16.
    default: return { ...on, channelIndex: channelIndex(voice ?? "16") };
  }
}

/**
 * The picture of a theory chapter (src/app/radio/teoria/courseData.ts): the radio's screen the
 * chapter is about. Nine of the eighteen chapters have one; the others are about something the
 * radio's screen does not show (range, the system as a whole, NAVTEX, EPIRB, SART and so on).
 */
const CHAPTER_SCREENS: Readonly<Record<string, (on: RadioState, venue: Venue) => RadioState>> = {
  // The watch on 16, the screen every control is read against.
  controls: on => on,
  // A ship-to-ship working channel.
  channels: on => ({ ...on, channelIndex: channelIndex("72") }),
  identity: on => ({ ...on, screen: "radio-info" }),
  routine: on => ({ ...on, ...otherDsc("Individual", "Routine") }),
  dsc: on => ({ ...on, screen: "menu" }),
  priority: on => ({ ...on, ...otherDsc("All Ships", "Urgency") }),
  mayday: on => ({ ...on, screen: "distress-nature", natureCursor: 0 }),
  receive: (on, venue) => scenarioScreen("receive-distress", venue) ?? on,
  // Low power: 1 W instead of 25 W.
  power: on => ({ ...on, hiPower: false }),
};
export const CHAPTERS_WITH_SCREEN: readonly string[] = Object.keys(CHAPTER_SCREENS);

export function chapterScreen(chapterId: string, venue: Venue = DEFAULT_VENUE): RadioState | null {
  if (!Object.prototype.hasOwnProperty.call(CHAPTER_SCREENS, chapterId)) return null;
  return CHAPTER_SCREENS[chapterId](placeRadio({ ...INITIAL_RADIO, power: true, screen: "standby" }, venue), venue);
}
