import { updateLap, raceWaypoint, type RaceBoat, type RaceCourse } from "@regatta/physics";
export interface GateMark { x: number; y: number; captureRadius: number; finish?: boolean }
const SCALE = 1;
export function nativeCourse(marks: ReadonlyArray<GateMark>): RaceCourse {
  const start = marks[0]!, mark = marks[1]!, finish = marks[marks.length - 1]!;
  const line = (m: GateMark) => ({a:{x:(m.x-55)*SCALE,y:m.y*SCALE},b:{x:(m.x+55)*SCALE,y:m.y*SCALE}});
  return {startLine:line(start),finishLine:line(finish),marks:[{pos:{x:mark.x*SCALE,y:mark.y*SCALE},radius:8,label:"Windward",type:"windward"}]};
}
export function nativeProgress(x:number,y:number,heading:number): RaceBoat {
  return {id:"native",name:"native",color:"white",pos:{x:x*SCALE,y:y*SCALE},heading:heading*180/Math.PI,speed:0,lapDone:0};
}
export function advanceNativeProgress(state:RaceBoat,x:number,y:number,heading:number,marks:ReadonlyArray<GateMark>,seconds:number):number {
  const prev={...state.pos};
  state.pos={x:x*SCALE,y:y*SCALE}; state.heading=heading*180/Math.PI;
  updateLap(state,prev,nativeCourse(marks),seconds);
  return state.lapDone===2 ? 3 : state.lapDone===1 ? 2 : state.started ? 1 : 0;
}

export function nativeTarget(state:RaceBoat,marks:ReadonlyArray<GateMark>) {
  const p=raceWaypoint(state,nativeCourse(marks));
  return {x:p.x/SCALE,y:p.y/SCALE};
}
