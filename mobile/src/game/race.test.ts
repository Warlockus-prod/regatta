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
  // The race bay (venue shore around the course, src/data/venues): the course
  // is projected into the water rect and rivals stop at its edges instead of
  // wrapping across the screen through the land.
  it.each(COURSES.map(c=>[c.id,c] as const))("AI completes %s inside the bay and never leaves the water", (_id,course) => {
    const canvas={width:390,height:560};
    const water={x0:39,y0:30,x1:351,y1:530};
    const marks=projectCourse(course,{width:water.x1-water.x0,height:water.y1-water.y0}).map(m=>({...m,x:m.x+water.x0,y:m.y+water.y0}));
    const fleet=buildFleet({bounds:canvas,water,marks,getWind:()=>({dirRad:0,speedKts:course.initialWindKn}),difficulty:"easy",running:true,startX:marks[0].x,startY:marks[0].y+12,resetKey:0});
    for(let t=0;t<360 && fleet.some(b=>!b.finished);t+=1/30) {
      for(const b of fleet) {
        stepBoat(b,marks,0,course.initialWindKn,canvas,t,water);
        expect(b.x).toBeGreaterThanOrEqual(water.x0);
        expect(b.x).toBeLessThanOrEqual(water.x1);
        expect(b.y).toBeGreaterThanOrEqual(water.y0);
        expect(b.y).toBeLessThanOrEqual(water.y1);
      }
    }
    expect(fleet.every(b=>b.finished)).toBe(true);
  });
  it("does not count touching a mark or the finish stripe",()=>{
    const marks=projectCourse(COURSES[0],{width:360,height:380});
    const p=nativeProgress(marks[0].x,marks[0].y+12,0);
    expect(advanceNativeProgress(p,marks[1].x,marks[1].y,0,marks,1)).toBe(1);
    expect(advanceNativeProgress(p,marks[2].x,marks[2].y,0,marks,2)).toBe(1);
  });
});
