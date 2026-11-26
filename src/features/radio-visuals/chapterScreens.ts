// Package 32, step 5: the picture of a radio theory chapter (src/app/radio/teoria/courseData.ts):
// the radio's own screen the chapter is about, built from the simulator's model.
// A module of its own, without the scenarios: the theory page shows nine small screens and must
// not load the practice scenarios for them (the JS budget counts every copy).
import { CHANNELS, DSC_VOICE_CHANNELS, INITIAL_RADIO, OTHERDSC_CATEGORIES, OTHERDSC_TYPES, RX_DISTRESS, type RadioState } from "@/app/radio/symulator/radioModel";
import { DEFAULT_VENUE, placeRadio, type Venue } from "@/app/radio/symulator/venues";

const channelIndex = (num: string) => Math.max(0, CHANNELS.findIndex(channel => channel.num === num));
/** A DSC call being composed. A routine call names a working channel (06), never 16; urgency and safety go to 16. */
const otherDsc = (type: (typeof OTHERDSC_TYPES)[number], category: (typeof OTHERDSC_CATEGORIES)[number]) =>
  ({ screen: "otherdsc-compose", odType: OTHERDSC_TYPES.indexOf(type), odCategory: OTHERDSC_CATEGORIES.indexOf(category),
    odChannel: DSC_VOICE_CHANNELS.indexOf(category === "Routine" ? "06" : "16") }) as const;

/**
 * The screen of each chapter that has one. Nine of the eighteen chapters do; the others are about something the
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
  // A distress alert from another vessel on the screen (the state the scenario "receive-distress" starts with).
  receive: (on, venue) => ({ ...on, screen: "rx-distress-alert",
    rxDistress: { name: RX_DISTRESS.name, mmsi: RX_DISTRESS.mmsi, spoken: venue.rxDistress.spoken, nature: RX_DISTRESS.nature, pob: RX_DISTRESS.pob } }),
  // Low power: 1 W instead of 25 W.
  power: on => ({ ...on, hiPower: false }),
};
export const CHAPTERS_WITH_SCREEN: readonly string[] = Object.keys(CHAPTER_SCREENS);

export function chapterScreen(chapterId: string, venue: Venue = DEFAULT_VENUE): RadioState | null {
  if (!Object.prototype.hasOwnProperty.call(CHAPTER_SCREENS, chapterId)) return null;
  return CHAPTER_SCREENS[chapterId](placeRadio({ ...INITIAL_RADIO, power: true, screen: "standby" }, venue), venue);
}
