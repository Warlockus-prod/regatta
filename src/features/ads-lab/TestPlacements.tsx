'use client';

import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { ADS_PLACEMENTS, type AdsPlacement } from "../../lib/ads-preview";

const layout: Record<AdsPlacement, { position: [number, number, number]; yaw: number }> = {
  "port-board": { position: [0, 4, -13], yaw: 0 },
  "bow-board": { position: [18, 4, 0], yaw: -Math.PI / 2 },
  "stern-board": { position: [-18, 4, 0], yaw: Math.PI / 2 },
};

function TestBoard({ placement }: { placement: AdsPlacement }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Local test texture unavailable");
    ctx.fillStyle = "#f4e8c9"; ctx.fillRect(0, 0, 1024, 512);
    ctx.strokeStyle = "#263f4f"; ctx.lineWidth = 12; ctx.strokeRect(18, 18, 988, 476);
    ctx.fillStyle = "#163344"; ctx.textAlign = "center";
    ctx.font = '700 116px "Source Sans 3", sans-serif'; ctx.fillText("TEST AD", 512, 250);
    ctx.font = '600 48px "Source Sans 3", sans-serif'; ctx.fillText(placement, 512, 350);
    const result = new CanvasTexture(canvas); result.colorSpace = SRGBColorSpace; return result;
  }, [placement]);
  useEffect(() => () => texture.dispose(), [texture]);
  const { position, yaw } = layout[placement];
  return <group position={position} rotation={[0, yaw, 0]}>
    <mesh><planeGeometry args={[8, 4]} /><meshBasicMaterial map={texture} /></mesh>
    <mesh position={[0, 0, -.03]} rotation={[0, Math.PI, 0]}><planeGeometry args={[8, 4]} /><meshStandardMaterial color="#455967" /></mesh>
    {[-3.4, 3.4].map(x => <mesh key={x} position={[x, -2.8, -.1]}><cylinderGeometry args={[.1, .1, 2.8, 8]} /><meshStandardMaterial color="#455967" /></mesh>)}
    <mesh position={[0, -3.7, 0]}><boxGeometry args={[9, .4, 1.8]} /><meshStandardMaterial color="#63757e" /></mesh>
  </group>;
}

/** Local, front-facing test cards only. No SDK texture or impression signal. */
export function TestPlacements({ visible }: { visible: Readonly<Record<AdsPlacement, boolean>> }) {
  return <>{ADS_PLACEMENTS.filter(id => visible[id]).map(id => <TestBoard key={id} placement={id} />)}</>;
}
