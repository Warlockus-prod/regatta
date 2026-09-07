import { buildFleet, stepBoat } from "./ai-boats";
import { COURSES, projectCourse } from "./course";
import { advanceNativeProgress, nativeProgress } from "./progression";
describe("native shared race rules", () => {
  it.each(COURSES.flatMap(c=>[{width:320,height:380},{width:390,height:464},{width:440,height:560}].map(bounds=>[`${c.id}-${bounds.width}`,c,bounds] as const)))("AI completes %s through legal gates", (_id,course,bounds) => {
    const marks=projectCourse(course,bounds);
    const fleet=buildFleet({bounds,marks,getWind:()=>({dirRad:0,speedKts:course.initialWindKn}),difficulty:"easy",running:true,startX:marks[0].x,startY:marks[0].y+12,resetKey:0});
    for(let t=0;t<360 && fleet.some(b=>!b.finished);t+=1/30) {
      for(const b of fleet) stepBoat(b,marks,0,course.initialWindKn,bounds,t);
    }
    if(fleet.some(b=>!b.finished)) throw new Error(JSON.stringify(fleet.map(b=>({x:b.x,y:b.y,heading:b.heading,speed:b.speedKn,gate:b.progression}))));
    expect(fleet.map(b=>({finished:b.finished,index:b.markIndex}))).toEqual(fleet.map(()=>({finished:true,index:3})));
  });
  it("does not count touching a mark or the finish stripe",()=>{
    const marks=projectCourse(COURSES[0],{width:360,height:380});
    const p=nativeProgress(marks[0].x,marks[0].y+12,0);
    expect(advanceNativeProgress(p,marks[1].x,marks[1].y,0,marks,1)).toBe(1);
    expect(advanceNativeProgress(p,marks[2].x,marks[2].y,0,marks,2)).toBe(1);
  });
});
