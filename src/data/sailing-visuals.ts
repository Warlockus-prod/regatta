// Package 32, second subject (owner 2026-11-13: "a diagram and a picture, never one without the
// other, never in one section and missing in the next"): the points of sail and the two turns.
// Every subject has
//   - a schematic, drawn by the shared lesson renderer (src/lib/learning/foundation-drawings.ts:
//     renderPointOfSail, renderTurn), and
//   - a picture: a frame of the real 3D scene on that course (scripts/capture-course-frames.mjs,
//     scripts/build-course-visuals.mjs).
// The site and the app read both from here (src/components/visuals/SubjectVisuals.tsx,
// mobile/src/learning/SubjectVisuals.tsx). sailing-visuals.test.ts fails when a subject lacks
// either, or when a section that teaches a subject does not name it.
// No "@/..." import here: the app reads this module through Metro's watched folders.
import { NO_GO_HALF_DEG } from "../lib/sailing-physics/constants";
import { renderPointOfSail, renderTurn, type GraphicTheme } from "../lib/learning/foundation-drawings";

export const SAILING_PICTURE_SIZE = { width: 640, height: 480 } as const;

interface PointSubject { kind: "point"; /** Heading off the wind the schematic and the frame show, degrees. */ angle: number; /** Boom angle in the schematic. */ boom: number }
interface TurnSubject { kind: "turn"; turn: "tacking" | "jibing" }

/** Ids are those of pointsOfSail and maneuvers in sailing-data.ts. */
export const SAILING_SUBJECTS = {
  "in-irons": { kind: "point", angle: 0, boom: 0 },
  "close-hauled": { kind: "point", angle: 45, boom: 22 },
  "beam-reach": { kind: "point", angle: 90, boom: 48 },
  "broad-reach": { kind: "point", angle: 135, boom: 75 },
  running: { kind: "point", angle: 180, boom: 85 },
  tacking: { kind: "turn", turn: "tacking" },
  jibing: { kind: "turn", turn: "jibing" },
} as const satisfies Record<string, PointSubject | TurnSubject>;

export type SailingSubjectId = keyof typeof SAILING_SUBJECTS;
export const SAILING_SUBJECT_IDS = Object.keys(SAILING_SUBJECTS) as SailingSubjectId[];

/** Other ids the same subjects go by: the glossary names its terms with a prefix, and the no-go zone is the in-irons sector. */
export const SAILING_SUBJECT_ALIASES: Readonly<Record<string, SailingSubjectId>> = {
  "course-in-irons": "in-irons", "no-go-zone": "in-irons", "course-close-hauled": "close-hauled", "course-beam-reach": "beam-reach",
  "course-broad-reach": "broad-reach", "course-running": "running", "man-tacking": "tacking", "man-jibing": "jibing",
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
  schematic: (theme?: GraphicTheme) => string;
}

/** Both visuals of a point of sail or a turn, by its id or an alias; null for anything else. */
export function sailingVisuals(id: string): SailingVisuals | null {
  const subject = sailingSubject(id);
  if (!subject) return null;
  const spec: PointSubject | TurnSubject = SAILING_SUBJECTS[subject];
  return {
    id: subject,
    picture: { src: `/learning/courses/${subject}.webp`, ...SAILING_PICTURE_SIZE },
    schematic: theme => spec.kind === "point" ? renderPointOfSail(spec.angle, spec.boom, NO_GO_HALF_DEG, theme) : renderTurn(spec.turn, theme),
  };
}

/**
 * Sections outside the points-of-sail page that teach these subjects, with the subjects each
 * one names, in reading order (the 15-minute refresher's cards). They show the same two visuals.
 */
export const SAILING_SECTIONS = {
  quick: {
    "q-courses": ["in-irons", "close-hauled", "beam-reach", "broad-reach", "running"],
    "q-maneuvers": ["tacking", "jibing"],
  },
} as const satisfies Record<string, Record<string, readonly SailingSubjectId[]>>;

export function sailingSectionSubjects(page: keyof typeof SAILING_SECTIONS, section: string): readonly SailingSubjectId[] {
  const sections: Record<string, readonly SailingSubjectId[]> = SAILING_SECTIONS[page];
  return Object.prototype.hasOwnProperty.call(sections, section) ? sections[section] : [];
}
