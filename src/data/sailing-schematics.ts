// Package 32: the schematic of every sailing subject of src/data/sailing-visuals.ts, by id.
// Kept apart from the registry so the site loads the drawings once, in one shared chunk, and only
// when a schematic is on screen (src/components/visuals/SubjectSchematic.tsx imports this module
// on demand); a page that shows a subject's picture alone never loads them. The app imports it
// directly (mobile/src/learning/SubjectVisuals.tsx).
// No "@/..." import here: the app reads this module through Metro's watched folders.
import { NO_GO_HALF_DEG } from "../lib/sailing-physics/constants";
import type { GraphicTheme } from "../lib/learning/drawing-kit";
import {
  renderApparentWind, renderCourseChange, renderHeel, renderPointOfSail, renderRace, renderSailEdge, renderSide, renderSlot, renderTrim, renderTurn,
  renderWindField, renderWindShift,
} from "../lib/learning/subject-drawings";
import { COURSE_SUBJECTS, HEEL_SHOWN_DEG, RACE_SUBJECTS, sailingSubject, type SailingSubjectId } from "./sailing-visuals";

type Painter = (theme?: GraphicTheme) => string;

const point = (id: keyof typeof COURSE_SUBJECTS): Painter => {
  const spec = COURSE_SUBJECTS[id];
  return theme => spec.kind === "point" ? renderPointOfSail(spec.angle, spec.boom, NO_GO_HALF_DEG, theme) : renderTurn(spec.turn, theme);
};
const race = (id: keyof typeof RACE_SUBJECTS): Painter => theme => renderRace(id, theme);

/** The drawing of each subject. `satisfies` makes a subject without one a type error. */
const SCHEMATICS = {
  "in-irons": point("in-irons"), "close-hauled": point("close-hauled"), "beam-reach": point("beam-reach"), "broad-reach": point("broad-reach"),
  running: point("running"), tacking: point("tacking"), jibing: point("jibing"),
  "true-wind": theme => renderWindField("steady", theme),
  "apparent-wind": renderApparentWind,
  windward: theme => renderSide("windward", theme),
  leeward: theme => renderSide("leeward", theme),
  gust: theme => renderWindField("gust", theme),
  lull: theme => renderWindField("lull", theme),
  "wind-shift": renderWindShift,
  trim: renderTrim,
  halyard: theme => renderSailEdge("halyard", theme),
  "luff-sail": theme => renderSailEdge("luff", theme),
  leech: theme => renderSailEdge("leech", theme),
  heeling: theme => renderHeel(HEEL_SHOWN_DEG, theme),
  slot: renderSlot,
  luffing: theme => renderCourseChange("luff", theme),
  "bearing-away": theme => renderCourseChange("bear", theme),
  "port-vs-starboard": race("port-vs-starboard"), "windward-leeward": race("windward-leeward"), overtaking: race("overtaking"),
  "mark-room": race("mark-room"), crossing: race("crossing"), "start-line": race("start-line"), "collision-avoid": race("collision-avoid"),
  penalty: race("penalty"), upwind: race("upwind"), downwind: race("downwind"), "mark-rounding": race("mark-rounding"), layline: race("layline"),
  overlap: race("overlap"), vmg: race("vmg"), vmc: race("vmc"),
} satisfies Record<SailingSubjectId, Painter>;

/** The schematic of a subject (by its id or an alias) as SVG markup, 800x600; null for anything else. */
export function subjectSchematic(id: string, theme?: GraphicTheme): string | null {
  const subject = sailingSubject(id);
  return subject ? SCHEMATICS[subject](theme) : null;
}
