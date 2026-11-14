// Package 32 (owner 2026-11-13: "a diagram and a picture, never one without the other, never in
// one section and missing in the next"): the sailing subjects that are not parts of the yacht:
// the points of sail and the two turns, the wind, and sail trim. Every subject has
//   - a schematic, drawn by the shared lesson renderer (src/lib/learning/foundation-drawings.ts), and
//   - a picture: a frame of the real 3D scene in that state (scripts/capture-subject-frames.mjs,
//     scripts/build-subject-visuals.mjs).
// The site and the app read both from here (src/components/visuals/SubjectVisuals.tsx,
// mobile/src/learning/SubjectVisuals.tsx): the glossary, the points-of-sail page, the 15-minute
// cards, the sail lessons and the trainer's exercises name a subject by id and show the same pair.
// sailing-visuals.test.ts fails when a subject lacks either visual, or when a section that
// teaches a subject does not name it.
// No "@/..." import here: the app reads this module through Metro's watched folders.
import { NO_GO_HALF_DEG } from "../lib/sailing-physics/constants";
import {
  renderApparentWind, renderCourseChange, renderHeel, renderPointOfSail, renderSailEdge, renderSide, renderSlot, renderTrim, renderTurn,
  renderWindField, renderWindShift, type GraphicTheme,
} from "../lib/learning/foundation-drawings";

export const SAILING_PICTURE_SIZE = { width: 640, height: 480 } as const;

type Painter = (theme?: GraphicTheme) => string;
interface PointSubject { kind: "point"; /** Heading off the wind the schematic and the frame show, degrees. */ angle: number; /** Boom angle in the schematic. */ boom: number }
interface TurnSubject { kind: "turn"; turn: "tacking" | "jibing" }
interface DrawnSubject { kind: "wind" | "trim"; draw: Painter }
type Subject = PointSubject | TurnSubject | DrawnSubject;

/** The points of sail and the turns; ids are those of pointsOfSail and maneuvers in sailing-data.ts. */
export const COURSE_SUBJECTS = {
  "in-irons": { kind: "point", angle: 0, boom: 0 },
  "close-hauled": { kind: "point", angle: 45, boom: 22 },
  "beam-reach": { kind: "point", angle: 90, boom: 48 },
  "broad-reach": { kind: "point", angle: 135, boom: 75 },
  running: { kind: "point", angle: 180, boom: 85 },
  tacking: { kind: "turn", turn: "tacking" },
  jibing: { kind: "turn", turn: "jibing" },
} as const satisfies Record<string, PointSubject | TurnSubject>;

/** The wind; ids are those of the glossary's wind terms. */
export const WIND_SUBJECTS = {
  "true-wind": { kind: "wind", draw: theme => renderWindField("steady", theme) },
  "apparent-wind": { kind: "wind", draw: renderApparentWind },
  windward: { kind: "wind", draw: theme => renderSide("windward", theme) },
  leeward: { kind: "wind", draw: theme => renderSide("leeward", theme) },
  gust: { kind: "wind", draw: theme => renderWindField("gust", theme) },
  lull: { kind: "wind", draw: theme => renderWindField("lull", theme) },
  "wind-shift": { kind: "wind", draw: renderWindShift },
} as const satisfies Record<string, DrawnSubject>;

/** Heel the schematic of "heeling" draws: what the trainer reads in the frame beside it (16 knots, sheets hard in), degrees. */
export const HEEL_SHOWN_DEG = 22;

/** Sail trim: the terms of the glossary and what the trim lessons and exercises practise. */
export const TRIM_SUBJECTS = {
  trim: { kind: "trim", draw: renderTrim },
  halyard: { kind: "trim", draw: theme => renderSailEdge("halyard", theme) },
  "luff-sail": { kind: "trim", draw: theme => renderSailEdge("luff", theme) },
  leech: { kind: "trim", draw: theme => renderSailEdge("leech", theme) },
  heeling: { kind: "trim", draw: theme => renderHeel(HEEL_SHOWN_DEG, theme) },
  slot: { kind: "trim", draw: renderSlot },
  luffing: { kind: "trim", draw: theme => renderCourseChange("luff", theme) },
  "bearing-away": { kind: "trim", draw: theme => renderCourseChange("bear", theme) },
} as const satisfies Record<string, DrawnSubject>;

export const SAILING_SUBJECTS = { ...COURSE_SUBJECTS, ...WIND_SUBJECTS, ...TRIM_SUBJECTS };
export type SailingSubjectId = keyof typeof SAILING_SUBJECTS;
export const SAILING_SUBJECT_IDS = Object.keys(SAILING_SUBJECTS) as SailingSubjectId[];

/** Other ids the same subjects go by: the glossary names some terms with a prefix, and the no-go zone is the in-irons sector. */
export const SAILING_SUBJECT_ALIASES: Readonly<Record<string, SailingSubjectId>> = {
  "course-in-irons": "in-irons", "no-go-zone": "in-irons", "course-close-hauled": "close-hauled", "course-beam-reach": "beam-reach",
  "course-broad-reach": "broad-reach", "course-running": "running", "man-tacking": "tacking", "man-jibing": "jibing",
  "man-luffing": "luffing", "man-bearing-away": "bearing-away",
};

/** The subject an item id stands for, or null. */
export function sailingSubject(id: string): SailingSubjectId | null {
  if (Object.prototype.hasOwnProperty.call(SAILING_SUBJECTS, id)) return id as SailingSubjectId;
  return Object.prototype.hasOwnProperty.call(SAILING_SUBJECT_ALIASES, id) ? SAILING_SUBJECT_ALIASES[id] : null;
}

export interface SailingVisuals {
  id: SailingSubjectId;
  picture: { src: string; width: number; height: number };
  /** The schematic as SVG markup, 800x600. */
  schematic: Painter;
}

const pictureOf = (file: string) => ({ src: `/learning/subjects/${file}.webp`, ...SAILING_PICTURE_SIZE });

/** Both visuals of a sailing subject, by its id or an alias; null for anything else. */
export function sailingVisuals(id: string): SailingVisuals | null {
  const subject = sailingSubject(id);
  if (!subject) return null;
  const spec: Subject = SAILING_SUBJECTS[subject];
  return {
    id: subject,
    picture: pictureOf(subject),
    schematic: theme => spec.kind === "point" ? renderPointOfSail(spec.angle, spec.boom, NO_GO_HALF_DEG, theme) : spec.kind === "turn" ? renderTurn(spec.turn, theme) : spec.draw(theme),
  };
}

/**
 * Sections outside the glossary and the points-of-sail page that teach these subjects, with the
 * subjects each one names, in reading order (the 15-minute refresher's cards). They show the
 * same two visuals.
 */
export const SAILING_SECTIONS = {
  quick: {
    "q-wind": ["true-wind", "windward", "leeward", "in-irons"],
    "q-courses": ["in-irons", "close-hauled", "beam-reach", "broad-reach", "running"],
    "q-maneuvers": ["tacking", "jibing"],
  },
} as const satisfies Record<string, Record<string, readonly SailingSubjectId[]>>;

export function sailingSectionSubjects(page: keyof typeof SAILING_SECTIONS, section: string): readonly SailingSubjectId[] {
  const sections: Record<string, readonly SailingSubjectId[]> = SAILING_SECTIONS[page];
  return Object.prototype.hasOwnProperty.call(sections, section) ? sections[section] : [];
}

/**
 * The picture of every lesson of "Working with sails" (src/data/sailing-lab). A lesson draws its
 * own schematic (src/features/sailing-lab/lessons/diagrams.ts); its picture is the frame of the
 * subject it teaches, the render of the yacht part it works with, or a frame of its own
 * ("lesson-<id>", taken by the same script in the state the lesson talks about).
 */
export const SAIL_LESSON_PICTURES = {
  "rig-basics": { part: "boom" },
  "apparent-wind": { frame: "apparent-wind" },
  "sheet-control": { frame: "lesson-sheet-control" },
  mainsheet: { part: "mainsheet" },
  vang: { frame: "lesson-vang" },
  outhaul: { frame: "lesson-outhaul" },
  telltales: { frame: "lesson-telltales" },
  halyard: { frame: "halyard" },
  "jib-lead": { part: "jib-sheet" },
  slot: { frame: "slot" },
  "trim-doctor": { part: "wheel" },
  reef: { frame: "lesson-reef" },
  "winch-clutch": { part: "winch" },
} as const satisfies Record<string, { frame: string } | { part: string }>;

/** Frames that belong to a lesson only (no subject of the registry has them). */
export const LESSON_FRAME_IDS: readonly string[] = Object.values(SAIL_LESSON_PICTURES).flatMap(picture => "frame" in picture && picture.frame.startsWith("lesson-") ? [picture.frame] : []);

export interface LessonPicture { src: string; width: number; height: number; /** Which file the app bundles for it. */ asset: { frame: string } | { part: string } }

/** The picture of a sail lesson, or null for an id that is not one. */
export function sailLessonPicture(lessonId: string): LessonPicture | null {
  if (!Object.prototype.hasOwnProperty.call(SAIL_LESSON_PICTURES, lessonId)) return null;
  const asset: { frame: string } | { part: string } = SAIL_LESSON_PICTURES[lessonId as keyof typeof SAIL_LESSON_PICTURES];
  return "frame" in asset ? { ...pictureOf(asset.frame), asset } : { src: `/anatomy/parts/${asset.part}.webp`, width: 800, height: 600, asset };
}

/**
 * The subject each exercise of the trainer catalogue (src/data/drills.ts) practises. The
 * exercise's card shows that subject's schematic and picture, so an exercise is never the one
 * item on its screen without them.
 */
export const DRILL_SUBJECTS: Readonly<Record<string, SailingSubjectId>> = {
  "beam-healthy": "beam-reach",
  overpowered: "heeling",
  "main-overtrim": "trim",
  "bad-slot": "slot",
  "hold-trim": "trim",
  "recover-stall": "leech",
  "reduce-heel": "heeling",
  twa45: "close-hauled",
  noGo: "in-irons",
  reach90: "beam-reach",
  shiftReact: "wind-shift",
  gustTrim: "gust",
  noGoRecovery: "bearing-away",
  windwardReturn: "tacking",
  beamRun: "beam-reach",
  tackTwice: "tacking",
};

/** Both visuals of a trainer exercise (those of the subject it practises), or null. */
export function drillVisuals(drillId: string): SailingVisuals | null {
  return Object.prototype.hasOwnProperty.call(DRILL_SUBJECTS, drillId) ? sailingVisuals(DRILL_SUBJECTS[drillId]) : null;
}
