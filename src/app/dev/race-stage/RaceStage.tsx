"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef } from "react";
import { findVenue } from "@/data/venues/venues";
import { toWorld, type Race3DBoat, type Race3DCourse } from "@/features/race-3d/pose";
import type { StageView } from "@/features/race-scene/orbit-camera";

const RaceScene = dynamic(() => import("@/features/race-scene/RaceScene").then(m => m.RaceScene), { ssr: false });

const COLORS = ["#f5f3ee", "#e2574c", "#3d8bd9", "#f0b23a"];
const LABELS = { metres: "m", loading: "Loading the yacht", scene: "Race stage", error: "Could not open 3D", retry: "Retry" };
// Out of sight (the fog ends at 1700 m): a stage that names no mark or line shows open water.
const AWAY = 4000;
const numbers = (text: string | undefined) => (text ?? "").split(",").filter(part => part.trim() !== "").map(Number).filter(Number.isFinite);

/**
 * The stage (development only, see page.tsx). The link places everything in race units
 * (0.6 m each, x east, y south; a hull is about 22 units long):
 *   boats=x,y,heading,speed~x,y,heading,speed   the first boat is the player, the camera's subject
 *   wind=<degrees the wind comes from>           0 is from the north (the top of the race map)
 *   mark=x,y                                     a windward mark
 *   line=x1,y1,x2,y2                             the start line: pin first, committee boat second
 *   view=from,pitch,range                        the camera: the bearing it stands off the group (180:
 *                                                south, looking north), degrees down, metres away
 *   look=x,y                                     what it looks at (default: the middle of the boats)
 *   venue=<id>   arrows=1 (wind arrows at the player's boat)
 * Nothing moves: the boats stand where the link put them, drawn with the speed it names.
 */
export default function RaceStage({ boats, wind, mark, line, view, look, venue, arrows }: {
  boats?: string; wind?: string; mark?: string; line?: string; view?: string; look?: string; venue?: string; arrows: boolean;
}) {
  const fleet = useMemo<Race3DBoat[]>(() => (boats ?? "400,600,45,6").split("~").map((text, index) => {
    const [x = 400, y = 600, heading = 0, speed = 6] = numbers(text);
    return { id: index === 0 ? "player" : `boat-${index}`, name: "", color: COLORS[index % COLORS.length], pos: { x, y }, heading, speed, lapDone: 0, started: true, isPlayer: index === 0 };
  }), [boats]);
  const course = useMemo<Race3DCourse>(() => {
    const [mx = AWAY, my = -AWAY] = numbers(mark);
    const [ax = AWAY, ay = AWAY, bx = AWAY + 160, by = AWAY] = numbers(line);
    const startLine = { a: { x: ax, y: ay }, b: { x: bx, y: by } };
    return { marks: [{ pos: { x: mx, y: my }, type: "windward" }, { pos: startLine.a, type: "start" }, { pos: startLine.b, type: "start" }], startLine, finishLine: startLine };
  }, [mark, line]);
  const boatsRef = useRef(fleet);
  const courseRef = useRef(course);
  const windDirRef = useRef(numbers(wind)[0] ?? 0);
  const stage = useMemo<StageView>(() => {
    const [from = 180, pitch = 35, range = 70] = numbers(view);
    const middle = { x: fleet.reduce((sum, boat) => sum + boat.pos.x, 0) / fleet.length, y: fleet.reduce((sum, boat) => sum + boat.pos.y, 0) / fleet.length };
    const [x = middle.x, y = middle.y] = numbers(look);
    return { centre: toWorld({ x, y }), from, pitch, range };
  }, [view, look, fleet]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#9ec1d3" }} data-testid="race-stage">
      <RaceScene boatsRef={boatsRef} courseRef={courseRef} windDirRef={windDirRef} venue={findVenue(venue)} camera="orbit" stage={stage} labels={LABELS} showWind={arrows} racing={false} started />
    </div>
  );
}
