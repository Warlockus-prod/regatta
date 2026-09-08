// Sample the actual runtime sail code for Blender, avoiding a second geometry model.
import { buildSync } from "esbuild";
import { createRequire } from "node:module";
import { Script } from "node:vm";
import { writeFileSync } from "node:fs";
const source = `
import { createSailGeometry, updateSailGeometry } from "./src/features/simulator-3d/sails/geometry";
import { SAIL_PLAN } from "./src/lib/sailing-physics/sail-plan";
const result = {plan: SAIL_PLAN, sails: {}};
for (const kind of ["main", "jib"]) {
 const geometry = createSailGeometry(28, 48);
 const base = {camber: .5, twist: .35, luff: 0, reef: 0, furl: 0, side: 1, time: 0};
 const states = {Basis: base, Flat: {...base, camber: 0}, Full: {...base, camber: 1},
  TwistOpen: {...base, twist: 1}, Luffing: {...base, luff: 1, time: 1.7},
  Reduced: {...base, reef: kind === "main" ? 1 : 0, furl: kind === "jib" ? .7 : 0}};
 const positions = {};
 for (const [name, shape] of Object.entries(states)) {
  updateSailGeometry(geometry, kind, shape);
  positions[name] = Array.from(geometry.getAttribute("position").array);
 }
 result.sails[kind] = {positions, indices: Array.from(geometry.index.array), uv: Array.from(geometry.getAttribute("uv").array)};
 geometry.dispose();
}
output(result);
`;
const bundled = buildSync({stdin:{contents:source,resolveDir:process.cwd(),loader:"ts"},bundle:true,platform:"node",format:"cjs",write:false,logLevel:"silent"});
new Script(bundled.outputFiles[0].text).runInNewContext({require:createRequire(import.meta.url),output: value => writeFileSync("assets/3d/sail-shapes.json", JSON.stringify(value))});
