import * as THREE from "three";
import { mainsheetPath, travelerPoint } from "../rig/layout";
import { RIG_PASSPORT as P, toGlb } from "../rig/passport";
import type { YachtState } from "../../simulator-3d/types";
import { vangGeometry } from "../rig/vang";

/** Owned procedural teaching fittings. No edits to cached GLB geometry.
 * Equipment operation/ratchets are not implemented by these visual blocks.
 */
export function createTrimRig(model: THREE.Object3D) {
  const main = model.getObjectByName("MainRig"), boom = model.getObjectByName("Boom");
  const originalParent = boom?.parent;
  const pitch = new THREE.Group(); pitch.name = "Teaching_BoomPitch";
  if (main && boom && originalParent === main) { main.add(pitch); pitch.add(boom); }
  const fittings = new THREE.Group(); fittings.name = "Teaching_MainTackle";
  const metal = new THREE.MeshStandardMaterial({ color: "#6e8996", metalness: .7, roughness: .4 });
  const accent = new THREE.MeshStandardMaterial({ color: "#25bace", metalness: .35, roughness: .45 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(.08, .07, 1.6), metal);
  rail.position.set(...toGlb(travelerPoint(0)));
  const car = new THREE.Mesh(new THREE.BoxGeometry(.23, .10, .18), accent);
  const block = new THREE.Mesh(new THREE.BoxGeometry(.27, .11, .08), metal);
  const ropeGeometry = new THREE.BufferGeometry();
  // Two segments per span allow visible sag instead of taut-looking slack.
  ropeGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6 * 4 * 3), 3));
  const ropes = new THREE.LineSegments(ropeGeometry, new THREE.LineBasicMaterial({ color: "#dddbc4" }));
  ropes.frustumCulled = false;
  const vangPositions = new THREE.BufferAttribute(new Float32Array(P.vangLayout.parts * 4 * 3), 3);
  const vang = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", vangPositions), new THREE.LineBasicMaterial({ color: "#e8b96b" }));
  vang.name = "Teaching_SoftVang"; vang.frustumCulled = false;
  fittings.add(rail, car, block, ropes, vang); fittings.visible = false; model.add(fittings);
  return {
    update(trim: YachtState["mainTrim"]) {
      fittings.visible = Boolean(trim);
      pitch.rotation.z = -(trim?.pose.rise ?? 0) * Math.PI / 180;
      if (!trim) return;
      const path = mainsheetPath(trim.pose, trim.traveler);
      car.position.set(...toGlb(travelerPoint(trim.traveler)));
      block.position.set(...toGlb(path[1]));
      const positions = ropeGeometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < P.mainsheet.parts; i++) {
        const a = path[i * 2], b = path[i * 2 + 1];
        const mid = { starboard: (a.starboard + b.starboard) / 2,
          forward: (a.forward + b.forward) / 2,
          up: (a.up + b.up) / 2 - Math.min(.4, trim.slack / P.mainsheet.parts * .3) };
        [a, mid, mid, b].forEach((p, j) => positions.setXYZ(i * 4 + j, ...toGlb(p)));
      }
      positions.needsUpdate = true;
      const { upper, lower } = vangGeometry(trim.pose);
      for (let i = 0; i < P.vangLayout.parts; i++) {
        const offset = (i - 1.5) * .02;
        const a = { ...lower, starboard: lower.starboard + offset };
        const b = { ...upper, starboard: upper.starboard + offset };
        const mid = { starboard: (a.starboard + b.starboard) / 2, forward: (a.forward + b.forward) / 2,
          up: (a.up + b.up) / 2 - Math.min(.25, (trim.vangSlack ?? .15) * .7) };
        [a, mid, mid, b].forEach((p, j) => vangPositions.setXYZ(i * 4 + j, ...toGlb(p)));
      }
      vangPositions.needsUpdate = true;
    },
    dispose() {
      if (boom && originalParent && boom.parent === pitch) originalParent.add(boom);
      pitch.removeFromParent(); fittings.removeFromParent();
      for (const mesh of [rail, car, block]) mesh.geometry.dispose();
      metal.dispose(); accent.dispose(); ropeGeometry.dispose(); (ropes.material as THREE.Material).dispose();
      vang.geometry.dispose(); (vang.material as THREE.Material).dispose();
    },
  };
}
