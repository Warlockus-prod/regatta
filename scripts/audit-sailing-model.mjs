// Read-only numerical probes. Run from the repository root.
// Results describe implementation behavior, not certification against sea trials.
import { buildSync } from "esbuild";
import { createRequire } from "node:module";
import { Script } from "node:vm";

const source = `
import { createSailGeometry, updateSailGeometry } from "./src/features/simulator-3d/sails/geometry";
import { getBoatParams, createInitialState, settle, tick } from "./src/lib/sailing-physics";
import { computeBalance } from "./src/lib/sailing-physics/balance";
import { createTargetSolver } from "./src/features/simulator-3d/physics/targets";
import { makeStandardCourse, updateLap, stepBoat } from "./src/lib/race-physics";
const params = getBoatParams();
const controls = { mainSheet: .4, jibSheet: .2, mainTwist: .35, jibTwist: .4, reef: 0, jibFurl: 0, jibSide: 1 as const };
function area(kind: "main" | "jib", reef = 0) {
  const g = createSailGeometry(60, 100);
  updateSailGeometry(g, kind, {camber: .5, twist: 0, luff: 0, reef, side: 1, time: 0});
  const p = g.getAttribute("position"), idx = g.getIndex()!;
  let projected = 0;
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i), b = idx.getX(i+1), c = idx.getX(i+2);
    projected += Math.abs((p.getX(b)-p.getX(a))*(p.getY(c)-p.getY(a))-(p.getY(b)-p.getY(a))*(p.getX(c)-p.getX(a)))/2;
  }
  g.dispose(); return projected;
}
const state = createInitialState({tws:12,twa:90,boatSpeed:0});
const boat = {id:"audit",name:"audit",color:"cyan",pos:{x:400,y:180},heading:0,speed:0,lapDone:0};
const rounded = updateLap(boat,{x:400,y:190},makeStandardCourse(),1);
const helm = {...boat,pos:{x:400,y:600},heading:0,speed:0};
stepBoat(helm,1/60,0,1,{turn:1});
const p = area("main"), j = area("jib");
const furl = tick(state,{...controls,jibFurl:1},getBoatParams({mainArea:0}),.1);
const balance = computeBalance({fSideMainN:1000,fSideJibN:-1000,mainCop:5,jibCop:5,boatSpeedKn:5,params});
const solver = createTargetSolver();
const target = solver(90,12,0);
const beam = [9,60,180].map(seconds=>({seconds,speed: settle(state,controls,params,seconds).state.boatSpeed}));
const symmetric = [-90,90].map(twa => settle(createInitialState({tws:12,twa,boatSpeed:0}),controls,params,180).state);
console.log(JSON.stringify({
  sailPlan:{mainProjected:p,jibProjected:j,visualRatio:p/j,physicsRatio:params.mainArea/params.jibArea,mainReefVisualFraction:area("main",1)/p,mainReefPhysicsFraction:.35},
  fullyFurledJibOnly:{driveN:furl.diag.drive,speedAfterTick:furl.state.boatSpeed},
  equalOppositeSideForces:balance,
  markTouchWithoutRounding:{event:rounded,lapDone:boat.lapDone},
  stationaryRaceSteeringDegPerSecond:helm.heading*60,
  target90:target,beamFixedSheets:beam,
  beamWarmStart: settle(createInitialState({tws:12,twa:90,boatSpeed:5}),controls,params,180).state.boatSpeed,
  symmetric
},null,2));
`;
const bundled = buildSync({stdin:{contents:source,resolveDir:process.cwd(),loader:"ts"},bundle:true,platform:"node",format:"cjs",write:false,logLevel:"silent"});
new Script(bundled.outputFiles[0].text,{filename:"sailing-audit.cjs"}).runInNewContext({console,require:createRequire(import.meta.url),process,Buffer,setTimeout,clearTimeout});
